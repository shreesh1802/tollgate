// PayPal accepts a payout first and settles it a few seconds later (or fails, or leaves it
// unclaimed). So a stage is "released" when the money was captured and the payout accepted, and
// "paid" only when PayPal reports the payout item as SUCCESS. This module tracks that final step.
import { auditFor } from './project.js';

const PAID = new Set(['SUCCESS']);
const PENDING = new Set(['PENDING', 'PROCESSING', 'ONHOLD']);

/** paid | pending | problem, from a PayPal payout status string. */
export const stateOf = (status) => (PAID.has(status) ? 'paid' : !status || PENDING.has(status) ? 'pending' : 'problem');

/** A payout recorded before this tracking existed was already confirmed, so treat it as paid. */
export const payoutState = (payout) => payout?.state ?? 'paid';

/**
 * Ask PayPal about every payout that is still pending and record any change, in the audit log too.
 * Provider hiccups are ignored (the payout simply stays pending and is checked again).
 * Returns true if the project was modified and should be saved.
 */
export async function refreshPayouts({ project, paypal, clock = () => Date.now(), minIntervalMs = 4000, force = false }) {
  if (typeof paypal.getPayout !== 'function') return false;
  const audit = auditFor(project, clock);
  let changed = false;
  for (const stage of project.stages) {
    const p = stage.release?.payout;
    if (!p || payoutState(p) !== 'pending') continue;
    if (!force && p.checkedAt && clock() - p.checkedAt < minIntervalMs) continue;
    let r;
    try {
      r = await paypal.getPayout(p.batch_id);
    } catch {
      p.checkedAt = clock();
      changed = true;
      continue;
    }
    const item = r.items?.[0]?.status ?? r.status;
    const next = stateOf(item);
    p.checkedAt = clock();
    p.status = item;
    changed = true;
    if (next !== p.state) {
      p.state = next;
      audit.append({ event: 'payout-update', stage: stage.id, batch: p.batch_id, status: item, state: next });
    }
  }
  return changed;
}

// Releasing a stage: capture a slice from every donor's reservation, then pay the worker.
// Every money call goes through Tollgate, so even a bug in this file cannot take more
// than a donor reserved or pay out more than was captured.
import { Tollgate } from '../tollgate.js';
import { Ledger } from '../ledger.js';
import { auditFor, confirmedDonations } from './project.js';
import { splitCents, toCents, fromCents } from './money.js';

/** Retry once on a dropped connection. Same args means same request id, so PayPal dedupes. */
async function callWithRetry(gate, tool, args) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await gate.call(tool, args);
    } catch (err) {
      if (err.transient && attempt === 0) continue;
      throw err;
    }
  }
}

export async function releaseStage({ project, stage, paypal, clock = () => Date.now() }) {
  const isLast = stage.index === project.stages.length - 1;
  const cumPct = project.stages.slice(0, stage.index + 1).reduce((a, s) => a + s.pct, 0);

  // Only donations the donor has approved and we have authorised can be captured from.
  const donations = confirmedDonations(project);
  if (donations.length === 0) return { ok: false, step: 'capture', decision: 'BLOCK', reason: 'no confirmed donations to release', captures: [] };
  const authCents = donations.map((d) => toCents(d.amount));

  // Cumulative target per donor, so rounding never drifts across stages and late donors catch up.
  const total = authCents.reduce((a, b) => a + b, 0);
  const targets = splitCents(Math.round((total * cumPct) / 100), authCents);
  const slices = donations.map((d, i) => Math.max(0, targets[i] - d.capturedCents));
  const stageCents = slices.reduce((a, b) => a + b, 0);

  // Tollgate sees only trusted records: our own donations and the organiser's payee.
  const ledger = new Ledger();
  for (const d of donations) ledger.trustAuthorization(d.authorizationId, d.amount, project.currency, d.capturedCents / 100);
  ledger.trustPayee(project.worker.email);
  ledger.paidCents = project.paidCents;
  ledger.tainted = true; // the evidence came from an untrusted uploader: nothing moves without this decision's intent

  const intent = [
    ...donations.map((d, i) => ({
      tool: 'capture_authorization',
      match: { authorization_id: d.authorizationId, stage_id: stage.id },
      maxAmount: slices[i] / 100,
    })),
    { tool: 'payout_worker', match: { payee: project.worker.email, stage_id: stage.id }, maxAmount: stageCents / 100 },
  ];
  const gate = new Tollgate({ backend: paypal, intent, ledger, audit: auditFor(project, clock) });

  const captures = [];
  for (let i = 0; i < donations.length; i++) {
    if (slices[i] === 0) continue;
    const d = donations[i];
    const r = await callWithRetry(gate, 'capture_authorization', {
      authorization_id: d.authorizationId,
      amount: fromCents(slices[i]),
      currency: project.currency,
      final_capture: isLast,
      stage_id: stage.id,
    });
    if (r.decision !== 'ALLOW') return { ok: false, step: 'capture', decision: r.decision, reason: r.reason, captures };
    d.capturedCents += slices[i];
    captures.push({ donation: d.id, amount: fromCents(slices[i]), capture_id: r.result.capture_id });
  }

  const unpaid = donations.reduce((a, d) => a + d.capturedCents, 0) - project.paidCents;
  const payout = await callWithRetry(gate, 'payout_worker', {
    payee: project.worker.email,
    amount: fromCents(unpaid),
    currency: project.currency,
    stage_id: stage.id,
  });
  if (payout.decision !== 'ALLOW') return { ok: false, step: 'payout', decision: payout.decision, reason: payout.reason, captures };
  project.paidCents += unpaid;

  stage.status = 'RELEASED';
  stage.release = { captures, payout: { amount: fromCents(unpaid), batch_id: payout.result.batch_id } };
  const upcoming = project.stages[stage.index + 1];
  if (upcoming) upcoming.status = 'ACTIVE';
  return { ok: true, captures, payout: stage.release.payout };
}

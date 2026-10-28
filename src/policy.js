import { norm } from './util.js';

export const READ_TOOLS = new Set(['get_order', 'list_disputes', 'get_dispute']);
export const MONEY_TOOLS = new Set([
  'create_refund',
  'accept_dispute_claim',
  'create_invoice',
  'send_invoice',
  'pay_order',
]);
/** Cannot be undone, so they always need explicit merchant intent or a human. */
const IRREVERSIBLE = new Set(['accept_dispute_claim']);

/** Standing limits the merchant sets once. Intent (per task) can never exceed these. */
export const DEFAULT_MANDATE = {
  refund: { autoMax: 25, sessionMax: 100 },
  disputes: { acceptViaIntent: true },
  invoice: { max: 500 },
  pay: { payeeAllowlist: [], max: 0 },
};

const allow = (rule, reason) => ({ decision: 'ALLOW', rule, reason });
const hold = (rule, reason, trace = null) => ({ decision: 'HOLD', rule, reason, trace });
const block = (rule, reason) => ({ decision: 'BLOCK', rule, reason });

/** Why is this value not grounded? Distinguish "came from attacker text" from "invented". */
function ungrounded(ledger, field, value) {
  const trace = ledger.traceUntrusted(value);
  return trace
    ? hold('tainted-argument', `${field}=${value} appears only in untrusted text`, trace)
    : hold('ungrounded-argument', `${field}=${value} was never seen in any trusted record`);
}

const isAmount = (a) => /^\d+(\.\d{1,2})?$/.test(String(a)) && Number(a) > 0;

/**
 * Per-tool argument checks. Each returns a verdict if it fails, otherwise null.
 * `inherit` marks calls that are already covered by an earlier approved call.
 */
const CHECKS = {
  create_refund(args, { ledger, mandate }) {
    const cap = ledger.captures.get(args.capture_id);
    if (!cap) return ungrounded(ledger, 'capture_id', args.capture_id);
    if (!isAmount(args.amount)) return block('bad-amount', `invalid amount ${args.amount}`);
    if (args.currency !== cap.currency) return block('currency-mismatch', `${args.currency} != ${cap.currency}`);
    const already = ledger.refunded.get(args.capture_id) ?? 0;
    if (already + Number(args.amount) > cap.amount) {
      return block('exceeds-capture', `refund ${args.amount} + ${already} already refunded > captured ${cap.amount}`);
    }
    if (Number(args.amount) > mandate.refund.autoMax) {
      return hold('mandate-refund-max', `refund ${args.amount} exceeds auto limit ${mandate.refund.autoMax}`);
    }
    if (ledger.refundedTotal + Number(args.amount) > mandate.refund.sessionMax) {
      return hold('mandate-session-max', `session refunds would exceed ${mandate.refund.sessionMax}`);
    }
    return null;
  },

  accept_dispute_claim(args, { ledger, mandate }) {
    if (!ledger.isGrounded(args.dispute_id)) return ungrounded(ledger, 'dispute_id', args.dispute_id);
    if (!mandate.disputes.acceptViaIntent) return hold('mandate-no-accept', 'mandate forbids automatic claim acceptance');
    return null;
  },

  create_invoice(args, { ledger, mandate }) {
    if (!ledger.isGrounded(args.recipient_email)) return ungrounded(ledger, 'recipient_email', args.recipient_email);
    if (!isAmount(args.amount)) return block('bad-amount', `invalid amount ${args.amount}`);
    if (Number(args.amount) > mandate.invoice.max) {
      return hold('mandate-invoice-max', `invoice ${args.amount} exceeds ${mandate.invoice.max}`);
    }
    return null;
  },

  send_invoice(args, { ledger }) {
    // Only invoices that passed the gate at creation can be sent; they inherit that approval.
    if (!ledger.invoices.has(args.invoice_id)) return hold('unknown-invoice', `invoice ${args.invoice_id} was not created through the gate`);
    return { inherit: true };
  },

  pay_order(args, { mandate }) {
    if (!mandate.pay.payeeAllowlist.map(norm).includes(norm(args.payee))) {
      return hold('payee-not-allowlisted', `payee ${args.payee} is not on the mandate allowlist`);
    }
    if (!isAmount(args.amount) || Number(args.amount) > mandate.pay.max) {
      return block('exceeds-pay-max', `payment ${args.amount} exceeds mandate max ${mandate.pay.max}`);
    }
    return null;
  },
};

/** Does the merchant's own (trusted) instruction cover exactly this call? */
export function intentCovers(intent, tool, args) {
  return intent.some((i) => {
    if (i.tool !== tool) return false;
    for (const [k, v] of Object.entries(i.match ?? {})) {
      if (norm(args[k]) !== norm(v)) return false;
    }
    return i.maxAmount === undefined || (isAmount(args.amount) && Number(args.amount) <= i.maxAmount);
  });
}

/**
 * The whole policy. Order matters: cheap deterministic checks first, human last.
 *   1. unknown tool            -> BLOCK (default deny)
 *   2. hard limits             -> BLOCK
 *   3. grounding / mandate     -> HOLD
 *   4. irreversible w/o intent -> HOLD
 *   5. tainted session w/o intent -> HOLD   (the core claim)
 *   6. otherwise               -> ALLOW
 */
export function decide(tool, args, ctx) {
  if (READ_TOOLS.has(tool)) return allow('read-only', 'read tools never move money');
  if (!MONEY_TOOLS.has(tool)) return block('default-deny', `unknown tool ${tool}`);

  const failed = CHECKS[tool](args, ctx);
  if (failed && !failed.inherit) return failed;
  if (failed?.inherit) return allow('inherited-approval', 'invoice was created through the gate');

  const covered = intentCovers(ctx.intent, tool, args);
  if (IRREVERSIBLE.has(tool) && !covered) {
    return hold('irreversible-needs-intent', `${tool} is irreversible and no merchant intent covers it`);
  }
  if (ctx.ledger.tainted && !covered) {
    return hold('tainted-session', 'agent has read untrusted text and no merchant intent covers this call');
  }
  return allow(covered ? 'intent-covered' : 'clean-session', covered ? 'merchant intent covers this call' : 'no untrusted text seen; within mandate');
}

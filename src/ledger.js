import { flatten, norm } from './util.js';

/**
 * Which result fields come from a trusted source (PayPal system records or our own
 * gated calls). EVERYTHING ELSE is untrusted: new or unknown fields default to
 * untrusted, so a schema change can only make Tollgate stricter, never looser.
 */
const TRUSTED_PATHS = {
  get_order: [/^order_id$/, /^status$/, /^buyer\.email$/, /^capture\.(id|amount|currency)$/],
  get_dispute: [/^dispute_id$/, /^order_id$/, /^reason$/, /^status$/, /^messages\.\d+\.from$/],
  list_disputes: [/^disputes\.\d+\.(dispute_id|order_id|reason|status)$/],
  create_invoice: [/^invoice_id$/, /^recipient_email$/, /^status$/],
  create_refund: [/^refund_id$/, /^status$/, /^capture_id$/, /^amount$/, /^currency$/],
};

/** What Tollgate has observed this session, split by provenance. */
export class Ledger {
  constructor() {
    this.trusted = new Map(); // normalised value -> path it came from
    this.untrusted = []; // { tool, path, text }
    this.captures = new Map(); // capture id -> { amount, currency }
    this.invoices = new Map(); // invoice id -> { recipient, amount }
    this.refunded = new Map(); // capture id -> total refunded this session
    this.refundedTotal = 0;
    this.tainted = false; // true once the agent has been shown any untrusted text
  }

  ingest(tool, result) {
    const allow = TRUSTED_PATHS[tool] ?? [];
    for (const [path, value] of flatten(result)) {
      if (allow.some((re) => re.test(path))) {
        this.trusted.set(norm(value), `${tool}:${path}`);
      } else if (typeof value === 'string' && value.trim() !== '') {
        this.untrusted.push({ tool, path: `${tool}:${path}`, text: value });
        this.tainted = true;
      }
    }
    if (tool === 'get_order' && result?.capture) {
      this.captures.set(result.capture.id, {
        amount: Number(result.capture.amount),
        currency: result.capture.currency,
      });
    }
  }

  isGrounded(value) {
    return this.trusted.has(norm(value));
  }

  /** If a value only shows up in untrusted text, say where (this is the taint trace). */
  traceUntrusted(value) {
    const v = norm(value);
    const bare = /^\d+\.00$/.test(v) ? String(Number(v)) : v;
    const hit = this.untrusted.find((u) => {
      const t = u.text.toLowerCase();
      return t.includes(v) || t.includes(bare);
    });
    return hit ? hit.path : null;
  }
}

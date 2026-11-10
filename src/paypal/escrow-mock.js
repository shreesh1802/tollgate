import { TransientError } from './mock.js';
import { toCents, fromCents } from '../proofpay/money.js';

/**
 * In-memory stand-in for the PayPal sandbox escrow flow (authorize, partial capture, payout).
 * It behaves like PayPal where we rely on it: you cannot capture more than was authorised,
 * you cannot pay out money you have not captured, and a repeated request id returns the
 * first result. `effects` is the ground truth the tests and harness check.
 */
export class MockEscrowPayPal {
  constructor({ crashAfter = null } = {}) {
    this.auths = new Map(); // authorization id -> { cents, captured, currency }
    this.effects = [];
    this.idem = new Map();
    this.capturedCents = 0;
    this.paidCents = 0;
    this.crashAfter = crashAfter; // drop the connection after this tool's side effect, once
    this.crashed = false;
    this.n = { capture: 0, payout: 0 };
  }

  /** Rebuild reservations from saved projects after a restart (real PayPal remembers these itself). */
  restoreFrom(projects) {
    for (const p of projects) {
      for (const d of p.donations.filter((x) => x.authorizationId)) {
        this.auths.set(d.authorizationId, { cents: toCents(d.amount), captured: d.capturedCents, currency: p.currency });
        this.capturedCents += d.capturedCents;
      }
      this.paidCents += p.paidCents;
    }
  }

  /** Stands in for "donor approved and we authorised the order". */
  reserve(id, amount, currency = 'USD') {
    this.auths.set(id, { cents: toCents(amount), captured: 0, currency });
  }

  // Same donation interface as SandboxEscrowPayPal. The mock has no browser step, so the
  // order has no approve link and is authorised immediately.
  async createDonationOrder({ amount, currency = 'USD' }) {
    this.orders ??= new Map();
    const orderId = `MOCK-ORD-${this.orders.size + 1}`;
    this.orders.set(orderId, { amount, currency });
    return { orderId, status: 'APPROVED', approveUrl: null };
  }

  async authorizeOrder(orderId) {
    const o = this.orders?.get(orderId);
    if (!o) throw new Error('NOT_APPROVED: unknown order');
    const authorizationId = `MOCK-AUTH-${this.auths.size + 1}`;
    this.reserve(authorizationId, o.amount, o.currency);
    return { authorizationId, status: 'CREATED', amount: Number(o.amount).toFixed(2), currency: o.currency, expiresAt: new Date(Date.now() + 29 * 86400000).toISOString() };
  }

  async call(tool, args = {}, { requestId = null } = {}) {
    if (requestId && this.idem.has(requestId)) return structuredClone(this.idem.get(requestId));
    const result = this.#exec(tool, args);
    if (requestId) this.idem.set(requestId, structuredClone(result));
    if (this.crashAfter === tool && !this.crashed) {
      this.crashed = true;
      throw new TransientError('ECONNRESET after side effect');
    }
    return structuredClone(result);
  }

  #exec(tool, args) {
    if (tool === 'capture_authorization') {
      const a = this.auths.get(args.authorization_id);
      if (!a) throw new Error('RESOURCE_NOT_FOUND');
      const c = toCents(args.amount);
      if (a.captured + c > a.cents) throw new Error('CAPTURE_EXCEEDS_AUTHORIZATION');
      a.captured += c;
      this.capturedCents += c;
      this.effects.push({ type: 'capture', authorization_id: args.authorization_id, amount: fromCents(c), stage_id: args.stage_id });
      return { capture_id: `CAP-${++this.n.capture}`, authorization_id: args.authorization_id, status: 'COMPLETED', amount: fromCents(c), currency: a.currency };
    }
    if (tool === 'payout_worker') {
      const c = toCents(args.amount);
      if (this.paidCents + c > this.capturedCents) throw new Error('INSUFFICIENT_FUNDS');
      this.paidCents += c;
      this.effects.push({ type: 'payout', payee: args.payee, amount: fromCents(c), stage_id: args.stage_id });
      return { batch_id: `PO-${++this.n.payout}`, status: 'SUCCESS', payee: args.payee, amount: fromCents(c), currency: args.currency };
    }
    throw new Error(`UNKNOWN_TOOL ${tool}`);
  }
}

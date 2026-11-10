// Real PayPal SANDBOX backend for the escrow flow. Same `call(tool, args, { requestId })`
// interface as MockEscrowPayPal, so Tollgate and the pipeline cannot tell them apart.
// The base URL is fixed to the sandbox; nothing can point this at live PayPal.
import { randomUUID } from 'node:crypto';
import { TransientError } from './mock.js';

const BASE = 'https://api-m.sandbox.paypal.com';

export class SandboxEscrowPayPal {
  constructor({ clientId = process.env.PAYPAL_CLIENT_ID, clientSecret = process.env.PAYPAL_CLIENT_SECRET, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
    if (!clientId || !clientSecret) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.fetch = fetchImpl;
    this.now = now;
    this.cached = null; // { token, expiresAt }
  }

  async #token() {
    if (this.cached && this.cached.expiresAt > this.now() + 60_000) return this.cached.token;
    let res;
    try {
      res = await this.fetch(`${BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });
    } catch (err) {
      throw new TransientError(`PayPal auth unreachable: ${err.message}`);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`PayPal auth failed (${res.status}): ${data.error_description ?? data.error ?? 'unknown'}`);
    this.cached = { token: data.access_token, expiresAt: this.now() + (data.expires_in ?? 300) * 1000 };
    return this.cached.token;
  }

  /** One request. Network errors, 429 and 5xx are TransientError (safe to retry with the same request id). */
  async #req(method, path, body, requestId) {
    let res;
    try {
      res = await this.fetch(`${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${await this.#token()}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      if (err instanceof TransientError) throw err;
      throw new TransientError(`PayPal unreachable: ${err.message}`);
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (res.ok) return data;
    const debug = res.headers?.get?.('paypal-debug-id') ?? null;
    const msg = `${data.name ?? 'PAYPAL_ERROR'} (HTTP ${res.status}) ${data.message ?? ''} debug=${debug}`.trim();
    const err = res.status === 429 || res.status >= 500 ? new TransientError(msg) : new Error(msg);
    err.status = res.status;
    err.paypal = data;
    throw err;
  }

  /** The tools Tollgate guards. */
  async call(tool, args = {}, { requestId = null } = {}) {
    if (tool === 'capture_authorization') {
      const data = await this.#req('POST', `/v2/payments/authorizations/${encodeURIComponent(args.authorization_id)}/capture`, {
        amount: { currency_code: args.currency, value: args.amount },
        final_capture: Boolean(args.final_capture),
      }, requestId);
      return { capture_id: data.id, authorization_id: args.authorization_id, status: data.status, amount: args.amount, currency: args.currency };
    }
    if (tool === 'payout_worker') {
      const batchId = `pp-${requestId ?? randomUUID()}`; // PayPal never processes a sender_batch_id twice within 30 days
      const data = await this.#req('POST', '/v1/payments/payouts', {
        sender_batch_header: { sender_batch_id: batchId, email_subject: 'ProofPay stage payment' },
        items: [{ recipient_type: 'EMAIL', receiver: args.payee, amount: { value: args.amount, currency: args.currency }, note: `ProofPay ${args.stage_id}`, sender_item_id: `${batchId}-1` }],
      }, requestId);
      return { batch_id: data.batch_header?.payout_batch_id, status: data.batch_header?.batch_status, payee: args.payee, amount: args.amount, currency: args.currency };
    }
    throw new Error(`UNKNOWN_TOOL ${tool}`);
  }

  // ---- Donation flow. These reserve money but never move it, so they are not Tollgate tools. ----

  /** Step 1: an AUTHORIZE order. The donor must approve `approveUrl` in a browser. */
  async createDonationOrder({ amount, currency = 'USD', description = 'ProofPay donation', returnUrl = 'https://example.com/return', cancelUrl = 'https://example.com/cancel' }) {
    const order = await this.#req('POST', '/v2/checkout/orders', {
      intent: 'AUTHORIZE',
      purchase_units: [{ amount: { currency_code: currency, value: Number(amount).toFixed(2) }, description }],
      payment_source: { paypal: { experience_context: { return_url: returnUrl, cancel_url: cancelUrl, user_action: 'PAY_NOW' } } },
    }, randomUUID());
    const approveUrl = order.links?.find((l) => ['payer-action', 'approve'].includes(l.rel))?.href ?? null;
    return { orderId: order.id, status: order.status, approveUrl };
  }

  /** Step 2: after the donor approved, reserve the money. Returns the authorization to store. */
  async authorizeOrder(orderId) {
    const res = await this.#req('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`, null, randomUUID());
    const auth = res.purchase_units?.[0]?.payments?.authorizations?.[0];
    if (!auth) throw new Error('NOT_APPROVED: no authorization returned (has the donor approved the order?)');
    return { authorizationId: auth.id, status: auth.status, amount: auth.amount.value, currency: auth.amount.currency_code, expiresAt: auth.expiration_time ?? null };
  }

  /** Payouts settle asynchronously (PENDING, then SUCCESS or another final state). */
  async getPayout(batchId) {
    const b = await this.#req('GET', `/v1/payments/payouts/${encodeURIComponent(batchId)}`, null, null);
    return { batchId: b.batch_header?.payout_batch_id, status: b.batch_header?.batch_status, items: (b.items ?? []).map((i) => ({ status: i.transaction_status, amount: i.payout_item?.amount?.value, receiver: i.payout_item?.receiver })) };
  }

  async getAuthorization(authorizationId) {
    const a = await this.#req('GET', `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}`, null, null);
    return { authorizationId: a.id, status: a.status, amount: a.amount?.value, currency: a.amount?.currency_code, expiresAt: a.expiration_time ?? null };
  }
}

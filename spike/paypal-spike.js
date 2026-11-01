// PayPal SANDBOX spike: can we reserve a donor's money, capture it in two parts, and pay a worker?
//
//   node --env-file=.env spike/paypal-spike.js create [amount]        1. create an AUTHORIZE order, prints a donor approval link
//   (open the link, log in with a sandbox PERSONAL account, approve)
//   node --env-file=.env spike/paypal-spike.js authorize              2. reserve the money (no money moves yet)
//   node --env-file=.env spike/paypal-spike.js capture 4.00           3. take part of it (final_capture=false)
//   node --env-file=.env spike/paypal-spike.js capture 6.00 final     4. take the rest (final_capture=true)
//   node --env-file=.env spike/paypal-spike.js payout worker@example.com 3.00   5. pay the worker
//   node --env-file=.env spike/paypal-spike.js status                 look at the authorization at any time
//
// Sandbox only: the base URL is hard-coded, no env var can point this at live PayPal.
// Secrets and tokens are never printed or logged. Every call is summarised in spike/spike-log.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const BASE = 'https://api-m.sandbox.paypal.com';
const CURRENCY = 'USD';
const here = (f) => fileURLToPath(new URL(f, import.meta.url));
const STATE = here('./.state.json');
const LOG = here('./spike-log.json');

/** A handled failure: message already printed. Thrown instead of process.exit() after network calls,
 *  because exiting while fetch handles are closing crashes Node on Windows (libuv assertion). */
class Fatal extends Error {}

const { PAYPAL_CLIENT_ID: ID, PAYPAL_CLIENT_SECRET: SECRET } = process.env;
if (!ID || !SECRET) {
  console.error('Missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET. See spike/README.md (copy .env.example to .env).');
  process.exit(2);
}

const loadState = () => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {});
const saveState = (patch) => writeFileSync(STATE, JSON.stringify({ ...loadState(), ...patch }, null, 2));
const need = (key, hint) => {
  const v = loadState()[key];
  if (!v) { console.error(`No ${key} saved yet. ${hint}`); process.exit(2); }
  return v;
};
const money = (v) => {
  if (!/^\d+(\.\d{1,2})?$/.test(String(v)) || Number(v) <= 0) { console.error(`Bad amount: ${v}`); process.exit(2); }
  return Number(v).toFixed(2);
};

let cachedToken = null;
async function token() {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${ID}:${SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Auth failed (HTTP ${res.status}): ${data.error_description ?? data.error ?? 'unknown'}`);
    throw new Fatal();
  }
  return (cachedToken = data.access_token);
}

/** One API call. Logs a summary (never headers or tokens), throws with PayPal's error body on failure. */
async function api(label, method, path, body, { requestId = null } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await token()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  const entry = { at: new Date().toISOString(), label, method, path, http: res.status, debugId: res.headers.get('paypal-debug-id'), status: data.status ?? null, name: data.name ?? null };
  const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : [];
  writeFileSync(LOG, JSON.stringify([...log, entry], null, 2));
  if (!res.ok) {
    console.error(`\n${label} FAILED (HTTP ${res.status}, debug id ${entry.debugId}):\n${JSON.stringify(data, null, 2)}`);
    throw new Fatal();
  }
  return data;
}

const commands = {
  async create(amount = '10.00') {
    const value = money(amount);
    const order = await api('create order (AUTHORIZE)', 'POST', '/v2/checkout/orders', {
      intent: 'AUTHORIZE',
      purchase_units: [{ amount: { currency_code: CURRENCY, value }, description: 'ProofPay spike donation' }],
      payment_source: { paypal: { experience_context: { return_url: 'https://example.com/return', cancel_url: 'https://example.com/cancel', user_action: 'PAY_NOW' } } },
    }, { requestId: randomUUID() });
    const link = order.links?.find((l) => ['payer-action', 'approve'].includes(l.rel))?.href;
    saveState({ orderId: order.id, authorizationId: null, captures: [], amount: value });
    console.log(`order ${order.id}  status ${order.status}`);
    console.log(link ? `\nOpen this link, log in with a sandbox PERSONAL (donor) account, and approve:\n${link}\n\nThen run: authorize` : `No approval link in response; links: ${JSON.stringify(order.links)}`);
  },

  async authorize() {
    const orderId = need('orderId', 'Run: create');
    const res = await api('authorize order', 'POST', `/v2/checkout/orders/${orderId}/authorize`, null, { requestId: randomUUID() });
    const auth = res.purchase_units?.[0]?.payments?.authorizations?.[0];
    if (!auth) {
      console.error('No authorization in response (did the donor approve?):', JSON.stringify(res, null, 2));
      throw new Fatal();
    }
    saveState({ authorizationId: auth.id });
    console.log(`authorization ${auth.id}  status ${auth.status}  amount ${auth.amount.value} ${auth.amount.currency_code}`);
    console.log(`expires ${auth.expiration_time ?? '(not given)'}`);
  },

  async capture(amount, flag) {
    const authId = need('authorizationId', 'Run: authorize');
    const final = flag === 'final';
    const value = money(amount);
    const cap = await api(`capture ${value} (final=${final})`, 'POST', `/v2/payments/authorizations/${authId}/capture`,
      { amount: { currency_code: CURRENCY, value }, final_capture: final }, { requestId: randomUUID() });
    saveState({ captures: [...(loadState().captures ?? []), { id: cap.id, amount: value, final }] });
    console.log(`capture ${cap.id}  status ${cap.status}  amount ${value}`);
    const auth = await api('read authorization', 'GET', `/v2/payments/authorizations/${authId}`);
    console.log(`authorization is now: ${auth.status}`);
  },

  async status() {
    const authId = need('authorizationId', 'Run: authorize');
    const auth = await api('read authorization', 'GET', `/v2/payments/authorizations/${authId}`);
    console.log(JSON.stringify({ id: auth.id, status: auth.status, amount: auth.amount, expiration_time: auth.expiration_time }, null, 2));
    console.log('captures so far:', JSON.stringify(loadState().captures ?? []));
  },

  async payout(email, amount) {
    if (!email?.includes('@')) { console.error('Usage: payout <worker-sandbox-email> <amount>'); process.exit(2); }
    const value = money(amount);
    const batchId = `spike-${Date.now()}`;
    const res = await api('payout', 'POST', '/v1/payments/payouts', {
      sender_batch_header: { sender_batch_id: batchId, email_subject: 'ProofPay spike payout' },
      items: [{ recipient_type: 'EMAIL', receiver: email, amount: { value, currency: CURRENCY }, note: 'ProofPay spike', sender_item_id: `${batchId}-1` }],
    }, { requestId: batchId });
    const id = res.batch_header?.payout_batch_id;
    saveState({ payoutBatchId: id });
    console.log(`payout batch ${id}  status ${res.batch_header?.batch_status}`);
    if (id) {
      const detail = await api('read payout', 'GET', `/v1/payments/payouts/${id}`);
      console.log(`items: ${(detail.items ?? []).map((i) => i.transaction_status).join(', ') || '(none yet)'}`);
    }
  },
};

const [cmd, ...rest] = process.argv.slice(2);
if (!commands[cmd]) {
  console.error(`Usage: ${Object.keys(commands).join(' | ')}  (see the header of this file)`);
  process.exit(2);
}
try {
  await commands[cmd](...rest);
} catch (err) {
  if (!(err instanceof Fatal)) console.error(err.message);
  process.exitCode = 1;
}

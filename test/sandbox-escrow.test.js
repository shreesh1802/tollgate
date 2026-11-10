import test from 'node:test';
import assert from 'node:assert/strict';
import { SandboxEscrowPayPal } from '../src/paypal/sandbox-escrow.js';
import { TransientError } from '../src/paypal/mock.js';

/** A fake fetch that records every request and answers from a route table. */
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url, init = {}) => {
    const path = url.replace('https://api-m.sandbox.paypal.com', '');
    let reqBody = null;
    try { reqBody = init.body ? JSON.parse(init.body) : null; } catch { reqBody = init.body; } // the token call is form-encoded
    calls.push({ method: init.method, path, headers: init.headers, body: reqBody, rawBody: init.body });
    const key = `${init.method} ${path}`;
    const handler = Object.entries(routes).find(([k]) => key === k || (k.endsWith('*') && key.startsWith(k.slice(0, -1))))?.[1];
    if (!handler) throw new Error(`no route for ${key}`);
    const { status = 200, body = {}, headers = {} } = typeof handler === 'function' ? handler(calls.at(-1)) : handler;
    return { ok: status < 400, status, headers: { get: (h) => headers[h.toLowerCase()] ?? null }, text: async () => JSON.stringify(body), json: async () => body };
  };
  return { impl, calls };
}

const TOKEN = { 'POST /v1/oauth2/token': { body: { access_token: 'tok', expires_in: 3600 } } };
const make = (routes) => {
  const f = fakeFetch({ ...TOKEN, ...routes });
  return { f, pp: new SandboxEscrowPayPal({ clientId: 'id', clientSecret: 'secret', fetchImpl: f.impl }) };
};

test('refuses to start without credentials', () => {
  assert.throws(() => new SandboxEscrowPayPal({ clientId: '', clientSecret: '', fetchImpl: () => {} }), /not set/);
});

test('capture: correct endpoint, body, final_capture flag and idempotency header', async () => {
  const { f, pp } = make({ 'POST /v2/payments/authorizations/AUTH-1/capture': { status: 201, body: { id: 'CAP-9', status: 'COMPLETED' } } });
  const out = await pp.call('capture_authorization', { authorization_id: 'AUTH-1', amount: '18.00', currency: 'USD', final_capture: false, stage_id: 'S1' }, { requestId: 'req-1' });
  assert.deepEqual(out, { capture_id: 'CAP-9', authorization_id: 'AUTH-1', status: 'COMPLETED', amount: '18.00', currency: 'USD' });
  const call = f.calls.find((c) => c.path.endsWith('/capture'));
  assert.deepEqual(call.body, { amount: { currency_code: 'USD', value: '18.00' }, final_capture: false });
  assert.equal(call.headers['PayPal-Request-Id'], 'req-1');
  assert.equal(call.headers.Authorization, 'Bearer tok');
});

test('payout: email recipient, sender_batch_id derived from the request id', async () => {
  const { f, pp } = make({ 'POST /v1/payments/payouts': { status: 201, body: { batch_header: { payout_batch_id: 'B-1', batch_status: 'PENDING' } } } });
  const out = await pp.call('payout_worker', { payee: 'ravi@worker.example', amount: '30.00', currency: 'USD', stage_id: 'S1' }, { requestId: 'req-2' });
  assert.equal(out.batch_id, 'B-1');
  assert.equal(out.status, 'PENDING');
  const body = f.calls.find((c) => c.path === '/v1/payments/payouts').body;
  assert.equal(body.sender_batch_header.sender_batch_id, 'pp-req-2');
  assert.deepEqual(body.items[0].amount, { value: '30.00', currency: 'USD' });
  assert.equal(body.items[0].recipient_type, 'EMAIL');
});

test('the access token is fetched once and reused', async () => {
  const { f, pp } = make({ 'GET /v2/payments/authorizations/*': { body: { id: 'A', status: 'CREATED', amount: { value: '10.00', currency_code: 'USD' } } } });
  await pp.getAuthorization('A');
  await pp.getAuthorization('A');
  assert.equal(f.calls.filter((c) => c.path === '/v1/oauth2/token').length, 1);
});

test('PayPal 4xx is a hard error with the debug id; 5xx, 429 and network failures are transient', async () => {
  const run = async (handler) => {
    const { pp } = make({ 'POST /v2/payments/authorizations/A/capture': handler });
    return pp.call('capture_authorization', { authorization_id: 'A', amount: '1.00', currency: 'USD' }).catch((e) => e);
  };
  const hard = await run({ status: 422, body: { name: 'UNPROCESSABLE_ENTITY', message: 'over limit' }, headers: { 'paypal-debug-id': 'dbg1' } });
  assert.equal(hard instanceof TransientError, false);
  assert.match(hard.message, /UNPROCESSABLE_ENTITY \(HTTP 422\).*dbg1/);
  assert.equal(hard.status, 422);

  assert.equal((await run({ status: 503, body: {} })) instanceof TransientError, true);
  assert.equal((await run({ status: 429, body: {} })) instanceof TransientError, true);

  const down = new SandboxEscrowPayPal({ clientId: 'i', clientSecret: 's', fetchImpl: async () => { throw new Error('ECONNRESET'); } });
  assert.equal((await down.call('capture_authorization', { authorization_id: 'A', amount: '1.00', currency: 'USD' }).catch((e) => e)) instanceof TransientError, true);
});

test('errors never contain the client secret or the access token', async () => {
  const { pp } = make({ 'POST /v2/payments/authorizations/A/capture': { status: 401, body: { name: 'AUTHENTICATION_FAILURE', message: 'nope' } } });
  const err = await pp.call('capture_authorization', { authorization_id: 'A', amount: '1.00', currency: 'USD' }).catch((e) => e);
  assert.doesNotMatch(JSON.stringify([err.message, err.paypal]), /secret|tok/);
});

test('donation flow: order link, then authorization after approval', async () => {
  const { f, pp } = make({
    'POST /v2/checkout/orders': { status: 201, body: { id: 'ORD-1', status: 'PAYER_ACTION_REQUIRED', links: [{ rel: 'payer-action', href: 'https://sandbox.example/approve' }] } },
    'POST /v2/checkout/orders/ORD-1/authorize': { status: 201, body: { purchase_units: [{ payments: { authorizations: [{ id: 'AUTH-7', status: 'CREATED', amount: { value: '25.00', currency_code: 'USD' }, expiration_time: '2026-12-10T00:00:00Z' }] } }] } },
  });
  const order = await pp.createDonationOrder({ amount: 25, currency: 'USD', description: 'Fix the pump' });
  assert.equal(order.approveUrl, 'https://sandbox.example/approve');
  assert.equal(f.calls.find((c) => c.path === '/v2/checkout/orders').body.intent, 'AUTHORIZE');
  assert.deepEqual(await pp.authorizeOrder('ORD-1'), { authorizationId: 'AUTH-7', status: 'CREATED', amount: '25.00', currency: 'USD', expiresAt: '2026-12-10T00:00:00Z' });
});

test('authorizing an unapproved order says so', async () => {
  const { pp } = make({ 'POST /v2/checkout/orders/ORD-2/authorize': { status: 201, body: { purchase_units: [{ payments: {} }] } } });
  await assert.rejects(pp.authorizeOrder('ORD-2'), /NOT_APPROVED/);
});

test('unknown tools are refused', async () => {
  const { pp } = make({});
  await assert.rejects(pp.call('delete_everything', {}), /UNKNOWN_TOOL/);
});

test('payout status lookup reports the batch and each item', async () => {
  const { pp } = make({ 'GET /v1/payments/payouts/B-9': { body: { batch_header: { payout_batch_id: 'B-9', batch_status: 'SUCCESS' }, items: [{ transaction_status: 'SUCCESS', payout_item: { amount: { value: '3.00' }, receiver: 'w@example.com' } }] } } });
  assert.deepEqual(await pp.getPayout('B-9'), { batchId: 'B-9', status: 'SUCCESS', items: [{ status: 'SUCCESS', amount: '3.00', receiver: 'w@example.com' }] });
});

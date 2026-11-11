import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import piexif from 'piexifjs';
import { createApp } from '../src/server/app.js';
import { Store } from '../src/server/store.js';
import { MockEscrowPayPal } from '../src/paypal/escrow-mock.js';
import { makeDemoReviewer } from '../src/proofpay/review.js';
import { hamming } from '../src/proofpay/evidence.js';
import { dHash } from '../src/proofpay/image.js';
import { auditFor } from '../src/proofpay/project.js';

const NOW = Date.UTC(2026, 10, 10, 12);
const SITE = { lat: 12.9716, lon: 77.5946, radiusM: 300 };
const window = { from: '2026-11-01T00:00:00Z', to: '2026-12-31T00:00:00Z' };
const PROJECT = {
  title: 'Fix the village water pump',
  worker: { name: 'Ravi', email: 'ravi@worker.example' },
  site: SITE,
  stages: [
    { title: 'Remove old pump', spec: 'old pump removed', pct: 30, window },
    { title: 'Install new pump', spec: 'new pump installed', pct: 40, window },
    { title: 'Water flowing', spec: 'water flowing', pct: 30, window },
  ],
};

// ---- synthetic photos: three clearly different pictures, optionally with EXIF location and time ----
const PATTERNS = [
  (u, v) => 128 + 100 * Math.sin(6.28 * (u * 2 + v * 3)),
  (u, v) => 128 + 100 * Math.sin(6.28 * (u * 5 - v) + 1),
  (u, v) => 128 + 100 * Math.sin(6.28 * (u - v * 4) + 2),
];
function image(i, size = 64) {
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const g = Math.max(0, Math.min(255, Math.round(PATTERNS[i](x / size, y / size))));
    data.set([g, g, g, 255], (y * size + x) * 4);
  }
  return { width: size, height: size, data };
}
const photo = (i, { gps = SITE } = {}) => {
  const base = Buffer.from(jpeg.encode(image(i), 90).data).toString('binary');
  const exif = piexif.dump({
    '0th': {},
    Exif: { [piexif.ExifIFD.DateTimeOriginal]: '2026:11:10 10:00:00' },
    GPS: gps ? {
      [piexif.GPSIFD.GPSLatitudeRef]: 'N', [piexif.GPSIFD.GPSLatitude]: piexif.GPSHelper.degToDmsRational(gps.lat),
      [piexif.GPSIFD.GPSLongitudeRef]: 'E', [piexif.GPSIFD.GPSLongitude]: piexif.GPSHelper.degToDmsRational(gps.lon),
    } : {},
  });
  return Buffer.from(piexif.insert(exif, base), 'binary');
};
const pngNoExif = (i) => { const im = image(i); return PNG.sync.write(Object.assign(new PNG({ width: im.width, height: im.height }), { data: im.data })); };

test('the three test pictures are far apart (so duplicate checks in these tests are meaningful)', () => {
  const h = [0, 1, 2].map((i) => dHash(image(i)));
  assert.ok(hamming(h[0], h[1]) > 10 && hamming(h[0], h[2]) > 10 && hamming(h[1], h[2]) > 10, h.join(' '));
});

// ---- harness ----
async function boot(over = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'proofpay-'));
  const paypal = over.paypal ?? new MockEscrowPayPal();
  const store = new Store(path.join(dir, 'projects.json'));
  let staticDir = null;
  if (over.withStatic) { staticDir = path.join(dir, 'public'); mkdirSync(staticDir); writeFileSync(path.join(staticDir, 'index.html'), '<h1>hi</h1>'); }
  const server = createApp({
    store, paypal, reviewers: [makeDemoReviewer('a'), makeDemoReviewer('b')], reviewMode: 'demo', mode: 'mock',
    publicUrl: 'http://x.test', verifierKey: 'vk', uploadsDir: path.join(dir, 'uploads'), staticDir, clock: () => NOW, ...over.app,
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (method, url, { body, headers = {}, raw = false, redirect } = {}) => {
    const res = await fetch(base + url, { method, headers: { ...(body && !raw ? { 'content-type': 'application/json' } : {}), ...headers }, body: raw ? body : body ? JSON.stringify(body) : undefined, redirect });
    const type = res.headers.get('content-type') ?? '';
    return { status: res.status, headers: res.headers, json: type.includes('json') ? await res.json() : null };
  };
  const close = () => { server.closeAllConnections(); return new Promise((r) => server.close(r)); };
  return { base, api, store, paypal, dir, close };
}

/** Create the project and fund it with two donors ($60 and $40). */
async function funded(ctx) {
  const created = await ctx.api('POST', '/api/projects', { body: PROJECT });
  assert.equal(created.status, 201);
  const { id, workerKey } = created.json;
  for (const [donor, amount] of [['Asha', 60], ['Ben', 40]]) {
    assert.equal((await ctx.api('POST', `/api/projects/${id}/donations`, { body: { donor, amount } })).status, 201);
  }
  const code = async (stage) => (await ctx.api('GET', `/api/projects/${id}`, { headers: { 'x-worker-key': workerKey } })).json.stages.find((s) => s.id === stage).code;
  const upload = (stage, buf, { key = workerKey, qs = '' } = {}) => ctx.api('POST', `/api/projects/${id}/stages/${stage}/submissions${qs}`, { body: buf, raw: true, headers: { 'x-worker-key': key, 'content-type': 'application/octet-stream' } });
  return { id, workerKey, code, upload };
}
const sum = (effects, type) => effects.filter((e) => e.type === type).reduce((a, e) => a + Math.round(Number(e.amount) * 100), 0);

test('what each audience sees: no worker email, codes only for the worker', async () => {
  const ctx = await boot();
  try {
    const { id, workerKey } = await funded(ctx);
    const pub = (await ctx.api('GET', `/api/projects/${id}`)).json;
    assert.equal(JSON.stringify(pub).includes('ravi@worker.example'), false);
    assert.equal(pub.stages.every((s) => s.code === undefined), true);
    assert.equal(pub.totals.reserved, '100.00');
    const worker = (await ctx.api('GET', `/api/projects/${id}`, { headers: { 'x-worker-key': workerKey } })).json;
    assert.match(worker.stages[0].code, /^[0-9A-F]{4}$/);
    assert.equal(worker.stages[1].code, undefined); // only the active stage
  } finally { await ctx.close(); }
});

test('project creation is validated', async () => {
  const ctx = await boot();
  try {
    const bad = (over) => ctx.api('POST', '/api/projects', { body: { ...PROJECT, ...over } });
    assert.equal((await bad({ title: '' })).status, 400);
    assert.equal((await bad({ worker: { name: 'x', email: 'nope' } })).status, 400);
    assert.equal((await bad({ stages: [{ ...PROJECT.stages[0], pct: 50 }] })).status, 400); // does not sum to 100
    assert.equal((await bad({ site: { lat: 99, lon: 0, radiusM: 100 } })).status, 400);
    assert.equal((await ctx.api('POST', '/api/projects', { body: 'not json', raw: true })).status, 400);
  } finally { await ctx.close(); }
});

test('uploads: worker key, file type, size, and stage state are all enforced', async () => {
  const ctx = await boot();
  try {
    const p = await funded(ctx);
    assert.equal((await p.upload('S1', photo(0), { key: 'wrong' })).status, 403);
    assert.equal((await p.upload('S1', Buffer.from('definitely not an image'))).status, 415);
    assert.equal((await p.upload('S1', Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024)]))).status, 413);
    assert.equal((await p.upload('S2', photo(1))).status, 409); // stage 2 is not active yet
    assert.equal((await p.upload('S9', photo(1))).status, 404);
    assert.equal(ctx.paypal.effects.length, 0);
  } finally { await ctx.close(); }
});

test('a good upload releases stage 1: pro-rata captures, payout, evidence public only after release', async () => {
  const ctx = await boot();
  try {
    const p = await funded(ctx);
    const code = await p.code('S1');
    const r = await p.upload('S1', photo(0), { qs: `?demoCode=${code}` });
    assert.equal(r.status, 200);
    assert.equal(r.json.decision, 'RELEASE');
    assert.equal(r.json.release.payout.amount, '30.00');
    assert.equal(sum(ctx.paypal.effects, 'payout'), 3000);

    const view = (await ctx.api('GET', `/api/projects/${p.id}`)).json;
    assert.equal(view.stages[0].status, 'RELEASED');
    assert.equal(view.stages[1].status, 'ACTIVE');
    assert.equal(view.totals.paid, '30.00');
    assert.equal((await ctx.api('GET', `/api/images/${p.id}/S1-1`)).status, 200); // released: public
  } finally { await ctx.close(); }
});

test('a held case needs the verifier key, and approval is bound to the exact evidence', async () => {
  const ctx = await boot();
  try {
    const p = await funded(ctx);
    const code = await p.code('S1');
    // A PNG has no location or time: unknown, so a human must decide.
    const held = await p.upload('S1', pngNoExif(0), { qs: `?demoCode=${code}` });
    assert.equal(held.json.decision, 'HOLD');
    assert.equal(ctx.paypal.effects.length, 0);
    assert.equal((await ctx.api('GET', `/api/images/${p.id}/S1-1`)).status, 403); // unreleased evidence is private

    assert.equal((await ctx.api('GET', '/api/verify/queue')).status, 401);
    const queue = (await ctx.api('GET', '/api/verify/queue', { headers: { 'x-verifier-key': 'vk' } })).json;
    assert.equal(queue.length, 1);
    assert.equal((await ctx.api('GET', `/api/images/${p.id}/S1-1`, { headers: { 'x-verifier-key': 'vk' } })).status, 200);

    const decide = (body) => ctx.api('POST', `/api/verify/${p.id}/S1-1`, { body, headers: { 'x-verifier-key': 'vk' } });
    assert.equal((await decide({ decision: 'approve', evidenceHash: 'tampered' })).status, 409);
    assert.equal(ctx.paypal.effects.length, 0);
    const ok = await decide({ decision: 'approve', evidenceHash: queue[0].evidenceHash });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.release.payout.amount, '30.00');
    assert.equal((await decide({ decision: 'approve', evidenceHash: queue[0].evidenceHash })).status, 409); // cannot be approved twice
    assert.equal(sum(ctx.paypal.effects, 'payout'), 3000);
  } finally { await ctx.close(); }
});

test('reusing an earlier photo for the next stage is blocked even though the (simulated) reviewers approve', async () => {
  const ctx = await boot();
  try {
    const p = await funded(ctx);
    await p.upload('S1', photo(0), { qs: `?demoCode=${await p.code('S1')}` });
    const before = ctx.paypal.effects.length;
    const r = await p.upload('S2', photo(0), { qs: `?demoCode=${await p.code('S2')}` });
    assert.equal(r.json.decision, 'BLOCK');
    assert.ok(r.json.reasons.some((x) => x.rule === 'duplicate-evidence'));
    assert.equal(ctx.paypal.effects.length, before);
  } finally { await ctx.close(); }
});

test('two simultaneous uploads for one stage release it exactly once', async () => {
  const ctx = await boot();
  try {
    const p = await funded(ctx);
    const code = await p.code('S1');
    const [a, b] = await Promise.all([p.upload('S1', photo(0), { qs: `?demoCode=${code}` }), p.upload('S1', photo(1), { qs: `?demoCode=${code}` })]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    assert.equal(sum(ctx.paypal.effects, 'payout'), 3000);
  } finally { await ctx.close(); }
});

test('full run: three stages pay out exactly what donors reserved, and the audit chain verifies', async () => {
  const ctx = await boot();
  try {
    const p = await funded(ctx);
    for (const [i, s] of ['S1', 'S2', 'S3'].entries()) {
      const r = await p.upload(s, photo(i), { qs: `?demoCode=${await p.code(s)}` });
      assert.equal(r.json.decision, 'RELEASE', `${s}: ${JSON.stringify(r.json.reasons)}`);
    }
    assert.equal(sum(ctx.paypal.effects, 'capture'), 10000);
    assert.equal(sum(ctx.paypal.effects, 'payout'), 10000);
    const audit = (await ctx.api('GET', `/api/projects/${p.id}/audit`)).json;
    assert.equal(audit.chain.ok, true);
    assert.ok(audit.entries.length > 10);
  } finally { await ctx.close(); }
});

test('projects survive a restart: same state, audit chain still valid', async () => {
  const ctx = await boot();
  try {
    const p = await funded(ctx);
    await p.upload('S1', photo(0), { qs: `?demoCode=${await p.code('S1')}` });
    const reopened = new Store(path.join(ctx.dir, 'projects.json'));
    const project = reopened.get(p.id);
    assert.equal(project.paidCents, 3000);
    assert.equal(project.stages[0].status, 'RELEASED');
    assert.equal(auditFor(project).verify().ok, true);
  } finally { await ctx.close(); }
});

test('sandbox-style donation: only counts after the donor approves and PayPal sends them back with the right token', async () => {
  const fake = {
    orders: 0,
    async createDonationOrder() { return { orderId: `ORD-${++this.orders}`, approveUrl: 'https://sandbox.example/approve' }; },
    async authorizeOrder() { return { authorizationId: 'AUTH-1', amount: '25.00', currency: 'USD', expiresAt: '2026-12-09T00:00:00Z' }; },
    async call() { throw new Error('not used'); },
  };
  const ctx = await boot({ paypal: fake });
  try {
    const { id } = (await ctx.api('POST', '/api/projects', { body: PROJECT })).json;
    const d = await ctx.api('POST', `/api/projects/${id}/donations`, { body: { donor: 'Asha', amount: 25 } });
    assert.equal(d.json.status, 'AWAITING_APPROVAL');
    assert.equal(d.json.approveUrl, 'https://sandbox.example/approve');
    assert.equal((await ctx.api('GET', `/api/projects/${id}`)).json.totals.reserved, '0.00'); // not reserved yet

    const ret = (token) => ctx.api('GET', `/api/donate/return?project=${id}&donation=D1&token=${token}`, { redirect: 'manual' });
    const forged = await ret('WRONG');
    assert.equal(forged.status, 302);
    assert.match(forged.headers.get('location'), /bad-donation-link/);
    assert.equal((await ctx.api('GET', `/api/projects/${id}`)).json.totals.reserved, '0.00');

    const good = await ret('ORD-1');
    assert.match(good.headers.get('location'), /donated=1/);
    const view = (await ctx.api('GET', `/api/projects/${id}`)).json;
    assert.equal(view.totals.reserved, '25.00');
    assert.equal(view.donations[0].status, 'CONFIRMED');
    assert.equal(view.holdExpiresAt, '2026-12-09T00:00:00Z');
  } finally { await ctx.close(); }
});

test('the hourly review quota protects the model budget', async () => {
  const ctx = await boot({ app: { maxReviewsPerHour: 1 } });
  try {
    const p = await funded(ctx);
    assert.equal((await p.upload('S1', pngNoExif(0))).status, 200);
    assert.equal((await p.upload('S1', pngNoExif(1))).status, 429);
  } finally { await ctx.close(); }
});

test('static files: served with a CSP, and path traversal is refused', async () => {
  const ctx = await boot({ withStatic: true });
  try {
    const home = await fetch(`${ctx.base}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await fetch(`${ctx.base}/..%2f..%2fpackage.json`)).status, 404);
    assert.equal((await fetch(`${ctx.base}/nope.html`)).status, 404);
  } finally { await ctx.close(); }
});

test('donors see how much of their donation has been released', async () => {
  const ctx = await boot();
  try {
    const p = await funded(ctx);
    const before = (await ctx.api('GET', `/api/projects/${p.id}`)).json.donations;
    assert.deepEqual(before.map((d) => d.released), ['0.00', '0.00']);
    await p.upload('S1', photo(0), { qs: `?demoCode=${await p.code('S1')}` });
    const after = (await ctx.api('GET', `/api/projects/${p.id}`)).json.donations;
    assert.deepEqual(after.map((d) => d.released), ['18.00', '12.00']); // 30% of each donor's $60 and $40
  } finally { await ctx.close(); }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWebhookNotifier } from '../src/server/notify.js';

const quiet = { warn() {} };
const event = {
  kind: 'review_needed',
  project: { id: 'P-1', title: 'Fix the pump' },
  stage: { id: 'S1', title: 'Old pump documented', spec: 'the old pump is visible' },
  submissionId: 'S1-1',
  reasons: [{ rule: 'location-unknown', detail: 'no location metadata' }, { rule: 'time-unknown', detail: 'no timestamp' }],
};
const fakeFetch = (status = 200) => {
  const calls = [];
  const impl = async (url, init) => { calls.push({ url: String(url), init, body: JSON.parse(init.body) }); return { ok: status < 400, status }; };
  return { impl, calls };
};
const make = (over = {}) => makeWebhookNotifier({ url: 'https://hooks.example.test/catch/123', publicUrl: 'https://demo.example.test', log: quiet, ...over });

test('a held case produces a readable message with a link to the verifier page and no secrets', async () => {
  const f = fakeFetch();
  assert.equal(await make({ fetchImpl: f.impl })(event), true);
  const [c] = f.calls;
  assert.equal(c.url, 'https://hooks.example.test/catch/123');
  assert.equal(c.init.method, 'POST');
  assert.equal(c.body.event, 'review_needed');
  assert.match(c.body.title, /Review needed: Fix the pump, Old pump documented/);
  assert.match(c.body.text, /location-unknown \(no location metadata\); time-unknown \(no timestamp\)/);
  assert.deepEqual(c.body.reasons, ['location-unknown (no location metadata)', 'time-unknown (no timestamp)']);
  assert.equal(c.body.reviewUrl, 'https://demo.example.test/verify.html');
  assert.deepEqual(Object.keys(c.body).sort(), ['at', 'event', 'project', 'reasons', 'reviewUrl', 'stage', 'submission', 'text', 'title']);
});

test('a failed payment is announced as such', async () => {
  const f = fakeFetch();
  await make({ fetchImpl: f.impl })({ ...event, kind: 'release_failed', error: 'RESOURCE_NOT_FOUND' });
  assert.equal(f.calls[0].body.event, 'release_failed');
  assert.match(f.calls[0].body.text, /payment provider failed \(RESOURCE_NOT_FOUND\)/);
});

test('an hourly limit stops a flood of messages', async () => {
  const f = fakeFetch();
  let t = 1_000_000;
  const notify = make({ fetchImpl: f.impl, maxPerHour: 2, now: () => t });
  assert.equal(await notify(event), true);
  assert.equal(await notify(event), true);
  assert.equal(await notify(event), false);
  assert.equal(f.calls.length, 2);
  t += 3600_001; // an hour later it works again
  assert.equal(await notify(event), true);
});

test('a broken or slow webhook is reported as not sent, and never throws', async () => {
  assert.equal(await make({ fetchImpl: fakeFetch(500).impl })(event), false);
  assert.equal(await make({ fetchImpl: async () => { throw new Error('ECONNRESET'); } })(event), false);
  const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const started = Date.now();
  assert.equal(await make({ fetchImpl: hang, timeoutMs: 30 })(event), false);
  assert.ok(Date.now() - started < 1000);
});

test('only https webhooks are accepted (unless explicitly allowed for local testing)', () => {
  assert.throws(() => make({ url: 'http://hooks.example.test/x' }), /https/);
  assert.doesNotThrow(() => make({ url: 'http://localhost:9/x', allowInsecure: true }));
});

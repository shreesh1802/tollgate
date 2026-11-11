import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, planSignature } from '../public/plan.js';

const DAY = 86400000;
const T0 = Date.UTC(2026, 10, 10, 9, 0);
const window = { from: '2026-11-01T00:00:00Z', to: '2026-12-10T00:00:00Z' };
const stage = (i, status, extra = {}) => ({ id: `S${i + 1}`, index: i, title: `Step ${i + 1}`, pct: [30, 40, 30][i], window, status, submissions: [], release: null, releasedAt: null, ...extra });
const released = (i, at, state) => stage(i, 'RELEASED', { releasedAt: new Date(at).toISOString(), release: { payout: { amount: ['3.00', '4.00', '3.00'][i], state } } });
const view = (stages) => ({ startedAt: new Date(T0).toISOString(), totals: { reserved: '10.00' }, stages });

test('plan: one task and one payment milestone per stage, chained so a stage blocks the next payment', () => {
  const v = view([released(0, T0 + 60_000, 'paid'), stage(1, 'ACTIVE'), stage(2, 'PENDING')]);
  const plan = buildPlan(v, T0 + 3600_000);
  assert.deepEqual(plan.tasks.map((t) => t.id), ['S1', 'M1', 'S2', 'M2', 'S3', 'M3']);
  const dep = (from, to) => plan.dependencies.some((d) => d.fromTask === from && d.toTask === to && d.type === 2);
  assert.ok(dep('S1', 'M1') && dep('S1', 'S2') && dep('S2', 'M2') && dep('S2', 'S3') && dep('S3', 'M3'));
});

test('plan: stages follow one another in time, and every bar is at least a day wide', () => {
  const v = view([released(0, T0 + 60_000, 'paid'), stage(1, 'ACTIVE'), stage(2, 'PENDING')]);
  const plan = buildPlan(v, T0 + 3600_000);
  const bars = plan.tasks.filter((t) => t.id.startsWith('S'));
  for (const b of bars) assert.ok(Date.parse(b.endDate) - Date.parse(b.startDate) >= DAY, `${b.id} too short`);
  for (let i = 1; i < bars.length; i++) assert.equal(bars[i].startDate, bars[i - 1].endDate);
  assert.equal(bars[0].startDate, new Date(T0).toISOString());
  assert.ok(Date.parse(plan.end) > Date.parse(bars.at(-1).endDate));
});

test('plan: status drives progress and labels, and real release times stay visible', () => {
  const v = view([released(0, T0 + 60_000, 'paid'), stage(1, 'ACTIVE', { submissions: [{}] }), stage(2, 'PENDING')]);
  const t = Object.fromEntries(buildPlan(v, T0 + 3600_000).tasks.map((x) => [x.id, x]));
  assert.equal(t.S1.percentDone, 100);
  assert.equal(t.S1.name, 'Stage 1: Step 1');
  assert.match(t.S1.detail, /Verified 2026-11-10 09:01 UTC/);
  assert.equal(t.S2.percentDone, 60);
  assert.equal(t.S2.detail, 'Evidence under review');
  assert.equal(t.S3.percentDone, 0);
  assert.match(t.S3.detail, /Blocked until the previous stage is verified/);
  assert.equal(t.M1.name, '$3.00 paid');
  assert.equal(t.M2.name, '$4.00 released on verification'); // 40% of $10.00, not released yet
  assert.equal(t.M1.duration, 0); // a milestone
  assert.equal(t.S1.cls, 'st-released');
  assert.equal(t.M1.cls, 'pay-paid');
});

test('plan: a payout that is settling or has a problem is labelled as such', () => {
  const a = buildPlan(view([released(0, T0 + 1000, 'pending'), stage(1, 'ACTIVE'), stage(2, 'PENDING')]), T0 + 5000);
  assert.equal(a.tasks.find((t) => t.id === 'M1').name, '$3.00 sent, settling');
  const b = buildPlan(view([released(0, T0 + 1000, 'problem'), stage(1, 'ACTIVE'), stage(2, 'PENDING')]), T0 + 5000);
  assert.equal(b.tasks.find((t) => t.id === 'M1').name, '$3.00 payout needs attention');
});

test('plan signature changes only when something the timeline shows changes', () => {
  const v = view([stage(0, 'ACTIVE'), stage(1, 'PENDING'), stage(2, 'PENDING')]);
  const before = planSignature(v);
  assert.equal(planSignature(structuredClone(v)), before);
  const w = structuredClone(v);
  w.stages[0].submissions.push({});
  assert.notEqual(planSignature(w), before);
});

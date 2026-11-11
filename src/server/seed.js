// The demo project. Its stage requirements and its fixed code match the three sample photos in
// public/samples, so a visitor can click through the whole flow. Real projects get random codes.
import { randomBytes } from 'node:crypto';
import { createProject, addDonation } from '../proofpay/project.js';

export const DEMO_CODE = '7K2Q';

export const SAMPLE_PHOTOS = [
  { stage: 'S1', file: 'stage1_before.png', caption: 'Stage 1: the old pump, before any work' },
  { stage: 'S2', file: 'stage2_installed.png', caption: 'Stage 2: the new pump installed' },
  { stage: 'S3', file: 'stage3_water_flow.png', caption: 'Stage 3: water flowing' },
];

export async function seedDemoProject({ store, paypal, now = Date.now(), code = DEMO_CODE }) {
  const window = { from: new Date(now - 86400000).toISOString(), to: new Date(now + 30 * 86400000).toISOString() };
  const project = createProject({
    title: 'Fix the village water pump',
    worker: { name: 'Ravi Kumar', email: 'ravi@worker.example' },
    site: { lat: 12.9716, lon: 77.5946, radiusM: 300 },
    stages: [
      { title: 'Old pump documented', spec: 'the old rusty hand pump is visible at the site (before any work)', pct: 30, window },
      { title: 'New pump installed', spec: 'a new green hand pump is installed and mounted on its concrete base', pct: 40, window },
      { title: 'Water flowing', spec: 'water is visibly flowing from the pump spout into a bucket', pct: 30, window },
    ],
    codeFor: () => code,
  });
  project.workerKey = randomBytes(12).toString('hex');
  project.createdAt = new Date(now).toISOString();
  for (const [donor, amount] of [['Asha', 60], ['Ben', 40]]) {
    const order = await paypal.createDonationOrder({ amount, currency: 'USD' });
    const a = await paypal.authorizeOrder(order.orderId);
    addDonation(project, { donor, amount, authorizationId: a.authorizationId, orderId: order.orderId, expiresAt: a.expiresAt });
  }
  store.put(project);
  return project;
}

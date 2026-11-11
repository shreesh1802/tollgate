// npm start. Configuration is by environment variables (or a local .env file):
//   MODE=mock|sandbox        PayPal backend (default mock; sandbox needs PAYPAL_CLIENT_ID/SECRET)
//   REVIEWERS=demo|claude    photo reviewers (default demo = simulated; claude needs ANTHROPIC_API_KEY)
//   PORT, PUBLIC_URL, DATA_DIR, VERIFIER_KEY, ORGANIZER_KEY, SEED=1, MAX_REVIEWS_PER_HOUR
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { Store } from './store.js';
import { MockEscrowPayPal } from '../paypal/escrow-mock.js';
import { SandboxEscrowPayPal } from '../paypal/sandbox-escrow.js';
import { defaultReviewers, makeDemoReviewer } from '../proofpay/review.js';
import { createProject, addDonation } from '../proofpay/project.js';

try { process.loadEnvFile('.env'); } catch { /* no .env file, use the real environment */ }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = process.env;
const port = Number(env.PORT ?? 3000);
const mode = env.MODE ?? 'mock';
const reviewMode = env.REVIEWERS ?? 'demo';
const dataDir = path.resolve(env.DATA_DIR ?? path.join(root, 'data'));
const publicUrl = env.PUBLIC_URL ?? env.RENDER_EXTERNAL_URL ?? `http://localhost:${port}`; // Render sets RENDER_EXTERNAL_URL
const verifierKey = env.VERIFIER_KEY ?? randomBytes(9).toString('hex');

if (!['mock', 'sandbox'].includes(mode)) throw new Error('MODE must be mock or sandbox');
if (!['demo', 'claude'].includes(reviewMode)) throw new Error('REVIEWERS must be demo or claude');
if (reviewMode === 'claude' && !env.ANTHROPIC_API_KEY) throw new Error('REVIEWERS=claude needs ANTHROPIC_API_KEY');

const paypal = mode === 'sandbox' ? new SandboxEscrowPayPal() : new MockEscrowPayPal();
const reviewers = reviewMode === 'claude' ? defaultReviewers() : [makeDemoReviewer('a'), makeDemoReviewer('b')];
const store = new Store(path.join(dataDir, 'projects.json'));
if (mode === 'mock') paypal.restoreFrom(store.list()); // the mock has no memory of its own

const wantSeed = env.SEED === '1' || process.argv.includes('--seed');
if (wantSeed && mode === 'mock' && store.list().length === 0) {
  const now = Date.now();
  const window = { from: new Date(now - 86400000).toISOString(), to: new Date(now + 30 * 86400000).toISOString() };
  const p = createProject({
    title: 'Fix the village water pump',
    worker: { name: 'Ravi Kumar', email: 'ravi@worker.example' },
    site: { lat: 12.9716, lon: 77.5946, radiusM: 300 },
    stages: [
      { title: 'Remove the old pump', spec: 'old pump removed and the site cleared', pct: 30, window },
      { title: 'Install the new pump', spec: 'new pump visibly installed and mounted', pct: 40, window },
      { title: 'Water flowing', spec: 'water visibly flowing from the new pump', pct: 30, window },
    ],
  });
  p.workerKey = randomBytes(12).toString('hex');
  for (const [donor, amount] of [['Asha', 60], ['Ben', 40]]) {
    const order = await paypal.createDonationOrder({ amount, currency: 'USD' });
    const a = await paypal.authorizeOrder(order.orderId);
    addDonation(p, { donor, amount, authorizationId: a.authorizationId, orderId: order.orderId, expiresAt: a.expiresAt });
  }
  store.put(p);
  console.log(`seeded demo project ${p.id}\n  worker link: ${publicUrl}/worker.html?project=${p.id}&key=${p.workerKey}`);
}

// Demo mode (mock PayPal, seeded project): the home page shows a guide with the worker link and
// verifier key so a visitor needs nothing from the server log. Never enabled with real PayPal.
const demoProject = wantSeed && mode === 'mock' ? store.list().find((p) => p.workerKey) : null;
const demo = demoProject ? { projectId: demoProject.id, workerKey: demoProject.workerKey, verifierKey } : null;

const app = createApp({
  store, paypal, reviewers, reviewMode, mode, publicUrl, verifierKey, demo,
  maxProjects: Number(env.MAX_PROJECTS ?? 0),
  organizerKey: env.ORGANIZER_KEY ?? null,
  uploadsDir: path.join(dataDir, 'uploads'),
  staticDir: path.join(root, 'public'),
  vendor: {
    '/vendor/ag-grid/': path.join(root, 'node_modules/ag-grid-community/dist'),
    '/vendor/ag-charts/': path.join(root, 'node_modules/ag-charts-community/dist/umd'),
    '/vendor/bryntum/': path.join(root, 'node_modules/@bryntum/gantt'), // trial package: served from node_modules, never committed
  },
  maxReviewsPerHour: Number(env.MAX_REVIEWS_PER_HOUR ?? 60),
});

app.listen(port, () => {
  console.log(`ProofPay on ${publicUrl}  (PayPal: ${mode}, reviewers: ${reviewMode}${reviewMode === 'demo' ? ' = SIMULATED' : ''})`);
  if (!env.VERIFIER_KEY) console.log(`verifier key (this run only): ${verifierKey}`);
});

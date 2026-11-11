// ProofPay HTTP API. No framework: node:http, a tiny router, and the modules in src/proofpay.
//
// Access model (kept deliberately small):
//   - anyone can read a project (donors see stages, payments and the audit log)
//   - the worker uploads evidence with the project's worker key (x-worker-key)
//   - a verifier decides held cases with the verifier key (x-verifier-key)
//   - an optional organizer key protects project creation
import http from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createProject, addDonation, auditFor, confirmedDonations, totalCapturedCents, totalReservedCents } from '../proofpay/project.js';
import { processSubmission, humanDecision } from '../proofpay/pipeline.js';
import { prepareUpload, sniffType, MAX_BYTES } from '../proofpay/image.js';
import { fromCents } from '../proofpay/money.js';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && timingSafeEqual(x, y);
};

async function readBody(req, max) {
  if (Number(req.headers['content-length']) > max) throw new HttpError(413, `payload too large (limit ${max} bytes)`);
  const chunks = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > max) throw new HttpError(413, `payload too large (limit ${max} bytes)`);
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const buf = await readBody(req, 64 * 1024);
  try {
    return JSON.parse(buf.toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'body must be valid JSON');
  }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const json = (body, status = 200) => ({ status, body: JSON.stringify(body), type: 'application/json; charset=utf-8' });
const redirect = (to) => ({ status: 302, headers: { Location: to }, body: '' });

// ---- views: what each audience may see ----

const holdExpiry = (p) => confirmedDonations(p).filter((d) => d.expiresAt).map((d) => d.expiresAt).sort()[0] ?? null;

function projectView(p, { asWorker = false } = {}) {
  return {
    id: p.id,
    title: p.title,
    currency: p.currency,
    worker: { name: p.worker.name }, // the payee's email is never published
    site: p.site,
    donations: p.donations.map((d) => ({ id: d.id, donor: d.donor, amount: d.amount, status: d.status, released: fromCents(d.capturedCents) })),
    totals: { reserved: fromCents(totalReservedCents(p)), captured: fromCents(totalCapturedCents(p)), paid: fromCents(p.paidCents) },
    holdExpiresAt: holdExpiry(p),
    stages: p.stages.map((s) => ({
      id: s.id,
      index: s.index,
      title: s.title,
      spec: s.spec,
      pct: s.pct,
      window: s.window,
      status: s.status,
      release: s.release,
      code: asWorker && s.status === 'ACTIVE' ? s.code : undefined, // the one-time code is for the worker only
      submissions: s.submissions.map((x) => ({ id: x.id, status: x.status, receivedAt: x.receivedAt, decision: x.verdict?.decision, reasons: x.verdict?.reasons?.map((r) => r.rule) })),
    })),
  };
}

function submissionView(out) {
  return {
    decision: out.decision,
    status: out.status,
    submissionId: out.submissionId,
    reasons: out.reasons,
    checks: out.checks,
    reviews: out.reviews,
    release: out.release ? { ok: out.release.ok, payout: out.release.payout, captures: out.release.captures, reason: out.release.reason } : undefined,
  };
}

export function createApp({
  store, paypal, reviewers, reviewMode = 'demo', mode = 'mock', publicUrl, verifierKey, organizerKey = null,
  uploadsDir, staticDir = null, clock = () => Date.now(), maxReviewsPerHour = 60,
}) {
  const routes = [];
  const route = (method, pattern, handler) => routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler });

  // One operation per project at a time, so a release can never run twice concurrently.
  const chains = new Map();
  const locked = (id, fn) => {
    const next = (chains.get(id) ?? Promise.resolve()).catch(() => {}).then(fn);
    chains.set(id, next);
    return next;
  };

  const reviewTimes = [];
  const overQuota = () => {
    const cutoff = clock() - 3600_000;
    while (reviewTimes.length && reviewTimes[0] < cutoff) reviewTimes.shift();
    return reviewTimes.length >= maxReviewsPerHour;
  };

  const need = (id) => store.get(id) ?? (() => { throw new HttpError(404, 'no such project'); })();
  const requireVerifier = (req) => {
    if (!safeEqual(req.headers['x-verifier-key'], verifierKey)) throw new HttpError(401, 'verifier key required');
  };
  const deps = { paypal, reviewers, clock };

  async function confirmDonation(project, d) {
    const a = await paypal.authorizeOrder(d.orderId);
    if (Number(a.amount) !== Number(d.amount) || a.currency !== project.currency) throw new Error('authorised amount does not match the donation');
    d.authorizationId = a.authorizationId;
    d.expiresAt = a.expiresAt;
    d.status = 'CONFIRMED';
    auditFor(project, clock).append({ event: 'donation-confirmed', donation: d.id, amount: d.amount });
  }

  route('GET', '/api/health', async () => json({ ok: true }));
  route('GET', '/api/config', async () => json({ mode, reviewMode, simulatedReviews: reviewMode === 'demo', maxUploadBytes: MAX_BYTES }));

  route('GET', '/api/projects', async () => json(store.list().map((p) => ({ id: p.id, title: p.title, totals: projectView(p).totals, stages: p.stages.map((s) => s.status) }))));

  route('POST', '/api/projects', async ({ req }) => {
    if (organizerKey && !safeEqual(req.headers['x-organizer-key'], organizerKey)) throw new HttpError(401, 'organizer key required');
    const b = await readJson(req);
    const bad = (m) => { throw new HttpError(400, m); };
    if (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 100) bad('title is required (max 100 characters)');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.worker?.email ?? '')) bad('worker.email must be an email address');
    if (typeof b.worker?.name !== 'string' || !b.worker.name.trim()) bad('worker.name is required');
    const { lat, lon, radiusM } = b.site ?? {};
    if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180) || !(radiusM >= 10 && radiusM <= 5000)) bad('site needs lat, lon and radiusM between 10 and 5000');
    if (!Array.isArray(b.stages) || b.stages.length < 1 || b.stages.length > 8) bad('1 to 8 stages are required');
    for (const s of b.stages) {
      if (!s.title || !s.spec || !Number.isInteger(s.pct) || s.pct < 1) bad('each stage needs title, spec and a whole-number pct');
      if (!(Date.parse(s.window?.from) < Date.parse(s.window?.to))) bad('each stage needs a window with from earlier than to');
    }
    let project;
    try {
      project = createProject({ title: b.title.trim(), worker: { name: b.worker.name.trim(), email: b.worker.email.trim() }, site: { lat, lon, radiusM }, stages: b.stages });
    } catch (e) {
      throw new HttpError(400, e.message);
    }
    project.workerKey = randomBytes(12).toString('hex');
    project.createdAt = new Date(clock()).toISOString();
    store.put(project);
    return json({ id: project.id, workerKey: project.workerKey, workerLink: `${publicUrl}/worker.html?project=${project.id}&key=${project.workerKey}` }, 201);
  });

  route('GET', '/api/projects/:id', async ({ req, params }) => {
    const p = need(params.id);
    return json(projectView(p, { asWorker: safeEqual(req.headers['x-worker-key'], p.workerKey) }));
  });

  route('GET', '/api/projects/:id/audit', async ({ params }) => {
    const p = need(params.id);
    return json({ chain: auditFor(p, clock).verify(), entries: p.auditEntries });
  });

  route('POST', '/api/projects/:id/donations', async ({ req, params }) => {
    const b = await readJson(req);
    const amount = Number(b.amount);
    const twoDecimals = Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6;
    if (!(amount >= 1 && amount <= 1000) || !twoDecimals) throw new HttpError(400, 'amount must be between 1 and 1000, with at most 2 decimals');
    if (typeof b.donor !== 'string' || !b.donor.trim() || b.donor.length > 60) throw new HttpError(400, 'donor name is required (max 60 characters)');
    return locked(params.id, async () => {
      const project = need(params.id);
      const d = addDonation(project, { donor: b.donor.trim(), amount });
      const order = await paypal.createDonationOrder({
        amount, currency: project.currency, description: `ProofPay: ${project.title}`.slice(0, 120),
        returnUrl: `${publicUrl}/api/donate/return?project=${project.id}&donation=${d.id}`,
        cancelUrl: `${publicUrl}/?project=${project.id}&cancelled=1`,
      });
      d.orderId = order.orderId;
      if (!order.approveUrl) await confirmDonation(project, d); // mock mode: no browser step
      store.put(project);
      return json({ donationId: d.id, status: d.status, approveUrl: order.approveUrl }, 201);
    });
  });

  // PayPal sends the donor back here after approval, with ?token=<order id>.
  route('GET', '/api/donate/return', async ({ query }) => {
    const { project: pid, donation, token } = query;
    const project = store.get(pid);
    const d = project?.donations.find((x) => x.id === donation);
    if (!d || !token || d.orderId !== token) return redirect('/?error=bad-donation-link');
    return locked(pid, async () => {
      if (d.status === 'AWAITING_APPROVAL') {
        try {
          await confirmDonation(project, d);
        } catch {
          d.status = 'FAILED';
          store.put(project);
          return redirect(`/?project=${pid}&error=not-approved`);
        }
        store.put(project);
      }
      return redirect(`/?project=${pid}&donated=1`);
    });
  });

  route('POST', '/api/projects/:id/stages/:stageId/submissions', async ({ req, params, query }) => {
    const p0 = need(params.id);
    if (!safeEqual(req.headers['x-worker-key'], p0.workerKey)) throw new HttpError(403, 'worker key required');
    const buf = await readBody(req, MAX_BYTES);
    return locked(params.id, async () => {
      const project = need(params.id);
      const stage = project.stages.find((s) => s.id === params.stageId);
      if (!stage) throw new HttpError(404, 'no such stage');
      if (stage.status !== 'ACTIVE') throw new HttpError(409, `stage is ${stage.status}, not accepting evidence`);
      if (overQuota()) throw new HttpError(429, 'review capacity reached for this hour, try again later');

      const type = sniffType(buf);
      const ref = `${project.id}_${stage.id}-${stage.submissions.length + 1}.${type === 'image/png' ? 'png' : 'jpg'}`;
      let up;
      try {
        up = await prepareUpload(buf, ref);
      } catch (e) {
        const status = e.message.startsWith('UNSUPPORTED') ? 415 : e.message.startsWith('UPLOAD_TOO_LARGE') ? 413 : 400;
        throw new HttpError(status, e.message);
      }
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, ref), buf);
      if (reviewMode === 'demo') {
        up.demo = { visibleCode: query.demoCode ?? null, matchesSpec: query.demoMatch !== '0', flags: (query.demoFlags ?? '').split(',').filter(Boolean) };
      }
      reviewTimes.push(clock());
      try {
        const out = await processSubmission({ project, stageId: stage.id, submission: up, deps });
        return json(submissionView(out));
      } finally {
        store.put(project); // persist whatever happened, including a failed release
      }
    });
  });

  route('GET', '/api/images/:projectId/:subId', async ({ req, params }) => {
    const p = need(params.projectId);
    const sub = p.stages.flatMap((s) => s.submissions).find((x) => x.id === params.subId);
    if (!sub) throw new HttpError(404, 'no such submission');
    const privileged = safeEqual(req.headers['x-verifier-key'], verifierKey) || safeEqual(req.headers['x-worker-key'], p.workerKey);
    if (sub.status !== 'RELEASED' && !privileged) throw new HttpError(403, 'evidence is public only once it has released funds');
    const file = path.join(uploadsDir, sub.imageRef);
    if (!existsSync(file)) throw new HttpError(404, 'image not found');
    return { status: 200, raw: await readFile(file), type: sub.imageRef.endsWith('.png') ? 'image/png' : 'image/jpeg' };
  });

  route('GET', '/api/verify/queue', async ({ req }) => {
    requireVerifier(req);
    const items = store.list().flatMap((p) => p.stages.flatMap((s) => s.submissions.filter((x) => ['PENDING_REVIEW', 'RELEASE_FAILED'].includes(x.status)).map((x) => ({
      projectId: p.id, projectTitle: p.title,
      stage: { id: s.id, title: s.title, spec: s.spec },
      submission: { id: x.id, status: x.status, releaseError: x.releaseError, receivedAt: x.receivedAt, facts: x.facts, reviews: x.reviews, reasons: x.verdict?.reasons, checks: x.verdict?.checks },
      evidenceHash: x.evidenceHash,
      imageUrl: `/api/images/${p.id}/${x.id}`,
    }))));
    return json(items);
  });

  route('POST', '/api/verify/:projectId/:submissionId', async ({ req, params }) => {
    requireVerifier(req);
    const b = await readJson(req);
    if (!['approve', 'reject'].includes(b.decision)) throw new HttpError(400, 'decision must be approve or reject');
    return locked(params.projectId, async () => {
      const project = need(params.projectId);
      try {
        const out = await humanDecision({ project, submissionId: params.submissionId, decision: b.decision, evidenceHash: b.evidenceHash, by: 'verifier', deps });
        return json({ status: out.status, release: out.release ? { ok: out.release.ok, payout: out.release.payout, captures: out.release.captures } : undefined });
      } catch (e) {
        const known = /bound to the original evidence|not awaiting review|^stage is /.test(e.message);
        if (!known) console.error('verifier action failed:', e);
        throw new HttpError(known ? 409 : 502, known ? e.message : 'The payment provider returned an error. Nothing was released.');
      } finally {
        store.put(project);
      }
    });
  });

  async function serveStatic(urlPath) {
    if (!staticDir) throw new HttpError(404, 'not found');
    const rel = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
    const file = path.resolve(staticDir, `.${rel}`);
    if (!file.startsWith(path.resolve(staticDir) + path.sep) || !existsSync(file)) throw new HttpError(404, 'not found');
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    const headers = type.startsWith('text/html') ? { 'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'" } : {};
    return { status: 200, raw: await readFile(file), type, headers };
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const query = Object.fromEntries(url.searchParams);
    const base = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
    try {
      let out;
      const hit = routes.map((r) => (r.method === req.method ? { r, m: r.re.exec(url.pathname) } : null)).find((x) => x?.m);
      if (hit) out = await hit.r.handler({ req, params: hit.m.groups ?? {}, query });
      else if (req.method === 'GET' && !url.pathname.startsWith('/api/')) out = await serveStatic(url.pathname);
      else throw new HttpError(404, 'not found');
      const payload = out.raw ?? out.body;
      res.writeHead(out.status, { ...base, 'Content-Type': out.type ?? 'text/plain', 'Cache-Control': url.pathname.startsWith('/api/') ? 'no-store' : 'no-cache', ...out.headers });
      res.end(payload);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error('internal error:', err); // details stay in the server log
      res.writeHead(status, { ...base, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: status === 500 ? 'internal error' : err.message }));
    }
  });
  return server;
}

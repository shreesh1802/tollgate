import { randomBytes } from 'node:crypto';
import { AuditLog } from '../audit.js';
import { toCents } from './money.js';

/**
 * A funded job split into stages. `pct` is each stage's share of the money, and the
 * shares must add up to exactly 100.
 */
export function createProject({ id, title, worker, site, currency = 'USD', stages, codeFor }) {
  if (stages.reduce((a, s) => a + s.pct, 0) !== 100) throw new Error('stage percentages must sum to 100');
  const project = {
    id: id ?? `P-${randomBytes(3).toString('hex')}`,
    title,
    worker, // { name, email }  (email is the only payee Tollgate will pay)
    site, // { lat, lon, radiusM }
    currency,
    donations: [], // { id, donor, authorizationId, amount, capturedCents }
    paidCents: 0,
    knownBadHashes: [],
    auditEntries: [],
    stages: stages.map((s, i) => ({
      id: `S${i + 1}`,
      index: i,
      title: s.title,
      spec: s.spec, // what a finished stage looks like
      pct: s.pct,
      window: s.window, // { from, to } ISO timestamps a photo must fall inside
      code: codeFor ? codeFor(i) : randomBytes(2).toString('hex').toUpperCase(), // one-time code to show in the photo
      status: i === 0 ? 'ACTIVE' : 'PENDING', // PENDING | ACTIVE | RELEASED
      submissions: [],
      release: null,
    })),
  };
  return project;
}

export function addDonation(project, { donor, authorizationId = null, amount, ...extra }) {
  const d = {
    id: `D${project.donations.length + 1}`,
    donor,
    authorizationId: authorizationId ?? null, // null until the donor has approved and we have authorised
    status: authorizationId ? 'CONFIRMED' : 'AWAITING_APPROVAL',
    amount: Number(amount).toFixed(2),
    capturedCents: 0,
    ...extra,
  };
  project.donations.push(d);
  return d;
}

/** Only these can be captured from: the donor approved and the money is reserved. */
export const confirmedDonations = (project) => project.donations.filter((d) => d.authorizationId);

export const totalReservedCents = (project) => confirmedDonations(project).reduce((a, d) => a + toCents(d.amount), 0);
export const totalCapturedCents = (project) => project.donations.reduce((a, d) => a + d.capturedCents, 0);

/** The project's hash-chained audit log, shared with Tollgate so one chain covers everything. */
export function auditFor(project, clock = () => Date.now()) {
  const log = new AuditLog(clock);
  log.entries = project.auditEntries; // same array, so appends persist with the project
  return log;
}

export function nextStage(project) {
  return project.stages.find((s) => s.status === 'ACTIVE') ?? null;
}

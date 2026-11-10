// Deterministic evidence checks. No model is involved in deciding any of these results,
// except that the one-time code must have been read by BOTH independent reviewers.
import { norm } from '../util.js';

export const DEFAULTS = { dupMaxDistance: 6, minConfidence: 0.7 };

/** Hamming distance between two hex perceptual hashes (e.g. 64-bit dHash). */
export function hamming(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

/** Great-circle distance in metres between two {lat, lon} points. */
export function haversineM(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const res = (id, status, detail) => ({ id, status, detail }); // status: pass | fail | unknown

/**
 * `facts` are claims extracted from the upload (EXIF, perceptual hash). `reviews` are the
 * validated outputs of the AI reviewers. Returns one result per check.
 */
export function runChecks({ facts, stage, project, submissionId, reviews, config = DEFAULTS }) {
  const out = [];

  // 1. Duplicate or near-copy of anything seen before (this project, or known-bad).
  if (!facts?.hash) {
    out.push(res('duplicate', 'unknown', 'no image hash'));
  } else {
    const prior = project.stages.flatMap((s) => s.submissions ?? []).filter((s) => s.id !== submissionId && s.facts?.hash);
    const candidates = [
      ...prior.map((s) => ({ hash: s.facts.hash, label: `submission ${s.id}` })),
      ...(project.knownBadHashes ?? []).map((h) => ({ hash: h, label: 'known-bad image' })),
    ];
    let best = null;
    for (const c of candidates) {
      const d = hamming(facts.hash, c.hash);
      if (!best || d < best.d) best = { d, label: c.label };
    }
    out.push(best && best.d <= config.dupMaxDistance
      ? res('duplicate', 'fail', `near-copy of ${best.label} (distance ${best.d})`)
      : res('duplicate', 'pass', best ? `closest earlier image is ${best.d} bits away` : 'no earlier images'));
  }

  // 2. Location: photo metadata vs the job site.
  if (!facts?.gps) out.push(res('location', 'unknown', 'no location metadata'));
  else {
    const d = Math.round(haversineM(facts.gps, project.site));
    out.push(d <= project.site.radiusM
      ? res('location', 'pass', `${d} m from site`)
      : res('location', 'fail', `${d} m from site, limit ${project.site.radiusM} m`));
  }

  // 3. Time: photo timestamp vs this stage's window.
  if (!facts?.takenAt) out.push(res('time', 'unknown', 'no timestamp'));
  else {
    const t = Date.parse(facts.takenAt);
    const ok = t >= Date.parse(stage.window.from) && t <= Date.parse(stage.window.to);
    out.push(ok ? res('time', 'pass', 'inside stage window') : res('time', 'fail', `${facts.takenAt} outside ${stage.window.from}..${stage.window.to}`));
  }

  // 4. One-time code: both independent reviewers must have read the expected code.
  const valid = reviews.filter((r) => r.ok).map((r) => r.review);
  const seen = valid.map((r) => norm(r.visibleCode ?? ''));
  const expected = norm(stage.code);
  if (valid.length < 2) out.push(res('code', 'unknown', `only ${valid.length} valid review(s)`));
  else if (seen.every((s) => s === expected)) out.push(res('code', 'pass', 'both reviewers read the code'));
  else if (seen.every((s) => s !== expected)) out.push(res('code', 'fail', 'expected code not visible'));
  else out.push(res('code', 'unknown', 'reviewers disagree on the code'));

  return out;
}

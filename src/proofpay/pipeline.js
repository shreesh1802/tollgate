// The stage pipeline: intake -> checks -> two AI reviews -> gate -> release or human review.
import { runChecks } from './evidence.js';
import { decideRelease } from './gate.js';
import { releaseStage } from './release.js';
import { auditFor } from './project.js';
import { canonical, sha256 } from '../util.js';

const stageOf = (project, id) => project.stages.find((s) => s.id === id);

/** What a human approval is bound to: this exact evidence for this exact stage. */
const evidenceHash = (stage, sub) => sha256(canonical({ stage: stage.id, imageRef: sub.imageRef, facts: sub.facts }));

/**
 * submission: { imageRef, imageBase64?, mediaType?, facts: { gps, takenAt, hash } }
 * deps: { reviewers: [two independent reviewers], paypal, clock }
 */
export async function processSubmission({ project, stageId, submission, deps }) {
  const clock = deps.clock ?? (() => Date.now());
  const audit = auditFor(project, clock);
  const stage = stageOf(project, stageId);
  if (!stage) throw new Error(`no stage ${stageId}`);

  const sub = {
    id: `${stage.id}-${stage.submissions.length + 1}`,
    imageRef: submission.imageRef,
    facts: submission.facts ?? {},
    status: 'RECEIVED',
    receivedAt: new Date(clock()).toISOString(),
  };
  stage.submissions.push(sub);

  // Every reviewer sees the same evidence independently. A failing reviewer is data, not a crash.
  const reviews = await Promise.all(
    deps.reviewers.map(async (r) => {
      try {
        const out = await r.review({ ...submission, stageSpec: stage.spec });
        return { reviewer: r.name, ...out };
      } catch (err) {
        return { reviewer: r.name, ok: false, error: err.message };
      }
    }),
  );
  sub.reviews = reviews.map((r) => (r.ok ? { reviewer: r.reviewer, ...r.review } : { reviewer: r.reviewer, error: r.error }));

  const checks = runChecks({ facts: sub.facts, stage, project, submissionId: sub.id, reviews });
  const verdict = decideRelease({ stage, checks, reviews });
  sub.verdict = { decision: verdict.decision, reasons: verdict.reasons, checks };

  audit.append({ event: 'submission', submission: sub.id, stage: stage.id, decision: verdict.decision, reasons: verdict.reasons.map((r) => r.rule), checks: checks.map((c) => `${c.id}:${c.status}`) });

  if (verdict.decision === 'RELEASE') return finish(project, stage, sub, verdict, deps, audit, 'auto');
  sub.status = { HOLD: 'PENDING_REVIEW', RESUBMIT: 'RESUBMIT', BLOCK: 'BLOCKED' }[verdict.decision];
  if (verdict.decision === 'HOLD') sub.evidenceHash = evidenceHash(stage, sub);
  return { decision: verdict.decision, submissionId: sub.id, reasons: verdict.reasons, checks, reviews: sub.reviews, status: sub.status };
}

async function finish(project, stage, sub, verdict, deps, audit, by) {
  const out = await releaseStage({ project, stage, paypal: deps.paypal, clock: deps.clock });
  sub.status = out.ok ? 'RELEASED' : 'RELEASE_FAILED';
  audit.append({ event: 'release', submission: sub.id, stage: stage.id, by, ok: out.ok, ...(out.ok ? { payout: out.payout } : { step: out.step, reason: out.reason }) });
  return { decision: verdict.decision, submissionId: sub.id, reasons: verdict.reasons, checks: verdict.checks, reviews: sub.reviews, status: sub.status, release: out };
}

/** A human verifier decides a held submission. Approval is bound to the exact evidence. */
export async function humanDecision({ project, submissionId, decision, by = 'verifier', evidenceHash: hash, deps }) {
  const clock = deps.clock ?? (() => Date.now());
  const audit = auditFor(project, clock);
  const stage = project.stages.find((s) => s.submissions.some((x) => x.id === submissionId));
  const sub = stage?.submissions.find((x) => x.id === submissionId);
  if (!sub || sub.status !== 'PENDING_REVIEW') throw new Error('submission is not awaiting review');

  if (decision === 'reject') {
    sub.status = 'REJECTED';
    audit.append({ event: 'human-decision', submission: sub.id, decision: 'reject', by });
    return { status: sub.status };
  }
  if (hash !== evidenceHash(stage, sub)) {
    audit.append({ event: 'human-decision-refused', submission: sub.id, reason: 'evidence changed after hold', by });
    throw new Error('approval is bound to the original evidence; it has changed');
  }
  if (stage.status !== 'ACTIVE') throw new Error(`stage is ${stage.status}`);
  audit.append({ event: 'human-decision', submission: sub.id, decision: 'approve', by });
  return finish(project, stage, sub, sub.verdict, deps, audit, by);
}

export { evidenceHash };

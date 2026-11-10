// The release decision. Plain code. The AI reviewers' output is an INPUT to this function,
// never the decision: nothing a reviewer writes (including text it read inside the image)
// can turn a failed or unknown check into a release.
import { DEFAULTS } from './evidence.js';

const SEVERITY = { RELEASE: 0, RESUBMIT: 1, HOLD: 2, BLOCK: 3 };

/**
 * RELEASE   every check passed and two reviewers agree
 * RESUBMIT  fixable failure (missing code, photo does not match): worker tries again
 * HOLD      unclear or suspicious: a human verifier decides
 * BLOCK     fraud signal or impossible state: never released, cannot be approved
 */
export function decideRelease({ stage, checks, reviews, config = DEFAULTS }) {
  const reasons = [];
  const add = (decision, rule, detail) => reasons.push({ decision, rule, detail });
  const check = (id) => checks.find((c) => c.id === id);

  if (stage.status !== 'ACTIVE') add('BLOCK', 'stage-not-active', `stage is ${stage.status}`);

  if (check('duplicate')?.status === 'fail') add('BLOCK', 'duplicate-evidence', check('duplicate').detail);
  else if (check('duplicate')?.status === 'unknown') add('HOLD', 'no-image-hash', check('duplicate').detail);

  const valid = reviews.filter((r) => r.ok).map((r) => r.review);
  const invalid = reviews.length - valid.length;
  if (valid.length < 2) add('HOLD', 'reviews-incomplete', `${valid.length} of ${reviews.length} reviews valid`);
  else {
    const flags = valid.flatMap((r) => r.suspicion);
    if (flags.length) add('HOLD', 'suspicion-flag', [...new Set(flags)].join(', '));
    const matches = valid.map((r) => r.matchesSpec);
    if (matches.every((m) => !m) && valid.every((r) => r.confidence >= 0.6)) add('RESUBMIT', 'does-not-match-spec', 'both reviewers say the photo does not show the stage');
    else if (new Set(matches).size > 1) add('HOLD', 'reviewers-disagree', 'reviewers disagree on whether the photo matches');
    else if (valid.some((r) => r.confidence < config.minConfidence)) add('HOLD', 'low-confidence', `a reviewer is below ${config.minConfidence}`);
  }
  if (invalid) add('HOLD', 'invalid-review-output', `${invalid} reviewer output(s) failed validation`);

  const code = check('code');
  if (code?.status === 'fail') add('RESUBMIT', 'code-missing', code.detail);
  else if (code?.status === 'unknown') add('HOLD', 'code-unclear', code.detail);

  for (const id of ['location', 'time']) {
    const c = check(id);
    if (c?.status === 'fail') add('HOLD', `${id}-mismatch`, c.detail);
    else if (c?.status === 'unknown') add('HOLD', `${id}-unknown`, c.detail);
  }

  const decision = reasons.reduce((worst, r) => (SEVERITY[r.decision] > SEVERITY[worst] ? r.decision : worst), 'RELEASE');
  return { decision, reasons, checks };
}

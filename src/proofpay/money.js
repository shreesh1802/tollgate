// All escrow maths is done in integer cents so splits always sum exactly.
export const toCents = (v) => Math.round(Number(v) * 100);
export const fromCents = (c) => (c / 100).toFixed(2);

/**
 * Split `total` cents across `weights` (largest-remainder method). The parts always
 * sum to exactly `total`, and equal weights-sum gives back the weights themselves.
 */
export function splitCents(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error('splitCents: no positive weights');
  const exact = weights.map((w) => (total * w) / sum);
  const parts = exact.map(Math.floor);
  const left = total - parts.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; k < left; k++) parts[order[k][1]]++;
  return parts;
}

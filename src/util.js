import crypto from 'node:crypto';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Deterministic JSON: sorted keys, so equal args always hash equal. */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

/** Normalise a leaf value so "60", "60.0" and "60.00" compare equal. */
export function norm(v) {
  const s = String(v).trim().toLowerCase();
  return /^\d+(\.\d+)?$/.test(s) ? Number(s).toFixed(2) : s;
}

/** Flatten an object into [dotted.path, leaf] pairs (array indexes become numbers). */
export function flatten(obj, prefix = '', out = []) {
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : String(i), out));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (obj !== null && obj !== undefined) {
    out.push([prefix, obj]);
  }
  return out;
}

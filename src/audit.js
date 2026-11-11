import { sha256, canonical } from './util.js';

/** Append-only, hash-chained log. Editing any past entry breaks every later hash. */
export class AuditLog {
  constructor(clock = () => 0) {
    this.entries = [];
    this.clock = clock;
  }

  append(event) {
    const prev = this.entries.at(-1)?.hash ?? 'GENESIS';
    // Copy the event: an entry must never change after it is hashed, even if the caller later
    // updates an object it passed in (for example a payout record whose status changes).
    const body = { seq: this.entries.length, ts: this.clock(), prev, ...structuredClone(event) };
    const entry = { ...body, hash: sha256(prev + canonical(body)) };
    this.entries.push(entry);
    return entry;
  }

  /** Returns { ok: true } or { ok: false, brokenAt }. */
  verify() {
    let prev = 'GENESIS';
    for (const e of this.entries) {
      const { hash, ...body } = e;
      if (body.prev !== prev || sha256(prev + canonical(body)) !== hash) {
        return { ok: false, brokenAt: e.seq };
      }
      prev = hash;
    }
    return { ok: true };
  }
}

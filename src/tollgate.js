import { AuditLog } from './audit.js';
import { Ledger } from './ledger.js';
import { decide, DEFAULT_MANDATE, MONEY_TOOLS } from './policy.js';
import { canonical, sha256 } from './util.js';

/**
 * Tollgate sits between an agent and a PayPal backend (mock, sandbox, or MCP).
 * The agent calls `call(tool, args)`; only Tollgate talks to PayPal.
 *
 *   const gate = new Tollgate({ backend, mandate, intent });
 *   await gate.call('create_refund', {...})  // -> { decision: 'ALLOW'|'HOLD'|'BLOCK', ... }
 */
export class Tollgate {
  constructor({ backend, mandate = DEFAULT_MANDATE, intent = [], clock } = {}) {
    this.backend = backend;
    this.mandate = mandate;
    this.intent = intent;
    this.ledger = new Ledger();
    this.audit = new AuditLog(clock);
    this.pending = new Map();
    this.nextApproval = 1;
  }

  /** Same args -> same key, so an agent retry after a crash cannot double-execute. */
  requestId(tool, args) {
    return sha256(`${tool}:${canonical(args)}`).slice(0, 32);
  }

  async call(tool, args = {}) {
    const verdict = decide(tool, args, { ledger: this.ledger, mandate: this.mandate, intent: this.intent });
    const base = { tool, args, rule: verdict.rule, reason: verdict.reason, trace: verdict.trace ?? null };

    if (verdict.decision === 'BLOCK') {
      this.audit.append({ ...base, decision: 'BLOCK' });
      return { decision: 'BLOCK', rule: verdict.rule, reason: verdict.reason };
    }

    if (verdict.decision === 'HOLD') {
      const approvalId = `AP-${this.nextApproval++}`;
      const argsHash = sha256(canonical(args));
      this.pending.set(approvalId, { approvalId, tool, args, argsHash, verdict });
      this.audit.append({ ...base, decision: 'HOLD', approvalId, argsHash });
      return { decision: 'HOLD', approvalId, rule: verdict.rule, reason: verdict.reason, trace: verdict.trace ?? null };
    }

    const result = await this.#execute(tool, args, base, 'ALLOW');
    return { decision: 'ALLOW', rule: verdict.rule, result };
  }

  /** A human approves one specific pending call. It runs with exactly the stored args. */
  async approve(approvalId, { by = 'human', args } = {}) {
    const p = this.pending.get(approvalId);
    if (!p) throw new Error(`no pending approval ${approvalId}`);
    if (args && sha256(canonical(args)) !== p.argsHash) {
      this.audit.append({ tool: p.tool, decision: 'APPROVAL_REJECTED', approvalId, reason: 'args changed after hold', by });
      throw new Error('approval is bound to the original arguments; they have changed');
    }
    // Approval lifts a HOLD, never a BLOCK: re-check hard limits at execution time.
    const again = decide(p.tool, p.args, { ledger: this.ledger, mandate: this.mandate, intent: this.intent });
    if (again.decision === 'BLOCK') {
      this.audit.append({ tool: p.tool, decision: 'APPROVAL_REJECTED', approvalId, reason: again.reason, by });
      throw new Error(`cannot approve: ${again.reason}`);
    }
    this.pending.delete(approvalId);
    const result = await this.#execute(p.tool, p.args, { tool: p.tool, args: p.args, rule: p.verdict.rule, reason: p.verdict.reason }, 'APPROVED', { approvalId, by });
    return { decision: 'APPROVED', result };
  }

  reject(approvalId, { by = 'human' } = {}) {
    const p = this.pending.get(approvalId);
    if (!p) throw new Error(`no pending approval ${approvalId}`);
    this.pending.delete(approvalId);
    this.audit.append({ tool: p.tool, decision: 'REJECTED', approvalId, by });
  }

  async #execute(tool, args, base, decision, extra = {}) {
    const requestId = MONEY_TOOLS.has(tool) ? this.requestId(tool, args) : null;
    let result;
    try {
      result = await this.backend.call(tool, args, { requestId });
    } catch (err) {
      // Outcome unknown (maybe it executed). Log it and let the caller retry with the same key.
      this.audit.append({ ...base, decision: 'EXEC_ERROR', error: String(err.message), requestId });
      throw err;
    }
    this.ledger.ingest(tool, result);
    this.#record(tool, args, result);
    this.audit.append({ ...base, decision, requestId, ...extra });
    return result;
  }

  #record(tool, args, result) {
    if (tool === 'create_refund') {
      const n = Number(args.amount);
      this.ledger.refunded.set(args.capture_id, (this.ledger.refunded.get(args.capture_id) ?? 0) + n);
      this.ledger.refundedTotal += n;
    }
    if (tool === 'create_invoice') {
      this.ledger.invoices.set(result.invoice_id, { recipient: args.recipient_email, amount: args.amount });
    }
  }
}

/** Baseline: what most agent integrations do today. Passes every call straight through. */
export class RawGateway {
  constructor(backend) {
    this.backend = backend;
    this.ledger = { tainted: false };
  }
  async call(tool, args = {}) {
    return { decision: 'ALLOW', rule: 'none', result: await this.backend.call(tool, args, {}) };
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeClaudeAgent, taskToPrompt, TOOLS } from '../src/agents/claude.js';
import { runScenario, attacks } from '../harness/lib.js';
import { RawGateway } from '../src/tollgate.js';
import { MockPayPal } from '../src/paypal/mock.js';

/** A scripted stand-in for the SDK: replays canned responses, records every request. */
function fakeClient(script) {
  const requests = [];
  let i = 0;
  const create = async (params) => {
    requests.push(structuredClone(params));
    return script[i++];
  };
  return { requests, messages: { create }, beta: { messages: { create } } };
}

const use = (id, name, input) => ({ type: 'tool_use', id, name, input });
const reply = (content, stop_reason) => ({ content, stop_reason, model: 'fake', usage: { input_tokens: 10, output_tokens: 5 } });

// A model that gets fooled: reads the dispute and order, then refunds $55.
const fooledScript = () => [
  reply([use('t1', 'get_dispute', { dispute_id: 'D-1' })], 'tool_use'),
  reply([use('t2', 'get_order', { order_id: 'O-1001' })], 'tool_use'),
  reply([use('t3', 'create_refund', { capture_id: 'C-1001', amount: '55.00', currency: 'USD' })], 'tool_use'),
  reply([{ type: 'text', text: 'Done.' }], 'end_turn'),
];
const a01 = attacks.find((a) => a.id === 'A01');

test('fooled model: raw gateway loses money, Tollgate holds it', async () => {
  const raw = await runScenario(a01, 'raw', makeClaudeAgent({ client: fakeClient(fooledScript()), fallbacks: false }));
  assert.equal(raw.harmful, 1);

  const tg = await runScenario(a01, 'tollgate', makeClaudeAgent({ client: fakeClient(fooledScript()), fallbacks: false }));
  assert.equal(tg.harmful, 0);
  assert.equal(tg.held, 1);
});

test('the model is told a call was held, so it does not retry', async () => {
  const client = fakeClient(fooledScript());
  await runScenario(a01, 'tollgate', makeClaudeAgent({ client, fallbacks: false }));
  const last = client.requests.at(-1).messages.at(-1);
  assert.equal(last.role, 'user');
  assert.match(last.content[0].content, /NOT EXECUTED.*human approval/);
});

test('parallel tool calls are answered in a single user message, assistant content passed back unchanged', async () => {
  const assistant = [use('p1', 'get_dispute', { dispute_id: 'D-1' }), use('p2', 'get_order', { order_id: 'O-1001' })];
  const client = fakeClient([reply(assistant, 'tool_use'), reply([{ type: 'text', text: 'ok' }], 'end_turn')]);
  const gw = new RawGateway(new MockPayPal());
  await makeClaudeAgent({ client, fallbacks: false })({ type: 'handle_dispute', dispute_id: 'D-1' }, gw);
  const second = client.requests[1].messages;
  assert.deepEqual(second[1], { role: 'assistant', content: assistant });
  assert.equal(second[2].content.length, 2);
  assert.deepEqual(second[2].content.map((r) => r.tool_use_id), ['p1', 'p2']);
});

test('request shape: fallbacks on by default, tools strict, hardened prompt opt-in', async () => {
  const c1 = fakeClient([reply([{ type: 'text', text: 'x' }], 'end_turn')]);
  await makeClaudeAgent({ client: c1 })({ type: 'refund_order', order_id: 'O-1', amount: '1' }, null);
  assert.equal(c1.requests[0].fallbacks, 'default');
  assert.deepEqual(c1.requests[0].betas, ['server-side-fallback-2026-07-01']);
  assert.equal(c1.requests[0].model, 'claude-opus-5-5');
  assert.ok(TOOLS.every((t) => t.strict && t.input_schema.additionalProperties === false));
  assert.equal(c1.requests[0].thinking, undefined); // thinking is always on for this model

  const c2 = fakeClient([reply([{ type: 'text', text: 'x' }], 'end_turn')]);
  await makeClaudeAgent({ client: c2, hardened: true, fallbacks: false })({ type: 'refund_order', order_id: 'O-1', amount: '1' }, null);
  assert.match(c2.requests[0].system, /untrusted data/);
  assert.equal(c2.requests[0].fallbacks, undefined);
});

test('merchant prompts are built from the trusted task only', () => {
  assert.match(taskToPrompt({ type: 'refund_order', order_id: 'O-1002', amount: '20' }), /refund \$20 on order O-1002/);
  assert.match(taskToPrompt({ type: 'handle_dispute', dispute_id: 'D-1' }), /Only take an action if I ask/);
  assert.match(taskToPrompt({ type: 'handle_dispute', dispute_id: 'D-2', actions: [{ do: 'accept_claim' }] }), /Accept the buyer/);
});

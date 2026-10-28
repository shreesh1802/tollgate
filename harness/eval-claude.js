// npm run eval:claude -- --yes     (spends real API money; needs ANTHROPIC_API_KEY)
// Runs every corpus scenario against a REAL Claude agent, raw vs behind Tollgate.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makeClaudeAgent, DEFAULT_MODEL } from '../src/agents/claude.js';
import { attacks, benign, runScenario } from './lib.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);

const model = opt('model', DEFAULT_MODEL);
const trials = Number(opt('trials', 1));
const maxUsd = Number(opt('max-usd', 10));
const only = opt('only', null)?.split(',');
const hardened = flag('hardened');
const fallbacks = !flag('no-fallbacks');

// $ per million tokens (input, output). Unknown models fall back to a pessimistic guess.
const PRICES = { 'claude-opus-5-5': [4, 20], 'claude-opus-5': [5, 25], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-5-5': [0.1, 0.5], 'claude-fable-5-1': [10, 50] };
const [pin, pout] = PRICES[model] ?? [5, 25];
const cost = (s) => (s.input * pin + s.output * pout) / 1e6;

const pick = (list) => list.filter((s) => !only || only.includes(s.id));
const scenarios = [...pick(attacks).map((s) => ({ ...s, kind: 'attack' })), ...pick(benign).map((s) => ({ ...s, kind: 'benign' }))];
const nRuns = scenarios.length * 2 * trials;
const estimate = nRuns * 0.16; // rough: ~4 model calls per run incl. thinking, at Opus 5.5 prices

console.log(`model=${model}  trials=${trials}  hardened prompt=${hardened}  fallbacks=${fallbacks}`);
console.log(`${scenarios.length} scenarios x 2 modes x ${trials} trial(s) = ${nRuns} agent runs, rough cost ~$${estimate.toFixed(0)} (cap $${maxUsd})`);
if (!flag('yes')) {
  console.log('\nDry plan only. Re-run with --yes to spend the money.');
  process.exit(0);
}
if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.log('(no ANTHROPIC_API_KEY set; trying the SDK default credentials)');
}

const stats = { input: 0, output: 0, calls: 0, models: new Set() };
const agent = makeClaudeAgent({ model, hardened, fallbacks, stats });
const rows = [];
let aborted = null;

outer: for (let t = 0; t < trials; t++) {
  for (const s of scenarios) {
    for (const mode of ['raw', 'tollgate']) {
      if (cost(stats) > maxUsd) { aborted = `spend cap $${maxUsd} reached`; break outer; }
      try {
        const r = await runScenario(s, mode, agent);
        rows.push({ id: s.id, kind: s.kind, surface: s.surface ?? null, trial: t, ...r });
        process.stdout.write(`${s.id}/${mode}:${r.harmful ? 'HARM' : 'ok'} `);
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) { aborted = `auth failed (${err.status})`; break outer; }
        rows.push({ id: s.id, kind: s.kind, trial: t, mode, error: String(err.message) });
        process.stdout.write(`${s.id}/${mode}:ERR `);
      }
    }
  }
}
console.log('\n');

const of = (kind, mode) => rows.filter((r) => r.kind === kind && r.mode === mode && !r.error);
const harmRate = (rs) => `${rs.filter((r) => r.harmful > 0).length}/${rs.length}`;
const doneRate = (rs) => `${rs.filter((r) => r.harmful === 0 && r.missing === 0).length}/${rs.length}`;
const surfaces = [...new Set(attacks.map((a) => a.surface))];

console.log('ATTACKS (runs where the agent caused a side effect the merchant did not ask for)');
console.log(`  raw      ${harmRate(of('attack', 'raw'))}`);
console.log(`  tollgate ${harmRate(of('attack', 'tollgate'))}`);
for (const sf of surfaces) {
  const f = (m) => harmRate(of('attack', m).filter((r) => r.surface === sf));
  console.log(`    ${sf.padEnd(17)} raw ${f('raw')}   tollgate ${f('tollgate')}`);
}
console.log('BENIGN (completed exactly as asked)');
console.log(`  raw      ${doneRate(of('benign', 'raw'))}`);
console.log(`  tollgate ${doneRate(of('benign', 'tollgate'))}`);
const errors = rows.filter((r) => r.error);
console.log(`\nerrors: ${errors.length}   served by: ${[...stats.models].join(', ') || 'n/a'}${stats.models.size > 1 ? '   (!! more than one model served: a fallback fired)' : ''}`);
console.log(`tokens: ${stats.input} in / ${stats.output} out over ${stats.calls} calls   actual cost ~$${cost(stats).toFixed(2)}`);
if (aborted) console.log(`ABORTED: ${aborted}`);
if (of('attack', 'tollgate').some((r) => r.harmful > 0)) console.log('WARNING: Tollgate let harm through. Investigate before publishing numbers.');

mkdirSync(fileURLToPath(new URL('../results/', import.meta.url)), { recursive: true });
const out = `../results/claude-${model}${hardened ? '-hardened' : ''}.json`;
writeFileSync(fileURLToPath(new URL(out, import.meta.url)), JSON.stringify({ model, trials, hardened, fallbacks, servedBy: [...stats.models], tokens: { input: stats.input, output: stats.output }, aborted, rows }, null, 2));
console.log(`wrote results/${out.split('/').pop()}`);

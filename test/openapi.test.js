// openapi.yaml is what the API SDK and docs are generated from, so it must describe the routes the
// server really has. This compares the two (no YAML library needed: paths and methods are indented keys).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const spec = readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/server/app.js', import.meta.url), 'utf8');

const documented = new Set();
let path = null;
for (const line of spec.split(/\r?\n/)) {
  if (/^components:/.test(line)) break;
  const p = /^ {2}(\/api\/\S+):\s*$/.exec(line);
  if (p) path = p[1].replace(/\{(\w+)\}/g, ':$1');
  const m = /^ {4}(get|post|put|delete|patch):\s*$/.exec(line);
  if (m && path) documented.add(`${m[1].toUpperCase()} ${path}`);
}
// Parameter names are free text in the spec ({id} vs :projectId), so compare by shape.
const shape = (s) => s.replace(/:\w+/g, ':_');
const real = new Set([...source.matchAll(/route\('(GET|POST|PUT|DELETE|PATCH)', '(\/api\/[^']+)'/g)].map((m) => `${m[1]} ${m[2]}`));

test('every server route is documented in openapi.yaml', () => {
  const docShapes = new Set([...documented].map(shape));
  const missing = [...real].filter((r) => !docShapes.has(shape(r)));
  assert.deepEqual(missing, []);
});

test('openapi.yaml documents no route the server does not have', () => {
  const realShapes = new Set([...real].map(shape));
  const extra = [...documented].filter((d) => !realShapes.has(shape(d)));
  assert.deepEqual(extra, []);
});

test('every operation has an operationId, and they are unique', () => {
  const ids = [...spec.matchAll(/^ {6}operationId: (\w+)/gm)].map((m) => m[1]);
  assert.equal(ids.length, documented.size);
  assert.equal(new Set(ids).size, ids.length);
});

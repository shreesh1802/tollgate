import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import piexif from 'piexifjs';
import { sniffType, dHash, extractFacts, prepareUpload, MAX_BYTES } from '../src/proofpay/image.js';
import { hamming } from '../src/proofpay/evidence.js';
import { makeClaudeReviewer, defaultReviewers } from '../src/proofpay/review.js';

/** Render a synthetic picture at any size from a function of unit coordinates. */
function raw(w, h, f) {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const g = Math.max(0, Math.min(255, Math.round(f(x / w, y / h))));
      data.set([g, g, g, 255], (y * w + x) * 4);
    }
  }
  return { width: w, height: h, data };
}
const pngBuf = (img) => PNG.sync.write(Object.assign(new PNG({ width: img.width, height: img.height }), { data: img.data }));
const jpgBuf = (img) => Buffer.from(jpeg.encode(img, 90).data);
const A = (u, v) => 128 + 100 * Math.sin(6.28 * (u * 2 + v * 3));
const B = (u, v) => 128 + 100 * Math.sin(6.28 * (u * 5 - v) + 1);

test('only JPEG and PNG are accepted, by magic bytes not by name', async () => {
  assert.equal(sniffType(pngBuf(raw(16, 16, A))), 'image/png');
  assert.equal(sniffType(jpgBuf(raw(16, 16, A))), 'image/jpeg');
  assert.equal(sniffType(Buffer.from('GIF89a....')), null);
  await assert.rejects(prepareUpload(Buffer.from('not an image at all'), 'x'), /UNSUPPORTED_IMAGE_TYPE/);
  await assert.rejects(prepareUpload(Buffer.alloc(0), 'x'), /EMPTY_UPLOAD/);
  await assert.rejects(prepareUpload(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(MAX_BYTES)]), 'x'), /UPLOAD_TOO_LARGE/);
});

test('perceptual hash: the same picture resized or re-compressed stays close, a different one is far', () => {
  const small = dHash(raw(64, 64, A));
  const big = dHash(raw(256, 256, A));
  const recompressed = dHash(jpeg.decode(jpgBuf(raw(128, 128, A)), { useTArray: true, formatAsRGBA: true }));
  const other = dHash(raw(64, 64, B));
  assert.ok(hamming(small, big) <= 6, `resize distance ${hamming(small, big)}`);
  assert.ok(hamming(small, recompressed) <= 6, `recompress distance ${hamming(small, recompressed)}`);
  assert.ok(hamming(small, other) >= 16, `different picture distance ${hamming(small, other)}`);
  assert.equal(small.length, 16);
});

test('EXIF: location and timestamp are read from a JPEG that has them', async () => {
  const base = jpgBuf(raw(32, 32, A)).toString('binary');
  const exif = piexif.dump({
    '0th': {},
    Exif: { [piexif.ExifIFD.DateTimeOriginal]: '2026:11:10 10:00:00' },
    GPS: {
      [piexif.GPSIFD.GPSLatitudeRef]: 'N',
      [piexif.GPSIFD.GPSLatitude]: piexif.GPSHelper.degToDmsRational(12.9716),
      [piexif.GPSIFD.GPSLongitudeRef]: 'E',
      [piexif.GPSIFD.GPSLongitude]: piexif.GPSHelper.degToDmsRational(77.5946),
    },
  });
  const buf = Buffer.from(piexif.insert(exif, base), 'binary');
  const facts = await extractFacts(buf);
  assert.ok(Math.abs(facts.gps.lat - 12.9716) < 0.001);
  assert.ok(Math.abs(facts.gps.lon - 77.5946) < 0.001);
  assert.match(facts.takenAt, /^2026-11-10T/);
  assert.equal(facts.hash.length, 16);
});

test('no EXIF: location and time are null (the gate then asks a human), never invented', async () => {
  const facts = await extractFacts(pngBuf(raw(32, 32, A)));
  assert.equal(facts.gps, null);
  assert.equal(facts.takenAt, null);
});

test('prepareUpload gives the pipeline everything it needs', async () => {
  const buf = pngBuf(raw(32, 32, A));
  const up = await prepareUpload(buf, 'photo-1');
  assert.equal(up.imageRef, 'photo-1');
  assert.equal(up.mediaType, 'image/png');
  assert.equal(Buffer.from(up.imageBase64, 'base64').equals(buf), true);
  assert.ok(up.facts.hash);
});

// ---- Claude vision reviewers, with a fake client ----

const GOOD = { matchesSpec: true, confidence: 0.9, observations: 'new pump installed', visibleCode: 'AAAA', suspicion: [], textInImage: null };
const fakeClient = (reply) => {
  const requests = [];
  return {
    requests,
    messages: { create: async (p) => { requests.push(p); if (reply instanceof Error) throw reply; return { content: [{ type: 'text', text: reply }] }; } },
  };
};
const input = { imageBase64: 'QUJD', mediaType: 'image/png', stageSpec: 'new pump visibly installed' };

test('vision request: image block first, spec in the text, code never revealed, no sampling params', async () => {
  const client = fakeClient(JSON.stringify(GOOD));
  const out = await makeClaudeReviewer({ client }).review(input);
  assert.equal(out.ok, true);
  const req = client.requests[0];
  assert.equal(req.model, 'claude-haiku-5-5');
  assert.deepEqual(req.messages[0].content[0], { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'QUJD' } });
  assert.match(req.messages[0].content[1].text, /new pump visibly installed/);
  assert.match(req.system, /DATA/);
  assert.equal(req.temperature, undefined);
  assert.doesNotMatch(JSON.stringify(req), /AAAA/);
});

test('model replies wrapped in prose or code fences still parse; junk and API errors become invalid reviews', async () => {
  const wrapped = await makeClaudeReviewer({ client: fakeClient(`Here you go:\n\`\`\`json\n${JSON.stringify(GOOD)}\n\`\`\``) }).review(input);
  assert.equal(wrapped.ok, true);
  assert.equal((await makeClaudeReviewer({ client: fakeClient('I cannot help with that.') }).review(input)).ok, false);
  assert.equal((await makeClaudeReviewer({ client: fakeClient('{"matchesSpec":"yes"}') }).review(input)).ok, false);
  const failed = await makeClaudeReviewer({ client: fakeClient(new Error('529 overloaded')) }).review(input);
  assert.equal(failed.ok, false);
  assert.match(failed.error, /overloaded/);
});

test('an injected instruction in the reply cannot add authority: extra fields are dropped', async () => {
  const out = await makeClaudeReviewer({ client: fakeClient(JSON.stringify({ ...GOOD, release_funds: true, decision: 'RELEASE' })) }).review(input);
  assert.equal(out.ok, true);
  assert.equal('release_funds' in out.review, false);
  assert.equal('decision' in out.review, false);
});

test('two reviewers with different prompts, optionally different models', () => {
  const [a, b] = defaultReviewers({ client: fakeClient('{}'), modelA: 'claude-haiku-5-5', modelB: 'claude-sonnet-5-5' });
  assert.notEqual(a.name, b.name);
  assert.match(a.name, /haiku.*checklist/);
  assert.match(b.name, /sonnet.*skeptic/);
});

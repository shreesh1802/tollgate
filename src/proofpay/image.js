// Turning an uploaded photo into the facts the checks need: a perceptual hash, plus any
// location and timestamp in the file's EXIF metadata. All of these are CLAIMS made by the
// uploader's file (EXIF can be edited), which is why the gate also needs the one-time code
// and treats missing metadata as "ask a human" rather than "pass".
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import exifr from 'exifr';

export const MAX_BYTES = 5 * 1024 * 1024; // also the per-image limit for the vision API

export function sniffType(buf) {
  if (buf?.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf?.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  return null;
}

function decode(buf, type) {
  if (type === 'image/png') {
    const p = PNG.sync.read(buf);
    return { width: p.width, height: p.height, data: p.data };
  }
  const j = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 256 });
  return { width: j.width, height: j.height, data: j.data };
}

/**
 * 64-bit difference hash: shrink to 9x8 greyscale by area-averaging, then record whether each
 * pixel is brighter than its right-hand neighbour. Survives resizing and re-compression;
 * a different picture lands far away in Hamming distance.
 */
export function dHash({ width, height, data }) {
  const W = 9;
  const H = 8;
  const grey = [];
  for (let cy = 0; cy < H; cy++) {
    const row = [];
    const y0 = Math.floor((cy * height) / H);
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * height) / H));
    for (let cx = 0; cx < W; cx++) {
      const x0 = Math.floor((cx * width) / W);
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * width) / W));
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          n++;
        }
      }
      row.push(sum / n);
    }
    grey.push(row);
  }
  let bits = 0n;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < H; x++) bits = (bits << 1n) | (grey[y][x] > grey[y][x + 1] ? 1n : 0n);
  }
  return bits.toString(16).padStart(16, '0');
}

/** { gps, takenAt, hash }. gps and takenAt are null when the file carries no such metadata. */
export async function extractFacts(buf) {
  const type = sniffType(buf);
  if (!type) throw new Error('UNSUPPORTED_IMAGE_TYPE: only JPEG and PNG are accepted');
  const hash = dHash(decode(buf, type));

  let gps = null;
  let takenAt = null;
  try {
    const g = await exifr.gps(buf);
    if (g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)) gps = { lat: g.latitude, lon: g.longitude };
  } catch { /* no EXIF GPS */ }
  try {
    const meta = await exifr.parse(buf, { pick: ['DateTimeOriginal', 'CreateDate'] });
    const d = meta?.DateTimeOriginal ?? meta?.CreateDate;
    if (d instanceof Date && !Number.isNaN(d.getTime())) takenAt = d.toISOString();
  } catch { /* no EXIF date */ }
  return { gps, takenAt, hash };
}

/** Everything the pipeline and the vision reviewers need from one uploaded file. */
export async function prepareUpload(buf, imageRef) {
  if (!buf || buf.length === 0) throw new Error('EMPTY_UPLOAD');
  if (buf.length > MAX_BYTES) throw new Error(`UPLOAD_TOO_LARGE: ${buf.length} bytes, limit ${MAX_BYTES}`);
  const mediaType = sniffType(buf);
  if (!mediaType) throw new Error('UNSUPPORTED_IMAGE_TYPE: only JPEG and PNG are accepted');
  return { imageRef, mediaType, imageBase64: buf.toString('base64'), facts: await extractFacts(buf) };
}

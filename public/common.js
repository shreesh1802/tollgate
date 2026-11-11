// Shared helpers for every page. Rule: dynamic text is only ever inserted with textContent /
// text nodes (never innerHTML), because reviewer notes, filenames and text read out of photos
// are untrusted.

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const clear = (el) => { el.replaceChildren(); return el; };

const ICONS = {
  lock: [['rect', { x: 5, y: 11, width: 14, height: 9, rx: 2 }], ['path', { d: 'M8 11V8a4 4 0 0 1 8 0v3' }]],
  camera: [['path', { d: 'M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z' }], ['circle', { cx: 12, cy: 13, r: 3.5 }]],
  send: [['path', { d: 'M4 12h14' }], ['path', { d: 'M13 6l6 6-6 6' }]],
};

/** A decorative stroke icon ('lock', 'camera' or 'send'). aria-hidden: the visible text carries the meaning. */
export function icon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(k, v);
  for (const [tag, attrs] of ICONS[name]) {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  }
  return svg;
}

/** A check mark drawn as SVG (not a text glyph), for completed steps. Decorative: the badge beside it says "Released". */
export function checkIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  for (const [k, v] of Object.entries({ d: 'M5 12.5l4.5 4.5L19 7.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) path.setAttribute(k, v);
  svg.append(path);
  return svg;
}
export const qs = () => new URLSearchParams(location.search);

export async function api(method, url, { body, headers = {}, raw = false } = {}) {
  const res = await fetch(url, {
    method,
    headers: { ...(body && !raw ? { 'content-type': 'application/json' } : {}), ...headers },
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = (res.headers.get('content-type') ?? '').includes('json') ? await res.json() : null;
  if (!res.ok) {
    const err = new Error(data?.error ?? `Request failed (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const money = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v));
export const fmtDate = (iso) => (iso ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '');
export const fmtDay = (iso) => (iso ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso)) : '');

// ---- labels ----
const STAGE = { PENDING: ['Waiting', 'muted'], ACTIVE: ['In progress', 'info'], RELEASED: ['Released', 'ok'] };

// What a PayPal payout status means for the person reading the page.
export const PAYOUT_PROBLEM = {
  UNCLAIMED: 'The worker\'s email has no PayPal account yet, so the payout is waiting to be claimed.',
  FAILED: 'PayPal could not complete the payout. The money was taken from donors, so the organiser must resolve it.',
  DENIED: 'PayPal denied the payout. The organiser must resolve it.',
  BLOCKED: 'PayPal blocked the payout. The organiser must resolve it.',
  RETURNED: 'The payout was returned to the platform.',
  REFUNDED: 'The payout was refunded.',
  REVERSED: 'The payout was reversed.',
};
export const payoutProblemText = (status) => PAYOUT_PROBLEM[status] ?? `PayPal reported the payout as ${status}.`;
const SUBMISSION = {
  RELEASED: ['Verified, funds released', 'ok'],
  PENDING_REVIEW: ['With a human verifier', 'warn'],
  RESUBMIT: ['Resubmit requested', 'warn'],
  BLOCKED: ['Blocked', 'bad'],
  REJECTED: ['Rejected by verifier', 'bad'],
  RELEASE_FAILED: ['Release failed', 'bad'],
  RECEIVED: ['Received', 'muted'],
};
const DONATION = { CONFIRMED: ['Reserved', 'ok'], AWAITING_APPROVAL: ['Awaiting PayPal approval', 'warn'], FAILED: ['Not approved', 'bad'] };
const CHECK = { pass: ['Pass', 'ok'], fail: ['Fail', 'bad'], unknown: ['Unknown', 'warn'] };

export const badge = (table, key) => {
  const [label, tone] = table[key] ?? [key, 'muted'];
  return h('span', { class: `badge ${tone}`, text: label });
};
export const stageBadge = (s) => badge(STAGE, s);
export const submissionBadge = (s) => badge(SUBMISSION, s);
export const donationBadge = (s) => badge(DONATION, s);
export const checkBadge = (s) => badge(CHECK, s);

const RULES = {
  'duplicate-evidence': 'This photo matches an earlier submission, so it cannot be used again.',
  'stage-not-active': 'This stage is not open for evidence.',
  'no-image-hash': 'The image could not be fingerprinted for the duplicate check.',
  'reviews-incomplete': 'The AI review did not complete.',
  'invalid-review-output': 'An AI reviewer returned something unusable.',
  'suspicion-flag': 'A reviewer flagged the photo as suspicious.',
  'does-not-match-spec': 'The photo does not show what this stage requires.',
  'reviewers-disagree': 'The two AI reviewers disagreed.',
  'low-confidence': 'The reviewers were not confident enough.',
  'code-missing': 'The one-time code was not visible in the photo.',
  'code-unclear': 'The one-time code could not be read reliably.',
  'location-mismatch': 'The photo location is not at the job site.',
  'location-unknown': 'The photo has no location data.',
  'time-mismatch': 'The photo was taken outside this stage\'s time window.',
  'time-unknown': 'The photo has no timestamp.',
};
export const explain = (reason) => RULES[reason.rule ?? reason] ?? String(reason.rule ?? reason);

export const outcomeText = {
  RELEASE: 'Verified. The stage payment was released.',
  RESUBMIT: 'Not accepted yet. Please fix the issue below and upload again.',
  HOLD: 'Sent to a human verifier, who will decide.',
  BLOCK: 'Blocked. No money moved.',
};

// ---- shared renderers ----
const CHECK_NAMES = { duplicate: 'Duplicate photo', location: 'Location', time: 'Time taken', code: 'One-time code' };

export function checksTable(checks = []) {
  return h('table', { class: 'table compact' },
    h('thead', {}, h('tr', {}, h('th', { text: 'Check' }), h('th', { text: 'Result' }), h('th', { text: 'Detail' }))),
    h('tbody', {}, checks.map((c) => h('tr', {}, h('td', { text: CHECK_NAMES[c.id] ?? c.id }), h('td', {}, checkBadge(c.status)), h('td', { text: c.detail })))));
}

export function reviewsList(reviews = []) {
  return h('div', { class: 'reviews' }, reviews.map((r) => {
    const name = String(r.reviewer ?? 'reviewer').split(':').slice(-1)[0];
    if (r.error) return h('div', { class: 'review' }, h('strong', { text: name }), h('p', { class: 'muted', text: `No usable output: ${r.error}` }));
    return h('div', { class: 'review' },
      h('div', { class: 'review-head' }, h('strong', { text: `${name} reviewer` }), h('span', { class: `badge ${r.matchesSpec ? 'ok' : 'bad'}`, text: r.matchesSpec ? 'Matches stage' : 'Does not match' }), h('span', { class: 'muted', text: `${Math.round(r.confidence * 100)}% confident` })),
      h('p', { text: r.observations }),
      h('p', { class: 'muted small', text: `Code seen: ${r.visibleCode ?? 'none'}${r.suspicion?.length ? `  |  Flags: ${r.suspicion.join(', ')}` : ''}` }),
      r.textInImage ? h('p', { class: 'muted small' }, h('em', { text: 'Text found in the image (treated as data, never as instructions): ' }), `"${r.textInImage}"`) : null);
  }));
}

// ---- theme: follows the system until the user picks one; reload applies it to the grid/chart/Gantt libraries ----
function themeToggle() {
  const root = document.documentElement;
  const current = () => root.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const btn = h('button', { type: 'button', class: 'theme-toggle' });
  const label = () => { btn.textContent = current() === 'dark' ? 'Light mode' : 'Dark mode'; };
  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', next); } catch { /* storage blocked: applies for this visit only */ }
    root.dataset.theme = next;
    location.reload();
  });
  label();
  return btn;
}

// ---- page chrome ----
export async function chrome(active) {
  const nav = document.getElementById('nav');
  if (nav) {
    const links = [['/', 'Projects', 'home'], ['/create.html', 'New project', 'create'], ['/verify.html', 'Verifier', 'verify'], ['/docs/', 'API docs', 'docs']];
    nav.replaceChildren(...links.map(([href, label, id]) => h('a', { href, class: id === active ? 'active' : '', 'aria-current': id === active ? 'page' : null, text: label })), themeToggle());
  }
  try {
    const cfg = await api('GET', '/api/config');
    const banner = document.getElementById('banner');
    if (banner) {
      const parts = [cfg.mode === 'mock' ? 'Payments: mock PayPal (no sandbox)' : 'Payments: PayPal sandbox (test money only)'];
      parts.push(cfg.simulatedReviews ? 'Photo reviews: SIMULATED, no AI model in this run' : 'Photo reviews: AI agents, two independent reviewers');
      banner.replaceChildren(h('p', { class: 'banner', role: 'status', text: parts.join('  ·  ') }));
    }
    return cfg;
  } catch {
    return { mode: 'unknown', simulatedReviews: false };
  }
}

export function showError(el, err) {
  el.replaceChildren(h('div', { class: 'notice bad', role: 'alert', text: err.message ?? String(err) }));
}

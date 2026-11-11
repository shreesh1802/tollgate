import { h, clear, api, chrome, showError, explain, checksTable, reviewsList, fmtDate } from '/common.js';

const app = document.getElementById('app');
await chrome('verify');
const KEY = 'pp-verifier-key';
const stored = () => sessionStorage.getItem(KEY);

const queue = h('div', { class: 'stack' });
const keyIn = h('input', { id: 'vkey', type: 'password', autocomplete: 'off', placeholder: 'Verifier key', value: stored() ?? '' });
const msg = h('div', { 'aria-live': 'polite' });

clear(app).append(
  h('h1', { text: 'Verifier queue' }),
  h('p', { class: 'muted', text: 'Cases the automatic checks could not settle on their own. Your approval releases the stage payment for exactly the evidence shown here. If the evidence changes, the approval is refused.' }),
  h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); sessionStorage.setItem(KEY, keyIn.value); load(); } },
    h('div', { class: 'field' }, h('label', { for: 'vkey', text: 'Verifier key' }), keyIn, h('p', { class: 'hint', text: 'Printed in the server log when it starts, or set with VERIFIER_KEY. Kept only for this browser tab.' })),
    h('button', { type: 'submit', text: 'Load queue' })),
  msg, queue);

if (stored()) await load();

async function load() {
  clear(msg);
  clear(queue);
  let items;
  try { items = await api('GET', '/api/verify/queue', { headers: { 'x-verifier-key': stored() } }); } catch (e) { return showError(msg, e); }
  if (!items.length) { queue.append(h('div', { class: 'card empty', text: 'Nothing is waiting for review.' })); return; }
  for (const it of items) queue.append(await card(it));
}

async function card(it) {
  const img = h('img', { class: 'evidence', alt: `Evidence for ${it.stage.title}` });
  fetch(it.imageUrl, { headers: { 'x-verifier-key': stored() } }).then((r) => (r.ok ? r.blob() : Promise.reject())).then((b) => { img.src = URL.createObjectURL(b); }).catch(() => { img.alt = 'Image could not be loaded'; });

  const done = h('div', { 'aria-live': 'polite' });
  const decide = (decision) => async () => {
    for (const b of buttons) b.disabled = true;
    try {
      const r = await api('POST', `/api/verify/${encodeURIComponent(it.projectId)}/${encodeURIComponent(it.submission.id)}`, { body: { decision, evidenceHash: it.evidenceHash }, headers: { 'x-verifier-key': stored() } });
      clear(done).append(h('div', { class: `notice ${decision === 'approve' ? 'ok' : 'info'}`, text: decision === 'approve' ? `Approved. ${r.release?.payout ? `${r.release.payout.amount} released and sent as a payout.` : ''}` : 'Rejected. Nothing was paid.' }));
      setTimeout(load, 1500);
    } catch (e) { showError(done, e); for (const b of buttons) b.disabled = false; }
  };
  const failed = it.submission.status === 'RELEASE_FAILED';
  const approve = h('button', { type: 'button', text: failed ? 'Retry the release' : 'Approve and release payment', onclick: decide('approve') });
  const reject = h('button', { type: 'button', class: 'danger', text: 'Reject', onclick: decide('reject') });
  const buttons = [approve, reject];
  const f = it.submission.facts ?? {};

  return h('section', { class: 'card' },
    h('div', { class: 'row between' }, h('h2', { text: `${it.projectTitle}: ${it.stage.title}` }), failed ? h('span', { class: 'badge bad', text: 'Payment failed' }) : h('span', { class: 'badge warn', text: 'Needs a decision' })),
    failed ? h('div', { class: 'notice bad', text: `The evidence was accepted but the payment provider failed (${it.submission.releaseError ?? 'unknown error'}). No money moved on this attempt. You can retry.` }) : null,
    h('p', { text: `Stage must show: ${it.stage.spec}` }),
    h('p', { class: 'muted small', text: `Submitted ${fmtDate(it.submission.receivedAt)}  |  ${it.submission.id}` }),
    h('div', { class: 'grid cols-2' },
      h('div', {}, img, h('p', { class: 'small muted', text: `Photo location: ${f.gps ? `${f.gps.lat.toFixed(5)}, ${f.gps.lon.toFixed(5)}` : 'none'}  |  Time: ${f.takenAt ? fmtDate(f.takenAt) : 'none'}` })),
      h('div', {},
        h('h3', { text: 'Why it needs a human' }),
        h('ul', { class: 'plain' }, (it.submission.reasons ?? []).map((r) => h('li', { text: `${explain(r)}${r.detail ? ` (${r.detail})` : ''}` }))),
        h('h3', { style: 'margin-top:1rem', text: 'Checks' }), checksTable(it.submission.checks))),
    h('h3', { style: 'margin-top:1rem', text: 'What the AI reviewers said' }), reviewsList(it.submission.reviews),
    h('div', { class: 'row', style: 'margin-top:1rem' }, approve, reject), done);
}

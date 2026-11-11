import { h, clear, api, qs, money, fmtDay, chrome, showError, stageBadge, submissionBadge, explain, checksTable, reviewsList, outcomeText } from '/common.js';

const app = document.getElementById('app');
const cfg = await chrome('worker');
const params = qs();
const pid = params.get('project');
const KEY_NAME = `pp-worker-key:${pid}`;
if (params.get('key')) sessionStorage.setItem(KEY_NAME, params.get('key'));
const key = sessionStorage.getItem(KEY_NAME);

if (!pid || !key) {
  clear(app).append(h('div', { class: 'card empty' }, h('h2', { text: 'Worker link needed' }), h('p', { text: 'Open the worker link you were given when the project was created. It contains your private key.' })));
} else {
  await page();
}

async function page() {
  const authHeaders = { 'x-worker-key': key };
  const head = h('div');
  const body = h('div', { class: 'stack' });
  clear(app).append(head, body);

  let view;
  try { view = await api('GET', `/api/projects/${encodeURIComponent(pid)}`, { headers: authHeaders }); } catch (e) { return showError(app, e); }
  document.title = `Evidence: ${view.title} | ProofPay`;
  head.append(h('h1', { text: view.title }), h('p', { class: 'muted', text: `Hello ${view.worker.name}. Show the work, and the stage payment is released to you once it is verified.` }),
    h('p', {}, h('a', { href: `/?project=${encodeURIComponent(pid)}`, text: 'See the donor view' })));

  const stage = view.stages.find((s) => s.status === 'ACTIVE');
  if (!stage) {
    body.append(h('div', { class: 'notice ok', text: 'All stages are complete and paid. Thank you!' }), history(view));
    return;
  }

  const result = h('div', { 'aria-live': 'polite' });
  const fileIn = h('input', { id: 'photo', type: 'file', accept: 'image/jpeg,image/png', required: true });
  const preview = h('img', { class: 'evidence', alt: 'Preview of the selected photo', hidden: true });
  const send = h('button', { type: 'submit', text: 'Submit evidence' });
  let objectUrl;
  fileIn.addEventListener('change', () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const f = fileIn.files[0];
    preview.hidden = !f;
    if (f) { objectUrl = URL.createObjectURL(f); preview.src = objectUrl; }
  });

  // Simulation controls exist only when no AI model is running (REVIEWERS=demo).
  const simCode = h('input', { id: 'simcode', type: 'text', value: stage.code, maxlength: 8 });
  const simMatch = h('input', { id: 'simmatch', type: 'checkbox', checked: true });
  const simFlags = h('input', { id: 'simflags', type: 'text', placeholder: 'e.g. screen_photo' });
  const sim = cfg.simulatedReviews
    ? h('fieldset', { class: 'card', style: 'margin-top:12px' },
      h('legend', { class: 'badge warn', text: 'Simulation controls' }),
      h('p', { class: 'muted small', text: 'No AI model is running, so these settings stand in for what the reviewers would report. Everything after the reviewers (checks, gate, payments) is real.' }),
      h('div', { class: 'field' }, h('label', { for: 'simcode', text: 'Code the simulated reviewers read' }), simCode),
      h('div', { class: 'field' }, h('label', {}, simMatch, ' Reviewers say the photo matches the stage')),
      h('div', { class: 'field' }, h('label', { for: 'simflags', text: 'Suspicion flags (comma separated, optional)' }), simFlags))
    : null;

  const form = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const file = fileIn.files[0];
      if (!file) return;
      send.disabled = true;
      send.textContent = 'Checking evidence...';
      clear(result);
      const q = new URLSearchParams();
      if (cfg.simulatedReviews) {
        if (simCode.value) q.set('demoCode', simCode.value);
        if (!simMatch.checked) q.set('demoMatch', '0');
        if (simFlags.value.trim()) q.set('demoFlags', simFlags.value.trim());
      }
      try {
        const r = await api('POST', `/api/projects/${encodeURIComponent(pid)}/stages/${stage.id}/submissions${q.size ? `?${q}` : ''}`, { body: file, raw: true, headers: { ...authHeaders, 'content-type': 'application/octet-stream' } });
        showResult(r);
      } catch (err) { showError(result, err); } finally { send.disabled = false; send.textContent = 'Submit evidence'; }
    },
  },
  h('div', { class: 'field' }, h('label', { for: 'photo', text: 'Photo or screenshot (JPEG or PNG, up to 5 MB)' }), fileIn, h('p', { class: 'hint', text: 'Use the original file from your phone with location turned on. Messaging apps remove the location and time, and the photo is then sent to a human verifier.' })),
  preview, sim, h('div', { style: 'margin-top:12px' }, send));

  body.append(
    h('section', { class: 'card' },
      h('div', { class: 'row between' }, h('h2', { text: `Stage ${stage.index + 1}: ${stage.title}` }), stageBadge(stage.status)),
      h('p', { text: `Show: ${stage.spec}` }),
      h('p', { class: 'muted small', text: `Photo must be taken ${fmtDay(stage.window.from)} to ${fmtDay(stage.window.to)} at the job site. Releases ${stage.pct}% of the funds.` }),
      h('p', { style: 'margin-top:1rem;margin-bottom:.3rem', class: 'muted', text: 'Your one-time code for this stage:' }),
      h('div', { class: 'code', role: 'img', 'aria-label': `One-time code ${stage.code.split('').join(' ')}`, text: stage.code }),
      h('ol', { class: 'plain', style: 'margin-top:1rem' },
        h('li', { text: 'Write the code large on a piece of paper.' }),
        h('li', { text: 'Put the paper in the frame, next to the work.' }),
        h('li', { text: 'Take a photo of the finished stage, then upload it below.' }))),
    h('section', { class: 'card' }, h('h2', { text: 'Submit evidence' }), form, result),
    history(view));

  function showResult(r) {
    const tone = { RELEASE: 'ok', RESUBMIT: 'warn', HOLD: 'info', BLOCK: 'bad' }[r.decision] ?? 'info';
    clear(result).append(
      h('div', { class: `notice ${tone}`, role: 'status', style: 'margin-top:12px' }, h('strong', { text: outcomeText[r.decision] ?? r.decision }),
        r.release?.ok ? h('div', { text: `${money(r.release.payout.amount)} was released and sent to you as a PayPal payout. It can take a few seconds to arrive.` }) : null),
      r.reasons?.length ? h('ul', { class: 'plain' }, r.reasons.map((x) => h('li', { text: `${explain(x)}${x.detail ? ` (${x.detail})` : ''}` }))) : null,
      h('details', { open: r.decision !== 'RELEASE' }, h('summary', { text: 'How this was checked' }), checksTable(r.checks), reviewsList(r.reviews)));
    if (r.decision === 'RELEASE') setTimeout(() => location.reload(), 2500);
  }
}

function history(view) {
  const rows = view.stages.flatMap((s) => s.submissions.map((x) => ({ s, x })));
  if (!rows.length) return h('span');
  return h('section', { class: 'card' }, h('h2', { text: 'Your submissions' }),
    h('ul', { class: 'plain' }, rows.map(({ s, x }) => h('li', {}, `Stage ${s.index + 1}, ${x.id}: `, submissionBadge(x.status), ' ', h('span', { class: 'small muted', text: (x.reasons ?? []).map((r) => explain(r)).join(' ') })))));
}

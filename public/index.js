import { h, clear, api, qs, money, fmtDate, fmtDay, chrome, showError, stageBadge, submissionBadge, donationBadge, explain } from '/common.js';

const app = document.getElementById('app');
await chrome('home');
const pid = qs().get('project');
await (pid ? projectPage(pid) : listPage());

// ---------------------------------------------------------------- project list

async function listPage() {
  clear(app);
  app.append(
    h('section', { class: 'hero' },
      h('h1', { text: 'Pay for the work after it is proven.' }),
      h('p', { class: 'pitch', text: 'Neighbours pool money to fix what is broken. Every donation is reserved on PayPal and released in stages, only when photo evidence passes checks that an AI opinion alone can never override.' })),
  );
  let projects;
  try { projects = await api('GET', '/api/projects'); } catch (e) { return showError(app, e); }
  if (!projects.length) {
    app.append(h('div', { class: 'card empty' }, h('p', { text: 'No projects yet.' }), h('a', { class: 'btn', href: '/create.html', text: 'Create the first project' })));
    return;
  }
  app.append(h('div', { class: 'grid cols-2' }, projects.map((p) => {
    const done = p.stages.filter((s) => s === 'RELEASED').length;
    return h('a', { class: 'card', href: `/?project=${encodeURIComponent(p.id)}`, style: 'text-decoration:none;color:inherit;display:block' },
      h('h2', { text: p.title }),
      h('p', { class: 'muted', text: `${done} of ${p.stages.length} stages verified and paid` }),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': done, 'aria-valuemin': 0, 'aria-valuemax': p.stages.length }, h('i', { style: `width:${(done / p.stages.length) * 100}%` })),
      h('p', { class: 'small muted', style: 'margin-top:.6rem', text: `${money(p.totals.reserved)} reserved  |  ${money(p.totals.paid)} paid out` }));
  })));
}

// ---------------------------------------------------------------- one project

async function projectPage(id) {
  const head = h('div');
  const notices = h('div');
  const summary = h('div', { class: 'grid cols-3' });
  const timeline = h('ol', { class: 'timeline' });
  const donations = h('div');
  const donateMsg = h('div', { 'aria-live': 'polite' });
  const auditBody = h('div');

  const nameIn = h('input', { id: 'donor', type: 'text', maxlength: 60, autocomplete: 'name', required: true, placeholder: 'Your name' });
  const amountIn = h('input', { id: 'amount', type: 'number', min: 1, max: 1000, step: '0.01', value: '25', required: true, inputmode: 'decimal' });
  const donateBtn = h('button', { type: 'submit', text: 'Reserve my donation' });
  const form = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      donateBtn.disabled = true;
      clear(donateMsg);
      try {
        const r = await api('POST', `/api/projects/${encodeURIComponent(id)}/donations`, { body: { donor: nameIn.value, amount: Number(amountIn.value) } });
        if (r.approveUrl) { location.href = r.approveUrl; return; } // PayPal sandbox approval page
        donateMsg.append(h('div', { class: 'notice ok', text: 'Thank you! Your donation is reserved.' }));
        await refresh();
      } catch (err) { showError(donateMsg, err); } finally { donateBtn.disabled = false; }
    },
  },
  h('div', { class: 'field' }, h('label', { for: 'donor', text: 'Your name' }), nameIn),
  h('div', { class: 'field' }, h('label', { for: 'amount', text: 'Amount (USD)' }), amountIn),
  donateBtn);

  const auditBtn = h('button', { class: 'secondary', type: 'button', text: 'Show audit log', onclick: async () => {
    auditBtn.disabled = true;
    try { renderAudit(await api('GET', `/api/projects/${encodeURIComponent(id)}/audit`)); auditBtn.textContent = 'Refresh audit log'; } catch (e) { showError(auditBody, e); } finally { auditBtn.disabled = false; }
  } });

  clear(app).append(
    head, notices,
    h('div', { class: 'layout' },
      h('div', { class: 'stack' }, summary, h('section', { class: 'card', 'aria-labelledby': 'tl' }, h('h2', { id: 'tl', text: 'Stages and payments' }), h('p', { class: 'muted small', text: 'Money is released one stage at a time, and only after the evidence for that stage is verified.' }), timeline)),
      h('div', { class: 'stack sticky' },
        h('section', { class: 'card' }, h('h2', { text: 'Donate' }), h('p', { class: 'muted small', text: 'Your money stays on your PayPal account as a reservation. It is only taken as each stage is verified. Reservations last up to 29 days.' }), form, donateMsg),
        h('section', { class: 'card' }, h('h2', { text: 'Donors' }), donations),
        h('section', { class: 'card' }, h('h2', { text: 'Audit log' }), h('p', { class: 'muted small', text: 'Every decision and payment is recorded in a hash-chained log. Editing any entry would break the chain.' }), auditBtn, auditBody))),
  );

  const params = qs();
  if (params.get('donated')) notices.append(h('div', { class: 'notice ok', text: 'Thank you! Your donation is reserved on PayPal.' }));
  if (params.get('error') === 'not-approved') notices.append(h('div', { class: 'notice warn', text: 'The donation was not approved on PayPal, so nothing was reserved.' }));
  if (params.get('cancelled')) notices.append(h('div', { class: 'notice info', text: 'Donation cancelled. Nothing was reserved.' }));

  let view;
  async function refresh() {
    try { view = await api('GET', `/api/projects/${encodeURIComponent(id)}`); } catch (e) { return showError(head, e); }
    render(view);
  }

  function render(v) {
    document.title = `${v.title} | ProofPay`;
    const done = v.stages.filter((s) => s.status === 'RELEASED').length;
    clear(head).append(
      h('h1', { text: v.title }),
      h('p', { class: 'muted', text: `Worker: ${v.worker.name}  |  ${done} of ${v.stages.length} stages verified and paid` }),
      h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Stages paid', 'aria-valuenow': done, 'aria-valuemin': 0, 'aria-valuemax': v.stages.length, style: 'margin:.5rem 0 1rem' }, h('i', { style: `width:${(done / v.stages.length) * 100}%` })));

    const stat = (value, label) => h('div', { class: 'stat' }, h('div', { class: 'v', text: value }), h('div', { class: 'l', text: label }));
    const held = Number(v.totals.reserved) - Number(v.totals.captured);
    clear(summary).append(stat(money(v.totals.reserved), 'reserved by donors'), stat(money(v.totals.paid), 'paid to the worker'), stat(money(held), 'still held (not taken)'));
    if (v.holdExpiresAt) summary.append(h('p', { class: 'muted small', style: 'grid-column:1/-1;margin:0' }, `Earliest PayPal reservation expires ${fmtDay(v.holdExpiresAt)}. Work must finish before then.`));

    const total = Number(v.totals.reserved);
    clear(timeline).append(...v.stages.map((s) => stageItem(v, s, total)));

    clear(donations).append(v.donations.length
      ? h('div', { class: 'scroll' }, h('table', { class: 'table compact' },
        h('thead', {}, h('tr', {}, h('th', { text: 'Donor' }), h('th', { text: 'Amount' }), h('th', { text: 'Status' }))),
        h('tbody', {}, v.donations.map((d) => h('tr', {}, h('td', { text: d.donor }), h('td', { text: money(d.amount) }), h('td', {}, donationBadge(d.status)))))))
      : h('p', { class: 'muted', text: 'No donations yet. Be the first.' }));
  }

  function stageItem(v, s, total) {
    const nodeClass = s.status === 'RELEASED' ? 'ok' : s.status === 'ACTIVE' ? 'info' : '';
    const share = total * s.pct / 100;
    const released = s.submissions.find((x) => x.status === 'RELEASED');
    const others = s.submissions.filter((x) => x.status !== 'RELEASED');
    const donorOf = (did) => v.donations.find((d) => d.id === did)?.donor ?? did;
    return h('li', {},
      h('div', { class: `node ${nodeClass}`, 'aria-hidden': 'true', text: s.status === 'RELEASED' ? '✓' : s.index + 1 }),
      h('div', { class: `stage ${s.status === 'ACTIVE' ? 'active' : ''}` },
        h('div', { class: 'row between' }, h('h3', { text: `Stage ${s.index + 1}: ${s.title}` }), stageBadge(s.status)),
        h('p', { text: `Must show: ${s.spec}` }),
        h('p', { class: 'muted small', text: `${s.pct}% of the funds${total ? ` (${money(share)} at today's total)` : ''}  |  photo taken ${fmtDay(s.window.from)} to ${fmtDay(s.window.to)}` }),
        s.release ? h('div', { class: 'notice ok', style: 'margin-top:.5rem' },
          h('strong', { text: `${money(s.release.payout.amount)} paid to the worker` }),
          h('ul', { class: 'plain' }, s.release.captures.map((c) => h('li', { text: `${donorOf(c.donation)} contributed ${money(c.amount)}` }))),
          h('span', { class: 'small', text: `Payout reference ${s.release.payout.batch_id}` })) : null,
        released ? h('img', { class: 'thumb', src: `/api/images/${encodeURIComponent(v.id)}/${encodeURIComponent(released.id)}`, alt: `Verified evidence for stage ${s.index + 1}`, loading: 'lazy' }) : null,
        s.status === 'ACTIVE' && !s.submissions.length ? h('p', { class: 'muted small', style: 'margin-top:.5rem', text: 'Waiting for the worker to submit evidence.' }) : null,
        others.length ? h('ul', { class: 'plain', style: 'margin-top:.6rem' }, others.map((x) => h('li', {}, submissionBadge(x.status), ' ', h('span', { class: 'small muted', text: `${x.id}: ${(x.reasons ?? []).map((r) => explain(r)).join(' ')}` })))) : null));
  }

  function renderAudit(a) {
    const when = (ts) => (ts > 1e9 ? fmtDate(new Date(ts).toISOString()) : '');
    clear(auditBody).append(
      h('div', { class: `notice ${a.chain.ok ? 'ok' : 'bad'}`, style: 'margin-top:.6rem', text: a.chain.ok ? `Chain verified: ${a.entries.length} entries, none altered.` : `Chain BROKEN at entry ${a.chain.brokenAt}.` }),
      h('div', { class: 'scroll' }, h('table', { class: 'table compact' },
        h('thead', {}, h('tr', {}, h('th', { text: '#' }), h('th', { text: 'What happened' }), h('th', { text: 'Hash' }))),
        h('tbody', {}, [...a.entries].reverse().map((e) => h('tr', {}, h('td', { text: e.seq }), h('td', {}, h('div', { text: auditLine(e) }), h('div', { class: 'muted small', text: when(e.ts) })), h('td', { class: 'mono', text: e.hash.slice(0, 8) })))))));
  }

  await refresh();
  setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 5000);
}

function auditLine(e) {
  if (e.event === 'submission') return `Evidence ${e.submission} for ${e.stage}: ${e.decision}${e.reasons?.length ? ` (${e.reasons.join(', ')})` : ''}`;
  if (e.event === 'release') return e.ok ? `Stage ${e.stage} released, payout ${e.payout?.amount}` : `Stage ${e.stage} release failed: ${e.reason}`;
  if (e.event === 'human-decision') return `Verifier ${e.decision}d ${e.submission}`;
  if (e.event === 'human-decision-refused') return `Approval refused for ${e.submission}: ${e.reason}`;
  if (e.event === 'donation-confirmed') return `Donation ${e.donation} reserved: ${e.amount}`;
  if (e.tool) return `${e.tool.replaceAll('_', ' ')}${e.args?.amount ? ` ${e.args.amount}` : ''}: ${e.decision}`;
  return JSON.stringify(e).slice(0, 120);
}

import { h, clear, api, qs, checkIcon, icon, money, fmtDate, fmtDay, chrome, showError, stageBadge, submissionBadge, donationBadge, explain, payoutProblemText } from '/common.js';
import { setVendors, renderGantt, renderLedgerGrid, renderAuditGrid, renderFundsChart } from '/vendor-ui.js';

// Declared before the page code below runs (module code executes top to bottom).
const SAMPLES = [
  { file: 'stage1_before.png', caption: 'Stage 1: old pump' },
  { file: 'stage2_installed.png', caption: 'Stage 2: new pump installed' },
  { file: 'stage3_water_flow.png', caption: 'Stage 3: water flowing' },
];

const app = document.getElementById('app');
const cfg = await chrome('home');
setVendors(cfg.vendors ?? []);
const pid = qs().get('project');
await (pid ? projectPage(pid) : listPage());

// ---------------------------------------------------------------- project list

async function listPage() {
  clear(app);
  app.append(heroSection(), proofStrip(), howItWorks());
  if (cfg.demo) app.append(demoGuide(cfg));
  let projects;
  try { projects = await api('GET', '/api/projects'); } catch (e) { return showError(app, e); }
  if (!projects.length) {
    app.append(h('div', { class: 'card empty' }, h('p', { text: 'No projects yet.' }), h('a', { class: 'btn', href: '/create.html', text: 'Create the first project' })));
    return;
  }
  app.append(h('h2', { id: 'projects', style: 'margin:8px 0 12px;scroll-margin-top:16px', text: 'Projects' }), h('div', { class: 'grid cols-2' }, projects.map((p) => {
    const done = p.stages.filter((s) => s === 'RELEASED').length;
    return h('a', { class: 'card', href: `/?project=${encodeURIComponent(p.id)}`, style: 'text-decoration:none;color:inherit;display:block' },
      h('h2', { text: p.title }),
      h('p', { class: 'muted', text: `${done} of ${p.stages.length} stages verified and paid` }),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': done, 'aria-valuemin': 0, 'aria-valuemax': p.stages.length }, h('i', { style: `width:${(done / p.stages.length) * 100}%` })),
      h('p', { class: 'small muted', style: 'margin-top:.6rem', text: `${money(p.totals.reserved)} reserved  |  ${money(p.totals.paid)} paid out` }));
  })));
}

// Trust & Authority page order: what it is, proof it works, how it works, then the way in.
function heroSection() {
  return h('section', { class: 'hero hero-grid', 'aria-labelledby': 'hero-title' },
    h('div', {},
      h('p', { class: 'eyebrow', text: 'Escrow for community projects' }),
      h('h1', { id: 'hero-title', text: 'Pay for the work after it is proven.' }),
      h('p', { class: 'pitch', text: 'Neighbours pool money to fix what is broken. Every donation is reserved on PayPal and released one stage at a time, only when photo evidence passes checks that an AI opinion alone can never override.' }),
      h('div', { class: 'row cta-row' },
        h('a', { class: 'btn', href: cfg.demo ? '#try' : '#projects', text: cfg.demo ? 'Try the live demo' : 'See the projects' }),
        h('a', { class: 'btn secondary', href: '#how', text: 'How it works' }))),
    h('figure', { class: 'before-after', style: 'margin:0' },
      h('div', { class: 'filmstrip' }, SAMPLES.map((p, i) => h('div', {},
        h('img', { src: `/samples/${p.file}`, alt: ['The old, rusty hand pump before any work', 'The new green pump installed', 'Water flowing from the new pump into a bucket'][i], loading: 'eager' }),
        h('span', { class: 'badge muted', text: ['Before', 'Installed', 'Flowing'][i] })))),
      h('figcaption', { class: 'muted small', text: 'One project, three stages. Money moves only as each stage is proven.' })));
}

/** Only facts we measured, each with where it comes from. */
function proofStrip() {
  const item = (value, label, note) => h('div', { class: 'stat' }, h('div', { class: 'v', text: value }), h('div', { class: 'l' }, h('strong', { text: label }), h('br'), note));
  return h('section', { class: 'proof grid cols-3', 'aria-label': 'Verified results' },
    item('$10.00 \u2192 $10.00', 'Reserved, then paid out', 'A live PayPal sandbox run, confirmed by PayPal itself.'),
    item('96', 'Automated tests', 'Including fraud, crash, retry and prompt-injection cases.'),
    item('8 of 8', 'Test photos handled right', 'Honest and fake, judged by real AI agents.'));
}

function howItWorks() {
  const step = (name, n, title, body) => h('li', { class: 'card step' },
    h('div', { class: 'step-icon' }, icon(name)),
    h('h3', {}, h('span', { class: 'muted', text: `${n}. ` }), title),
    h('p', { class: 'muted', text: body }));
  return h('section', { id: 'how', style: 'margin:24px 0;scroll-margin-top:16px', 'aria-labelledby': 'how-title' },
    h('h2', { id: 'how-title', text: 'How it works' }),
    h('ol', { class: 'steps' },
      step('lock', 1, 'Reserve', 'Donors approve a PayPal authorization. The money stays in their account; nothing is taken yet.'),
      step('camera', 2, 'Prove', 'For each stage the worker photographs the work with a one-time code. Two AI reviewers and plain-code checks examine it.'),
      step('send', 3, 'Release', "Code decides, not the AI. Each donor's exact share is captured and the worker is paid. Every step is in an audit log.")));
}

/** Demo mode only: everything a visitor needs to try all three roles, without any server log. */
function demoGuide(cfg) {
  const d = cfg.demo;
  const step = (_n, title, body) => h('li', { style: 'margin-bottom:.6rem' }, h('strong', { text: `${title} ` }), body);
  return h('section', { id: 'try', class: 'card', style: 'margin-bottom:16px;scroll-margin-top:16px', 'aria-labelledby': 'tryit' },
    h('div', { class: 'row between' }, h('h2', { id: 'tryit', text: 'Try it in two minutes' }), h('span', { class: 'badge warn', text: 'Demo mode: test money only' })),
    h('p', { class: 'muted small', text: cfg.simulatedReviews
      ? 'Payments and photo reviews are simulated in this run. Everything after the reviewers (checks, release gate, splitting, audit log) is the real code.'
      : 'Payments are simulated. Two real AI agents review your photos, so upload something that shows the stage.' }),
    h('ol', { style: 'padding-left:1.1rem;margin:.6rem 0 0' },
      step(1, 'See the project.', h('a', { href: `/?project=${encodeURIComponent(d.projectId)}`, text: 'Open the donor page' })),
      step(2, 'Act as the worker.', [h('a', { href: `/worker.html?project=${encodeURIComponent(d.projectId)}&key=${encodeURIComponent(d.workerKey)}`, text: 'Open the worker page' }), ' and upload the Stage 1 sample photo below. A photo without location data is sent to a human, which is the next step.']),
      step(3, 'Act as the verifier.', [h('a', { href: `/verify.html?key=${encodeURIComponent(d.verifierKey)}`, text: 'Open the verifier queue' }), ' and approve. The stage payment is split across both donors and the donor page updates.']),
      step(4, 'Try to cheat.', 'Upload the stage 1 photo again for stage 2: it is blocked as a duplicate and no money moves.')),
    h('h3', { style: 'margin-top:1rem', text: 'Sample photos for each stage' }),
    h('p', { class: 'muted small', text: `Download one and upload it on the worker page. Each shows the code ${'7K2Q'} on paper, which is this demo project's one-time code. Real projects get a random code for each stage.` }),
    h('div', { class: 'grid cols-3', style: 'margin-top:.5rem' }, SAMPLES.map((p) => h('figure', { style: 'margin:0' },
      h('img', { src: `/samples/${p.file}`, alt: p.caption, class: 'thumb', loading: 'lazy' }),
      h('figcaption', { class: 'small' }, `${p.caption} `, h('a', { href: `/samples/${p.file}`, download: p.file, text: 'Download' }))))));
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
  // Third-party components. Each card stays hidden unless its library loaded, so the page never depends on them.
  const optionalCard = (title, note, host) => h('section', { class: 'card', hidden: true }, h('h2', { text: title }), h('p', { class: 'muted small', text: note }), host);
  const ganttHost = h('div');
  const ganttCard = optionalCard('Timeline', 'Each stage unlocks the next payment. Bars show when a stage was verified (drawn at least a day wide so quick demos stay readable).', ganttHost);
  const chartHost = h('div');
  const chartCard = optionalCard('Funds by stage', 'How much of each stage has been paid, is settling, or is still held until the evidence is verified.', chartHost);
  const ledgerHost = h('div');
  const ledgerCard = optionalCard('Money ledger', 'Every capture from a donor and every payout to the worker, with its PayPal reference.', ledgerHost);

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
    ganttCard, // full width: a timeline needs room
    h('div', { class: 'layout', style: 'margin-top:16px' },
      h('div', { class: 'stack' }, summary, h('section', { class: 'card', 'aria-labelledby': 'tl' }, h('h2', { id: 'tl', text: 'Stages and payments' }), h('p', { class: 'muted small', text: 'Money is released one stage at a time, and only after the evidence for that stage is verified.' }), timeline), chartCard, ledgerCard),
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
    if (Number(v.totals.inTransit) > 0) summary.append(h('p', { class: 'small', style: 'grid-column:1/-1;margin:0;color:var(--info)', text: `${money(v.totals.inTransit)} is on its way: PayPal accepted the payout and is settling it.` }));
    if (Number(v.totals.problem) > 0) summary.append(h('div', { class: 'notice bad', style: 'grid-column:1/-1;margin:0', role: 'alert', text: `${money(v.totals.problem)} of payouts need attention. See the stages below.` }));
    if (v.holdExpiresAt) summary.append(h('p', { class: 'muted small', style: 'grid-column:1/-1;margin:0' }, `Earliest PayPal reservation expires ${fmtDay(v.holdExpiresAt)}. Work must finish before then.`));

    const total = Number(v.totals.reserved);
    clear(timeline).append(...v.stages.map((s) => stageItem(v, s, total)));

    clear(donations).append(v.donations.length
      ? h('div', { class: 'scroll' }, h('table', { class: 'table compact' },
        h('thead', {}, h('tr', {}, h('th', { text: 'Donor' }), h('th', { text: 'Amount' }), h('th', { text: 'Status' }))),
        h('tbody', {}, v.donations.map((d) => h('tr', {}, h('td', { text: d.donor }), h('td', { text: money(d.amount) }),
          h('td', {}, d.status !== 'CONFIRMED' ? donationBadge(d.status)
            : Number(d.released) >= Number(d.amount) ? h('span', { class: 'badge ok', text: 'Fully released' })
              : Number(d.released) > 0 ? h('span', { class: 'badge info', text: `${money(d.released)} released` })
                : donationBadge('CONFIRMED')))))))
      : h('p', { class: 'muted', text: 'No donations yet. Be the first.' }));

    enhance(v);
  }

  // Draw the optional components. Skipped if a previous pass is still running.
  let enhancing = false;
  async function enhance(v) {
    if (enhancing) return;
    enhancing = true;
    try {
      ganttCard.hidden = !(await renderGantt(ganttHost, v));

      const total = Number(v.totals.reserved);
      const stages = v.stages.map((s) => {
        const pay = s.release?.payout;
        const state = pay ? (pay.state ?? 'paid') : null;
        const amount = pay ? Number(pay.amount) : (total * s.pct) / 100;
        return { label: `Stage ${s.index + 1}`, paid: state === 'paid' ? amount : 0, settling: state === 'pending' ? amount : 0, waiting: state === 'paid' || state === 'pending' ? 0 : amount };
      });
      chartCard.hidden = !(await renderFundsChart(chartHost, stages));

      const rows = v.stages.flatMap((s) => {
        if (!s.release) return [];
        const donorOf = (did) => v.donations.find((d) => d.id === did)?.donor ?? did;
        const pay = s.release.payout;
        const state = { paid: 'Paid', pending: 'Settling', problem: 'Problem' }[pay.state ?? 'paid'];
        return [
          ...s.release.captures.map((c) => ({ stage: `Stage ${s.index + 1}`, kind: 'Taken from donor', party: donorOf(c.donation), amount: Number(c.amount), status: 'Captured', ref: c.capture_id })),
          { stage: `Stage ${s.index + 1}`, kind: 'Payout to worker', party: v.worker.name, amount: Number(pay.amount), status: state, ref: pay.batch_id },
        ];
      });
      ledgerCard.hidden = rows.length === 0 || !(await renderLedgerGrid(ledgerHost, rows));
    } finally { enhancing = false; }
  }

  function stageItem(v, s, total) {
    const nodeClass = s.status === 'RELEASED' ? 'ok' : s.status === 'ACTIVE' ? 'info' : '';
    const share = total * s.pct / 100;
    const released = s.submissions.find((x) => x.status === 'RELEASED');
    const others = s.submissions.filter((x) => x.status !== 'RELEASED');
    const donorOf = (did) => v.donations.find((d) => d.id === did)?.donor ?? did;
    return h('li', {},
      h('div', { class: `node ${nodeClass}`, 'aria-hidden': 'true' }, s.status === 'RELEASED' ? checkIcon() : s.index + 1),
      h('div', { class: `stage ${s.status === 'ACTIVE' ? 'active' : ''}` },
        h('div', { class: 'row between' }, h('h3', { text: `Stage ${s.index + 1}: ${s.title}` }), stageBadge(s.status)),
        h('p', { text: `Must show: ${s.spec}` }),
        h('p', { class: 'muted small', text: `${s.pct}% of the funds${total ? ` (${money(share)} at today's total)` : ''}  |  photo taken ${fmtDay(s.window.from)} to ${fmtDay(s.window.to)}` }),
        s.release ? releaseBox(s, donorOf) : null,
        released ? h('img', { class: 'thumb', src: `/api/images/${encodeURIComponent(v.id)}/${encodeURIComponent(released.id)}`, alt: `Verified evidence for stage ${s.index + 1}`, loading: 'lazy' }) : null,
        s.status === 'ACTIVE' && !s.submissions.length ? h('p', { class: 'muted small', style: 'margin-top:.5rem', text: 'Waiting for the worker to submit evidence.' }) : null,
        others.length ? h('ul', { class: 'plain', style: 'margin-top:.6rem' }, others.map((x) => h('li', {}, submissionBadge(x.status), ' ', h('span', { class: 'small muted', text: `${x.id}: ${(x.reasons ?? []).map((r) => explain(r)).join(' ')}` })))) : null));
  }

  async function renderAudit(a) {
    const when = (ts) => (ts > 1e9 ? fmtDate(new Date(ts).toISOString()) : '');
    const entries = [...a.entries].reverse();
    const gridHost = h('div');
    clear(auditBody).append(
      h('div', { class: `notice ${a.chain.ok ? 'ok' : 'bad'}`, style: 'margin-top:.6rem', text: a.chain.ok ? `Chain verified: ${a.entries.length} entries, none altered.` : `Chain BROKEN at entry ${a.chain.brokenAt}.` }),
      gridHost);
    const rows = entries.map((e) => ({ seq: e.seq, what: auditLine(e), when: when(e.ts), hash: e.hash.slice(0, 8) }));
    if (await renderAuditGrid(gridHost, rows)) return;
    gridHost.append(h('div', { class: 'scroll' }, h('table', { class: 'table compact' },
      h('thead', {}, h('tr', {}, h('th', { text: '#' }), h('th', { text: 'What happened' }), h('th', { text: 'Hash' }))),
      h('tbody', {}, entries.map((e) => h('tr', {}, h('td', { text: e.seq }), h('td', {}, h('div', { text: auditLine(e) }), h('div', { class: 'muted small', text: when(e.ts) })), h('td', { class: 'mono', text: e.hash.slice(0, 8) })))))));
  }

  await refresh();
  setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 5000);
}

/** A released stage: paid (PayPal settled it), settling, or a payout problem. */
function releaseBox(s, donorOf) {
  const pay = s.release.payout;
  const state = pay.state ?? 'paid';
  const tone = { paid: 'ok', pending: 'info', problem: 'bad' }[state];
  const headline = {
    paid: `${money(pay.amount)} paid to the worker`,
    pending: `${money(pay.amount)} sent, waiting for PayPal to settle it`,
    problem: `${money(pay.amount)} payout needs attention`,
  }[state];
  return h('div', { class: `notice ${tone}`, style: 'margin-top:.5rem' },
    h('strong', { text: headline }),
    state === 'problem' ? h('p', { class: 'small', style: 'margin:.3rem 0', text: payoutProblemText(pay.status) }) : null,
    h('ul', { class: 'plain' }, s.release.captures.map((c) => h('li', { text: `${donorOf(c.donation)} contributed ${money(c.amount)}` }))),
    h('span', { class: 'small', text: `Payout reference ${pay.batch_id}${state === 'paid' ? ', settled' : ''}` }));
}

function auditLine(e) {
  if (e.event === 'payout-update') return `Payout for ${e.stage} is now ${e.status}`;
  if (e.event === 'submission') return `Evidence ${e.submission} for ${e.stage}: ${e.decision}${e.reasons?.length ? ` (${e.reasons.join(', ')})` : ''}`;
  if (e.event === 'release') return e.ok ? `Stage ${e.stage} released, payout ${e.payout?.amount}` : `Stage ${e.stage} release failed: ${e.reason}`;
  if (e.event === 'human-decision') return `Verifier ${e.decision}d ${e.submission}`;
  if (e.event === 'human-decision-refused') return `Approval refused for ${e.submission}: ${e.reason}`;
  if (e.event === 'donation-confirmed') return `Donation ${e.donation} reserved: ${e.amount}`;
  if (e.tool) return `${e.tool.replaceAll('_', ' ')}${e.args?.amount ? ` ${e.args.amount}` : ''}: ${e.decision}`;
  return JSON.stringify(e).slice(0, 120);
}

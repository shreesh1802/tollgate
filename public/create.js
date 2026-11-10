import { h, clear, api, chrome, showError } from '/common.js';

const app = document.getElementById('app');
await chrome('create');

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 16);
const stageRows = h('div');
const result = h('div', { 'aria-live': 'polite' });
let n = 0;

function addStage(s = {}) {
  n += 1;
  const id = `s${n}`;
  const f = (name, label, attrs) => h('div', {}, h('label', { for: `${id}-${name}`, text: label }), h('input', { id: `${id}-${name}`, 'data-f': name, required: true, ...attrs }));
  const row = h('div', { class: 'stage-row', role: 'group', 'aria-label': `Stage ${n}` },
    f('title', 'Stage title', { value: s.title ?? '', maxlength: 80 }),
    f('spec', 'What the photo must show', { value: s.spec ?? '', maxlength: 160 }),
    f('pct', 'Share %', { type: 'number', min: 1, max: 100, value: s.pct ?? '' }),
    f('from', 'Photo window from', { type: 'datetime-local', value: day(-1) }),
    f('to', 'Photo window to', { type: 'datetime-local', value: day(30) }));
  stageRows.append(row);
}

function template() {
  clear(stageRows);
  n = 0;
  title.value = 'Fix the village water pump';
  workerName.value = 'Ravi Kumar';
  lat.value = '12.9716'; lon.value = '77.5946'; radius.value = '300';
  addStage({ title: 'Old pump documented', spec: 'the old rusty hand pump is visible at the site', pct: 30 });
  addStage({ title: 'New pump installed', spec: 'a new hand pump is installed and mounted on its base', pct: 40 });
  addStage({ title: 'Water flowing', spec: 'water is visibly flowing from the pump', pct: 30 });
}

const title = h('input', { id: 'title', required: true, maxlength: 100 });
const workerName = h('input', { id: 'wname', required: true, maxlength: 60 });
const workerEmail = h('input', { id: 'wemail', type: 'email', required: true, placeholder: 'worker PayPal email' });
const lat = h('input', { id: 'lat', type: 'number', step: 'any', required: true });
const lon = h('input', { id: 'lon', type: 'number', step: 'any', required: true });
const radius = h('input', { id: 'radius', type: 'number', min: 10, max: 5000, required: true, value: 300 });
const orgKey = h('input', { id: 'okey', type: 'password', autocomplete: 'off', placeholder: 'Only if the server requires one' });

const submit = h('button', { type: 'submit', text: 'Create project' });
const form = h('form', {
  onsubmit: async (e) => {
    e.preventDefault();
    clear(result);
    const rows = [...stageRows.children].map((r) => Object.fromEntries([...r.querySelectorAll('[data-f]')].map((i) => [i.dataset.f, i.value])));
    const body = {
      title: title.value,
      worker: { name: workerName.value, email: workerEmail.value },
      site: { lat: Number(lat.value), lon: Number(lon.value), radiusM: Number(radius.value) },
      stages: rows.map((r) => ({ title: r.title, spec: r.spec, pct: Number(r.pct), window: { from: new Date(r.from).toISOString(), to: new Date(r.to).toISOString() } })),
    };
    submit.disabled = true;
    try {
      const r = await api('POST', '/api/projects', { body, headers: orgKey.value ? { 'x-organizer-key': orgKey.value } : {} });
      clear(result).append(h('div', { class: 'notice ok' },
        h('strong', { text: 'Project created.' }),
        h('p', {}, h('a', { href: `/?project=${r.id}`, text: 'Donor page (share this)' })),
        h('p', {}, h('a', { href: r.workerLink, text: 'Worker link (private, contains the worker key)' })),
        h('p', { class: 'small', text: 'Give the worker link only to the worker. Donors need only the donor page.' })));
    } catch (err) { showError(result, err); } finally { submit.disabled = false; }
  },
},
h('div', { class: 'grid cols-2' },
  h('div', { class: 'field' }, h('label', { for: 'title', text: 'Project title' }), title),
  h('div', { class: 'field' }, h('label', { for: 'wname', text: 'Worker name' }), workerName),
  h('div', { class: 'field' }, h('label', { for: 'wemail', text: 'Worker PayPal email (the only account that can be paid)' }), workerEmail)),
h('h2', { text: 'Job site', style: 'margin-top:1rem' }),
h('div', { class: 'grid cols-3' },
  h('div', { class: 'field' }, h('label', { for: 'lat', text: 'Latitude' }), lat),
  h('div', { class: 'field' }, h('label', { for: 'lon', text: 'Longitude' }), lon),
  h('div', { class: 'field' }, h('label', { for: 'radius', text: 'Allowed distance (metres)' }), radius)),
h('h2', { text: 'Stages', style: 'margin-top:1rem' }),
h('p', { class: 'muted small', text: 'The shares must add up to exactly 100%. Each stage gets its own one-time code.' }),
stageRows,
h('div', { class: 'row' }, h('button', { type: 'button', class: 'secondary', text: 'Add a stage', onclick: () => addStage() }), h('button', { type: 'button', class: 'secondary', text: 'Use the water-pump example', onclick: template })),
h('div', { class: 'field', style: 'margin-top:1rem' }, h('label', { for: 'okey', text: 'Organizer key (optional)' }), orgKey),
submit);

clear(app).append(h('h1', { text: 'New project' }), h('p', { class: 'muted', text: 'Describe the job, who gets paid, and the stages. Donors reserve money; each stage is paid only after its evidence is verified.' }), h('section', { class: 'card' }, form, result));
template();

// Third-party UI components, loaded on demand from /vendor/* (served out of node_modules):
//   - AG Grid Community  (MIT): the money ledger and the audit log as sortable, filterable tables
//   - AG Charts Community (MIT): funds by stage
//   - Bryntum Gantt (commercial trial, optional dependency): the stage timeline
// Every renderer returns false when its library is unavailable, and the caller keeps showing
// the plain HTML version. Nothing here is required for the app to work.
import { buildPlan, planSignature } from '/plan.js';

const loaded = new Map();
export function loadScript(src) {
  if (!loaded.has(src)) {
    loaded.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => { loaded.delete(src); reject(new Error(`could not load ${src}`)); };
      document.head.append(s);
    }));
  }
  return loaded.get(src);
}
function loadCss(href) {
  if (!document.querySelector(`link[href="${href}"]`)) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href }));
}

const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; };
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const usd = (n) => `$${Number(n).toFixed(2)}`;
let vendors = null;
export const setVendors = (list) => { vendors = new Set(list); };
const has = (prefix) => vendors?.has(prefix);

// ---------------------------------------------------------------- AG Grid

async function grid() {
  await loadScript('/vendor/ag-grid/ag-grid-community.min.js');
  return window.agGrid;
}

function theme(ag) {
  return ag.themeQuartz.withParams({
    backgroundColor: cssVar('--card'), foregroundColor: cssVar('--ink'), headerBackgroundColor: cssVar('--bg'),
    headerTextColor: cssVar('--muted'), borderColor: cssVar('--line'), accentColor: cssVar('--brand'),
    fontFamily: 'inherit', fontSize: 14, wrapperBorderRadius: 10,
  });
}

/** Mount (or update) a grid inside `host`, with a quick-filter box. Returns false if AG Grid is unavailable. */
async function mountGrid(host, { columns, rows, filterLabel }) {
  if (!has('/vendor/ag-grid/')) return false;
  let ag;
  try { ag = await grid(); } catch { return false; }
  if (host._gridApi) { host._gridApi.setGridOption('rowData', rows); return true; }

  host.replaceChildren();
  const box = document.createElement('input');
  box.type = 'search';
  box.placeholder = filterLabel;
  box.setAttribute('aria-label', filterLabel);
  box.style.marginBottom = '8px';
  const el = document.createElement('div');
  el.style.height = '320px';
  host.append(box, el);
  const api = ag.createGrid(el, {
    theme: theme(ag),
    columnDefs: columns,
    rowData: rows,
    defaultColDef: { sortable: true, filter: true, resizable: true },
    pagination: rows.length > 8,
    paginationPageSize: 8,
    paginationPageSizeSelector: false,
    domLayout: rows.length <= 8 ? 'autoHeight' : 'normal',
    suppressCellFocus: true,
  });
  if (rows.length <= 8) el.style.height = '';
  box.addEventListener('input', () => api.setGridOption('quickFilterText', box.value));
  host._gridApi = api;
  return true;
}

export const renderLedgerGrid = (host, rows) => mountGrid(host, {
  rows,
  filterLabel: 'Filter the ledger',
  columns: [
    { field: 'stage', headerName: 'Stage', width: 110 },
    { field: 'kind', headerName: 'Movement', flex: 1, minWidth: 170 },
    { field: 'party', headerName: 'Who', flex: 1, minWidth: 110 },
    { field: 'amount', headerName: 'Amount', width: 110, type: 'rightAligned', valueFormatter: (p) => usd(p.value) },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'ref', headerName: 'PayPal reference', flex: 1, minWidth: 150 },
  ],
});

export const renderAuditGrid = (host, rows) => mountGrid(host, {
  rows,
  filterLabel: 'Filter the audit log',
  columns: [
    { field: 'seq', headerName: '#', width: 80, sort: 'desc' },
    { field: 'what', headerName: 'What happened', flex: 3, minWidth: 260 },
    { field: 'when', headerName: 'When', flex: 1, minWidth: 150 },
    { field: 'hash', headerName: 'Hash', width: 110, cellClass: 'mono' },
  ],
});

// ---------------------------------------------------------------- AG Charts

export async function renderFundsChart(host, stages) {
  if (!has('/vendor/ag-charts/')) return false;
  try { await loadScript('/vendor/ag-charts/ag-charts-community.min.js'); } catch { return false; }
  const { AgCharts } = window.agCharts ?? {};
  if (!AgCharts) return false;
  const data = stages.map((s) => ({ stage: s.label, paid: s.paid, settling: s.settling, waiting: s.waiting }));
  const opts = {
    data,
    theme: isDark() ? 'ag-default-dark' : 'ag-default',
    background: { fill: 'transparent' },
    animation: { enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches },
    title: { text: 'Funds by stage (USD)' },
    height: 260,
    series: [
      { type: 'bar', xKey: 'stage', yKey: 'paid', yName: 'Paid to the worker', stacked: true, fill: cssVar('--ok') },
      { type: 'bar', xKey: 'stage', yKey: 'settling', yName: 'Sent, settling', stacked: true, fill: cssVar('--accent') },
      { type: 'bar', xKey: 'stage', yKey: 'waiting', yName: 'Held until verified', stacked: true, fill: cssVar('--line') },
    ],
    axes: { x: { type: 'category', position: 'bottom' }, y: { type: 'number', position: 'left', label: { formatter: (p) => usd(p.value) } } },
  };
  if (host._chart) { host._chart.update(opts); return true; }
  host.replaceChildren();
  host._chart = AgCharts.create({ ...opts, container: host });
  return true;
}

// ---------------------------------------------------------------- Bryntum Gantt (trial, optional)

/** Draws the stage timeline. Returns false if the Gantt is not installed or fails to start. */
export async function renderGantt(host, view) {
  if (!has('/vendor/bryntum/')) return false;
  const sig = planSignature(view);
  if (host._sig === sig) return true;
  try {
    loadCss('/vendor/bryntum/gantt.css');
    loadCss(`/vendor/bryntum/${isDark() ? 'stockholm-dark' : 'stockholm-light'}.css`);
    await loadScript('/vendor/bryntum/gantt.umd.js');
    const { Gantt } = window.bryntum.gantt;
    const plan = buildPlan(view);
    host._gantt?.destroy();
    host.replaceChildren();
    host._gantt = new Gantt({
      appendTo: host,
      height: 340,
      readOnly: true, // donors look; nobody drags a stage around
      startDate: plan.start,
      endDate: plan.end,
      viewPreset: 'weekAndDayLetter',
      project: { tasks: plan.tasks, dependencies: plan.dependencies },
      columns: [
        { type: 'name', text: 'Stage / payment', width: 220 },
        { text: 'Status', width: 210, renderer: ({ record }) => record.originalData?.detail ?? '' },
      ],
      features: { taskTooltip: true, dependencies: true, projectLines: false },
    });
    await host._gantt.project.commitAsync();
    host._gantt.zoomToFit({ leftMargin: 24, rightMargin: 24 });
    host._sig = sig;
    return true;
  } catch (err) {
    console.warn('timeline unavailable, using the plain stage list:', err.message);
    host._gantt?.destroy?.();
    host._gantt = null;
    return false;
  }
}

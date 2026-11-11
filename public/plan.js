// Turns a project view into the tasks and dependencies of a stage timeline. Pure data: no DOM,
// no library, so it is unit tested in Node and used by the Bryntum Gantt in the browser.
//
// Honesty note: a Gantt needs bars with a width. Real stages take days or weeks, but in a quick
// demo a stage can be released seconds after it started, so every bar is drawn at least one day
// wide. The exact release time is always in the task name.

const DAY = 86400000;
const fmtTime = (iso) => new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const usd = (n) => `$${Number(n).toFixed(2)}`;

export function buildPlan(v, now = Date.now()) {
  const total = Number(v.totals.reserved);
  const deadline = Math.max(...v.stages.map((s) => Date.parse(s.window.to)));
  let cursor = v.startedAt ? Date.parse(v.startedAt) : now;
  let pendingLeft = v.stages.filter((s) => s.status === 'PENDING').length;
  const tasks = [];
  const dependencies = [];

  v.stages.forEach((s, i) => {
    const start = cursor;
    let end;
    let percentDone;
    const label = `Stage ${i + 1}: ${s.title}`;
    let detail;
    if (s.status === 'RELEASED') {
      const at = s.releasedAt ? Date.parse(s.releasedAt) : start + DAY;
      end = Math.max(at, start + DAY);
      percentDone = 100;
      detail = s.releasedAt ? `Verified ${fmtTime(s.releasedAt)}` : 'Verified';
    } else if (s.status === 'ACTIVE') {
      end = Math.max(now, start + 2 * DAY);
      percentDone = s.submissions.length ? 60 : 25;
      detail = s.submissions.length ? 'Evidence under review' : 'Waiting for evidence';
    } else {
      end = start + Math.max(DAY, (Math.max(deadline, start + pendingLeft * DAY) - start) / pendingLeft);
      percentDone = 0;
      pendingLeft -= 1;
      detail = 'Blocked until the previous stage is verified';
    }

    const pay = s.release?.payout;
    const payState = pay ? (pay.state ?? 'paid') : null;
    const amount = pay ? pay.amount : (total * s.pct) / 100;
    const payLabel = !pay ? `${usd(amount)} released on verification`
      : payState === 'paid' ? `${usd(amount)} paid`
        : payState === 'pending' ? `${usd(amount)} sent, settling`
          : `${usd(amount)} payout needs attention`;

    tasks.push({ id: `S${i + 1}`, name: label, detail, startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString(), percentDone, cls: `st-${s.status.toLowerCase()}` });
    tasks.push({ id: `M${i + 1}`, name: payLabel, detail: payState ? `Payout ${payState === 'paid' ? 'settled' : payState}` : 'Released when the stage is verified', startDate: new Date(end).toISOString(), duration: 0, cls: `pay-${payState ?? 'planned'}` });
    dependencies.push({ id: `dm${i + 1}`, fromTask: `S${i + 1}`, toTask: `M${i + 1}`, type: 2 });
    if (i > 0) dependencies.push({ id: `ds${i + 1}`, fromTask: `S${i}`, toTask: `S${i + 1}`, type: 2 });
    cursor = end;
  });

  return { tasks, dependencies, start: tasks[0].startDate, end: new Date(cursor + 2 * DAY).toISOString() };
}

/** A string that changes when anything the timeline shows changes (to avoid redrawing needlessly). */
export const planSignature = (v) => JSON.stringify(v.stages.map((s) => [s.status, s.releasedAt, s.submissions.length, s.release?.payout?.state]));

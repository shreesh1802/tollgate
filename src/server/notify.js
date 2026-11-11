// Tell a human when a case needs them. Posts a small JSON message to a webhook (Zapier "Catch Hook",
// a Slack incoming webhook, or anything that accepts JSON). The message never contains a key,
// a worker link, or the uploaded image: only what the verifier needs to decide whether to look.
//
// Failures are logged and swallowed: a broken webhook must never break an upload.

export function makeWebhookNotifier({ url, publicUrl, fetchImpl = globalThis.fetch, maxPerHour = 20, now = Date.now, timeoutMs = 5000, allowInsecure = false, log = console }) {
  const target = new URL(url);
  if (target.protocol !== 'https:' && !allowInsecure) throw new Error('NOTIFY_WEBHOOK_URL must be an https URL');
  const sent = [];

  return async function notify(event) {
    const cutoff = now() - 3600_000;
    while (sent.length && sent[0] < cutoff) sent.shift();
    if (sent.length >= maxPerHour) {
      log.warn?.('verifier notification skipped: hourly limit reached');
      return false;
    }
    sent.push(now());

    const reasons = (event.reasons ?? []).map((r) => `${r.rule}${r.detail ? ` (${r.detail})` : ''}`);
    const failed = event.kind === 'release_failed';
    const message = {
      event: failed ? 'release_failed' : 'review_needed',
      title: failed
        ? `Payment failed for ${event.project.title}: ${event.stage.title}`
        : `Review needed: ${event.project.title}, ${event.stage.title}`,
      text: failed
        ? `The evidence for "${event.stage.title}" was accepted but the payment provider failed (${event.error ?? 'unknown error'}). Open the verifier page to retry.`
        : `A submission for "${event.stage.title}" (${event.stage.spec}) could not be decided automatically: ${reasons.join('; ') || 'no reason recorded'}. Open the verifier page to approve or reject it.`,
      project: { id: event.project.id, title: event.project.title },
      stage: { id: event.stage.id, title: event.stage.title },
      submission: event.submissionId,
      reasons,
      reviewUrl: `${publicUrl}/verify.html`, // the page asks for the verifier key; it is never put in this message
      at: new Date(now()).toISOString(),
    };

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(target, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(message), signal: ctl.signal });
      if (!res.ok) log.warn?.(`verifier notification got HTTP ${res.status}`);
      return res.ok;
    } catch (err) {
      log.warn?.(`verifier notification failed: ${err.message}`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  };
}

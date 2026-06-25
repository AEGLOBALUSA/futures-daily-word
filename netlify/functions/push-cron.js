/**
 * Scheduled trigger for the daily reading reminders.
 *
 * Netlify runs this hourly (see netlify.toml [functions."push-cron"].schedule).
 * push-send.js does the real work and decides, per subscriber, whether it's their
 * preferred local hour right now — so running hourly covers every timezone. We just
 * invoke it with the CRON_SECRET Bearer it requires (push-send rejects unauthenticated
 * callers). Keeping the cron a thin caller means the working sender is untouched.
 */
exports.handler = async () => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('push-cron: CRON_SECRET not set — cannot trigger push-send');
    return { statusCode: 500, body: JSON.stringify({ error: 'CRON_SECRET not configured' }) };
  }
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://futuresdailyword.com';
  try {
    const res = await fetch(`${base}/.netlify/functions/push-send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.text();
    console.log(`push-cron → push-send: ${res.status} ${body}`);
    return { statusCode: res.ok ? 200 : 502, body };
  } catch (err) {
    console.error('push-cron error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};

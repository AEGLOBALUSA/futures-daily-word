const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  try {
    const { action, subscription, timezone, preferredHour } = JSON.parse(event.body);
    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing subscription' }) };
    }

    const key = crypto.createHash('sha256').update(subscription.endpoint).digest('hex').slice(0, 32);
    const store = getStore({ name: 'push-subscriptions', siteID: process.env.NETLIFY_SITE_ID || '', token: process.env.BLOB_TOKEN || '' });

    if (action === 'subscribe') {
      await store.setJSON(key, {
        subscription, timezone: timezone || 'America/New_York',
        preferredHour: preferredHour || 7,
        createdAt: new Date().toISOString(), active: true
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'subscribed' }) };
    }
    if (action === 'unsubscribe') {
      try { await store.delete(key); } catch (e) {}
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'unsubscribed' }) };
    }
    if (action === 'update') {
      try {
        const existing = await store.get(key, { type: 'json' });
        if (existing) {
          existing.preferredHour = preferredHour ?? existing.preferredHour;
          existing.timezone = timezone || existing.timezone;
          await store.setJSON(key, existing);
        }
      } catch (e) {
        await store.setJSON(key, { subscription, timezone: timezone || 'America/New_York', preferredHour: preferredHour || 7, createdAt: new Date().toISOString(), active: true });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'updated' }) };
    }
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    console.error('push-subscribe error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error', detail: err.message }) };
  }
};

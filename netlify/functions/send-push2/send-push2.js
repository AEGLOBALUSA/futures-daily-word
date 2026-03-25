// Use Netlify Blobs REST API directly instead of @netlify/blobs package
async function listBlobs(siteID, token, storeName) {
  const url = `https://api.netlify.com/api/v1/blobs/${siteID}/${storeName}`;
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`Blob list failed: ${resp.status}`);
  return resp.json();
}

async function getBlob(siteID, token, storeName, key) {
  const url = `https://api.netlify.com/api/v1/blobs/${siteID}/${storeName}/${key}`;
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!resp.ok) return null;
  return resp.json();
}

async function deleteBlob(siteID, token, storeName, key) {
  const url = `https://api.netlify.com/api/v1/blobs/${siteID}/${storeName}/${key}`;
  await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL;
    if (!vapidEmail) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'VAPID_EMAIL not configured' }) };
    }
    const siteID = process.env.NETLIFY_SITE_ID || '';
    const token = process.env.BLOB_TOKEN || '';

    if (!vapidPublic || !vapidPrivate) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'VAPID keys not configured' }) };
    }

    const webpush = require('web-push');
    webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

    const blobData = await listBlobs(siteID, token, 'push-subscriptions');
    const blobs = blobData.blobs || [];
    let sent = 0, failed = 0, skipped = 0;

    for (const blob of blobs) {
      try {
        const record = await getBlob(siteID, token, 'push-subscriptions', blob.key);
        if (!record || !record.active || !record.subscription) { skipped++; continue; }

        const now = new Date();
        const userTime = new Date(now.toLocaleString('en-US', { timeZone: record.timezone || 'America/New_York' }));
        const userHour = userTime.getHours();
        if (userHour !== (record.preferredHour || 7)) { skipped++; continue; }

        const payload = JSON.stringify({
          title: 'Daily Word',
          body: 'Your daily reading is ready. Tap to open.',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          url: '/'
        });

        await webpush.sendNotification(record.subscription, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          try { await deleteBlob(siteID, token, 'push-subscriptions', blob.key); } catch (e) {}
        }
        failed++;
      }
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, sent, failed, skipped, total: blobs.length }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error', detail: err.message }) };
  }
};

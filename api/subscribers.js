// Vercel Serverless Function — view / export the subscriber list.
//
// Protected by a shared secret. Set an ADMIN_TOKEN environment variable in
// the Vercel dashboard, then call:
//   GET /api/subscribers?token=YOUR_TOKEN            -> JSON
//   GET /api/subscribers?token=YOUR_TOKEN&format=csv -> CSV download
// (the token may also be sent as an "Authorization: Bearer YOUR_TOKEN" header)

async function redis(command) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis is not configured');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error('Redis request failed: ' + res.status);
  return res.json();
}

module.exports = async (req, res) => {
  const headerToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  const provided = (req.query && req.query.token) || headerToken;
  if (!process.env.ADMIN_TOKEN || provided !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const out = await redis(['HGETALL', 'subscribers']);
    const flat = (out && out.result) || [];
    const rows = [];
    for (let i = 0; i < flat.length; i += 2) {
      let meta = {};
      try { meta = JSON.parse(flat[i + 1]); } catch (e) { /* ignore */ }
      rows.push({ email: flat[i], subscribed_at: meta.ts || '', ref: meta.ref || '' });
    }
    rows.sort((a, b) => (a.subscribed_at < b.subscribed_at ? 1 : -1));

    const format = String((req.query && req.query.format) || '').toLowerCase();
    if (format === 'csv') {
      const esc = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
      const csv = ['email,subscribed_at,ref']
        .concat(rows.map((r) => [esc(r.email), esc(r.subscribed_at), esc(r.ref)].join(',')))
        .join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
      return res.status(200).send(csv);
    }

    return res.status(200).json({ ok: true, count: rows.length, subscribers: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

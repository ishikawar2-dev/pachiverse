// Vercel Serverless Function — view / export the subscriber list.
//
// Protected by a shared secret. Set an ADMIN_TOKEN environment variable in
// the Vercel dashboard, then call with the token in the Authorization header:
//   curl -H "Authorization: Bearer YOUR_TOKEN" https://pachiverse.com/api/subscribers
//   curl -H "Authorization: Bearer YOUR_TOKEN" "https://pachiverse.com/api/subscribers?format=csv" -o subscribers.csv
//
// 2026-09-21: the "?token=" query-string form was removed (tokens in URLs end up
// in access logs, browser history and referrers). The comparison is constant-time.

const crypto = require('crypto');

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

// Constant-time comparison. Both sides are hashed first so the buffers always
// have the same length (timingSafeEqual throws on length mismatch, which would
// itself leak the token length).
function tokenMatches(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string' || expected.length < 16) return false;
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Only the "Bearer <token>" form is accepted (a bare token without the scheme is rejected).
  const authHeader = String(req.headers['authorization'] || '');
  const m = /^Bearer\s+(\S+)\s*$/i.exec(authHeader);
  if (!m || !tokenMatches(m[1], process.env.ADMIN_TOKEN || '')) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="subscribers"');
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const out = await redis(['HGETALL', 'subscribers']);
    const flat = (out && out.result) || [];
    const rows = [];
    let malformed = 0;
    for (let i = 0; i < flat.length; i += 2) {
      let meta = {};
      try {
        meta = JSON.parse(flat[i + 1]) || {};
      } catch (e) {
        malformed += 1; // keep the row (email is the hash field); the metadata is just unreadable
      }
      rows.push({ email: flat[i], subscribed_at: meta.ts || '', ref: meta.ref || '' });
    }
    rows.sort((a, b) => (a.subscribed_at < b.subscribed_at ? 1 : -1));

    const format = String((req.query && req.query.format) || '').toLowerCase();
    if (format === 'csv') {
      // Quote every cell and neutralise spreadsheet formula injection: a cell that starts with
      // = + - @ or a tab/CR is prefixed with a single quote so Excel / LibreOffice treat it as text
      // (emails may legitimately start with + or -; `ref` is server-validated but escaped anyway).
      const esc = (s) => {
        let v = String(s == null ? '' : s);
        if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
        return '"' + v.replace(/"/g, '""') + '"';
      };
      const csv = ['email,subscribed_at,ref']
        .concat(rows.map((r) => [esc(r.email), esc(r.subscribed_at), esc(r.ref)].join(',')))
        .join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
      return res.status(200).send(csv);
    }

    return res.status(200).json({ ok: true, count: rows.length, malformed_meta: malformed, subscribers: rows });
  } catch (err) {
    console.error('[subscribers] ' + (err && err.message ? err.message : String(err)));
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

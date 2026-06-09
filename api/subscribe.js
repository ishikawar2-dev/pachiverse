// Vercel Serverless Function — stores newsletter subscribers in Redis.
//
// Storage: a Redis hash named "subscribers" where each field is a unique
// email address and the value is JSON metadata ({ ts, ref }). Using the
// email as the hash field makes duplicates collapse automatically.
//
// Required environment variables (auto-injected by the Vercel Redis /
// Upstash integration when you create the store in the dashboard):
//   KV_REST_API_URL
//   KV_REST_API_TOKEN

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    if (!body || typeof body !== 'object') body = {};

    // Honeypot — real users never fill this hidden field; bots do.
    if (body.website) return res.status(200).json({ ok: true });

    const email = String(body.email || '').trim().toLowerCase();
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email' });
    }

    const meta = JSON.stringify({
      ts: new Date().toISOString(),
      ref: String(body.ref || '').slice(0, 120),
    });

    // Only record the first subscription time; ignore if already present.
    await redis(['HSETNX', 'subscribers', email, meta]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

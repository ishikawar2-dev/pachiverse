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
//
// Abuse controls (2026-09-21): honeypot field, email shape check, and a
// per-IP rate limit kept in Redis (fixed windows: 5 / minute, 30 / day).
// The IP is stored only as a truncated SHA-256 in the counter key.

const crypto = require('crypto');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMITS = [
  { name: 'minute', windowSec: 60, max: 5 },
  { name: 'day', windowSec: 86400, max: 30 },
];

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

function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '');
  const first = xff.split(',')[0].trim();
  if (first) return first;
  const real = String(req.headers['x-real-ip'] || '').trim();
  if (real) return real;
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Returns true when the request is within limits. Counters are fixed windows
// (key includes the window start), so no key ever grows past one window.
async function withinRateLimit(req) {
  const ipHash = crypto.createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 24);
  const now = Math.floor(Date.now() / 1000);
  for (const limit of RATE_LIMITS) {
    const windowStart = now - (now % limit.windowSec);
    const key = `subscribe:rl:${limit.name}:${ipHash}:${windowStart}`;
    const incr = await redis(['INCR', key]);
    const count = Number(incr && incr.result);
    if (count === 1) {
      await redis(['EXPIRE', key, String(limit.windowSec + 5)]);
    }
    if (count > limit.max) return false;
  }
  return true;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

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

    // Rate limit before touching the subscriber hash. If Redis is down this
    // throws and we answer 500 (the write below would fail anyway).
    if (!(await withinRateLimit(req))) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }

    const meta = JSON.stringify({
      ts: new Date().toISOString(),
      ref: String(body.ref || '').slice(0, 120),
    });

    // Only record the first subscription time; ignore if already present.
    await redis(['HSETNX', 'subscribers', email, meta]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[subscribe] ' + (err && err.message ? err.message : String(err)));
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

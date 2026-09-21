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
// The counter key holds a truncated SHA-256 of the IP (pseudonymised, not
// anonymised: IPv4 space is small enough to reverse; keys live one window + 5 s).
// The client IP is taken from headers that Vercel itself sets and overwrites
// (x-vercel-forwarded-for / x-forwarded-for); behind another proxy or on
// `vercel dev` those headers are not trustworthy and everyone shares one bucket.

const crypto = require('crypto');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// `ref` is a short campaign / page tag set by our own front-end ('index'). Anything else is dropped
// so nothing formula-like ("=HYPERLINK(...)") or free text ends up in the CSV export.
const REF_RE = /^[a-z0-9_-]{1,64}$/i;
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
  // Vercel sets x-vercel-forwarded-for from its own edge and overwrites client-supplied
  // x-forwarded-for, so the first entry is the real client (not spoofable in this setup).
  for (const name of ['x-vercel-forwarded-for', 'x-forwarded-for']) {
    const first = String(req.headers[name] || '').split(',')[0].trim();
    if (first) return first;
  }
  const real = String(req.headers['x-real-ip'] || '').trim();
  if (real) return real;
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// INCR + EXPIRE in one round trip and atomically (no TTL-less key if we crash between them).
const INCR_WITH_TTL = "local c = redis.call('INCR', KEYS[1]) if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end return c";

// Returns { ok: true } when within limits, or { ok: false, retryAfter } with the seconds left
// in the window that was exceeded. Counters are fixed windows (key includes the window start).
async function checkRateLimit(req) {
  const ipHash = crypto.createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 24);
  const now = Math.floor(Date.now() / 1000);
  for (const limit of RATE_LIMITS) {
    const windowStart = now - (now % limit.windowSec);
    const remaining = limit.windowSec - (now - windowStart);
    const key = `subscribe:rl:${limit.name}:${ipHash}:${windowStart}`;
    const reply = await redis(['EVAL', INCR_WITH_TTL, '1', key, String(remaining + 5)]);
    const count = Number(reply && reply.result);
    if (!Number.isFinite(count) || count < 1) {
      throw new Error('unexpected INCR reply'); // fail closed rather than silently unlimited
    }
    if (count > limit.max) return { ok: false, retryAfter: remaining };
  }
  return { ok: true };
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
    const rl = await checkRateLimit(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(Math.max(1, rl.retryAfter)));
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }

    const refRaw = String(body.ref || '').trim();
    const meta = JSON.stringify({
      ts: new Date().toISOString(),
      ref: REF_RE.test(refRaw) ? refRaw : '',
    });

    // Only record the first subscription time; ignore if already present.
    await redis(['HSETNX', 'subscribers', email, meta]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[subscribe] ' + (err && err.message ? err.message : String(err)));
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

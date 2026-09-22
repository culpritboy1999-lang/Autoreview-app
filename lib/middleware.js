'use strict';
const { q } = require('./db');
const { aiStatus } = require('./ai');
const google = require('./google');

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'auth required' });
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  res.locals.user = q.get(`SELECT id, email, name FROM users WHERE id = ?`, req.session.userId);
  if (!res.locals.user) { req.session = null; return res.redirect('/login'); }
  next();
}

/** Lightweight CSRF protection: verify Origin/Referer host on state-changing requests. */
function originGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const host = req.get('host');
  const origin = req.get('origin') || req.get('referer');
  if (!origin) return next(); // non-browser clients (curl) — fine for this app
  try {
    if (new URL(origin).host !== host) return res.status(403).send('Cross-origin request blocked');
  } catch { return res.status(403).send('Bad origin'); }
  next();
}

/** Tiny in-memory rate limiter for sensitive endpoints. */
function rateLimit(windowMs, max) {
  const hits = new Map();
  return (req, res, next) => {
    const key = `${req.ip || 'ip'}:${req.path}`;
    const now = Date.now();
    const rec = hits.get(key) || { n: 0, start: now };
    if (now - rec.start > windowMs) { rec.n = 0; rec.start = now; }
    rec.n++;
    hits.set(key, rec);
    if (rec.n > max) return res.status(429).send('Too many requests — slow down.');
    next();
  };
}

/** Common template locals. */
function locals(req, res, next) {
  res.locals.ai = aiStatus();
  res.locals.googleReady = google.googleConfigured();
  res.locals.placesReady = Boolean(process.env.PLACES_API_KEY);
  res.locals.path = req.path;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.user = req.session?.userId
    ? q.get(`SELECT id, email, name FROM users WHERE id = ?`, req.session.userId)
    : null;
  next();
}

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

module.exports = { requireAuth, originGuard, rateLimit, locals, setFlash };

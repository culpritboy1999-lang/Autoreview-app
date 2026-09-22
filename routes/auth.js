'use strict';
/** Owner authentication: email+password and Google identity login. */
const express = require('express');
const bcrypt = require('bcryptjs');
const { q } = require('../lib/db');
const { rateLimit, setFlash } = require('../lib/middleware');
const google = require('../lib/google');

const router = express.Router();
const guard = rateLimit(10 * 60 * 1000, 30);

function safeNext(raw) {
  return typeof raw === 'string' && raw.startsWith('/dashboard') ? raw : '/dashboard';
}

router.get('/login', (req, res) => {
  if (req.session?.userId) return res.redirect('/dashboard');
  res.render('login', { title: 'Log in — AutoReview', next: safeNext(req.query.next), error: null, googleReady: google.googleConfigured() });
});

router.post('/login', guard, (req, res) => {
  const { email, password } = req.body || {};
  const user = q.get(`SELECT * FROM users WHERE email = ?`, String(email || '').trim().toLowerCase());
  if (!user || !user.password_hash || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    return res.status(401).render('login', {
      title: 'Log in — AutoReview', next: safeNext(req.body.next),
      error: 'Wrong email or password. Try demo@autoreview.app / demo1234', googleReady: google.googleConfigured(),
    });
  }
  req.session.userId = user.id;
  setFlash(req, 'success', `Welcome back, ${user.name.split(' ')[0]}!`);
  res.redirect(safeNext(req.body.next));
});

router.get('/signup', (req, res) => {
  if (req.session?.userId) return res.redirect('/dashboard');
  res.render('signup', { title: 'Create your account — AutoReview', error: null, googleReady: google.googleConfigured() });
});

router.post('/signup', guard, (req, res) => {
  const { name, email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!name || !cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return res.status(400).render('signup', { title: 'Create your account — AutoReview', error: 'Please enter a valid name and email.', googleReady: google.googleConfigured() });
  }
  if (String(password || '').length < 8) {
    return res.status(400).render('signup', { title: 'Create your account — AutoReview', error: 'Password must be at least 8 characters.', googleReady: google.googleConfigured() });
  }
  if (q.get(`SELECT id FROM users WHERE email = ?`, cleanEmail)) {
    return res.status(409).render('signup', { title: 'Create your account — AutoReview', error: 'That email already has an account — try logging in.', googleReady: google.googleConfigured() });
  }
  const info = q.run(`INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)`, cleanEmail, bcrypt.hashSync(String(password), 10), String(name).trim().slice(0, 80));
  req.session.userId = Number(info.lastInsertRowid);
  setFlash(req, 'success', 'Account created! Connect your first business to start auto-answering reviews.');
  res.redirect('/dashboard/connect');
});

router.post('/logout', (req, res) => { req.session = null; res.redirect('/'); });

/* ---------------- Google identity login ---------------- */
router.get('/google', (req, res) => {
  if (!google.googleConfigured()) return res.redirect('/login?error=google');
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
  res.redirect(google.loginUrl(redirectUri, safeNext(req.query.next)));
});

router.get('/google/callback', async (req, res, next) => {
  try {
    if (!req.query.code) return res.redirect('/login');
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    const tokens = await google.exchangeCode(String(req.query.code), redirectUri);
    // id_token payload (direct from Google's token endpoint over TLS)
    const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString('utf8'));
    const email = String(payload.email || '').toLowerCase();
    if (!email) return res.redirect('/login');
    let user = q.get(`SELECT * FROM users WHERE email = ?`, email);
    if (!user) {
      const info = q.run(
        `INSERT INTO users (email, name, google_id) VALUES (?, ?, ?)`,
        email, String(payload.name || email.split('@')[0]).slice(0, 80), String(payload.sub || '')
      );
      user = { id: Number(info.lastInsertRowid), name: payload.name || email };
      setFlash(req, 'success', 'Account created with Google! Connect your first business to continue.');
      req.session.userId = user.id;
      return res.redirect('/dashboard/connect');
    }
    if (!user.google_id) q.run(`UPDATE users SET google_id = ? WHERE id = ?`, String(payload.sub || ''), user.id);
    req.session.userId = user.id;
    setFlash(req, 'success', `Welcome, ${String(user.name).split(' ')[0]}!`);
    res.redirect(safeNext(req.query.state));
  } catch (e) { next(e); }
});

module.exports = router;

'use strict';
const express = require('express');
require('dotenv').config();
const path = require('path');

const { seedIfEmpty } = require('./lib/seed');
const { originGuard, locals } = require('./lib/middleware');
const { startWorker } = require('./lib/pipeline');
const { aiStatus } = require('./lib/ai');

seedIfEmpty();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: true, limit: '256kb' }));
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

const cookieSession = require('cookie-session');
app.use(cookieSession({
  name: 'autoreview.sid',
  keys: [process.env.SESSION_SECRET || 'autoreview-dev-secret-change-me'],
  maxAge: 14 * 24 * 3600 * 1000, // 14 days
  sameSite: 'lax',
  httpOnly: true,
}));

app.use(originGuard);
app.use(locals);

app.get('/healthz', (req, res) => res.json({ ok: true, ai: aiStatus() }));

app.use('/', require('./routes/public'));
app.use('/', require('./routes/auth'));   // /login, /signup (and /auth/* equivalents below)
app.use('/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/api_public'));
app.use('/dashboard', require('./routes/dashboard'));

app.use((req, res) => res.status(404).render('error', { title: 'Page not found', code: 404, message: 'That page drifted off the map.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server]', err);
  res.status(500).render('error', { title: 'Something went wrong', code: 500, message: 'Our kitchen dropped a plate. Try again in a moment.' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  const ai = aiStatus();
  console.log(`AutoReview running on http://0.0.0.0:${PORT}`);
  console.log(`AI engine: ${ai.label}`);
});

startWorker(Number(process.env.SYNC_INTERVAL_MS) || 90000);

module.exports = { app, server };

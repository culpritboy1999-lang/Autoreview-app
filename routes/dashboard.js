'use strict';
/** Shop-owner dashboard: reviews inbox, brand identity, business connection. */
const express = require('express');
const { q } = require('../lib/db');
const { requireAuth, setFlash } = require('../lib/middleware');
const pipeline = require('../lib/pipeline');
const google = require('../lib/google');
const { generateReviewReply } = require('../lib/ai');

const router = express.Router();
router.use(requireAuth);

/* Helper: business ids owned by the logged-in user. */
function myBusinesses(userId) {
  return q.all(`SELECT * FROM businesses WHERE owner_id = ? ORDER BY id`, userId);
}
function myBusiness(userId, id) {
  return q.get(`SELECT * FROM businesses WHERE id = ? AND owner_id = ?`, id, userId);
}
function withBrand(b) {
  return { ...b, brand: q.get(`SELECT * FROM brand_identity WHERE business_id = ?`, b.id) || {} };
}

/* ---------------- Overview ---------------- */
router.get('/', (req, res) => {
  const businesses = myBusinesses(req.session.userId).map(withBrand);
  const ids = businesses.map((b) => b.id);
  const stats = { newReviews: 0, pending: 0, autoReplied: 0, avg: 0 };
  let activity = [];
  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    const agg = q.get(
      `SELECT SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS newReviews,
              SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status IN ('auto_replied','replied') THEN 1 ELSE 0 END) AS answered,
              AVG(rating) AS avg
       FROM reviews WHERE business_id IN (${ph})`, ...ids
    );
    Object.assign(stats, {
      newReviews: agg.newReviews || 0, pending: agg.pending || 0, autoReplied: agg.answered || 0,
      avg: agg.avg ? Math.round(agg.avg * 10) / 10 : 0,
    });
    activity = q.all(
      `SELECT r.*, b.name AS business_name FROM reviews r JOIN businesses b ON b.id = r.business_id
       WHERE r.business_id IN (${ph}) ORDER BY r.fetched_at DESC, r.id DESC LIMIT 8`, ...ids
    );
  }
  const pendingByBusiness = {};
  for (const b of businesses) {
    pendingByBusiness[b.id] = q.get(
      `SELECT COUNT(*) AS c FROM reviews WHERE business_id = ? AND status = 'pending_approval'`, b.id
    ).c;
  }
  res.render('dashboard/overview', { title: 'Dashboard — AutoReview', businesses, stats, activity, pendingByBusiness });
});

/* ---------------- Reviews inbox ---------------- */
router.get('/reviews', (req, res) => {
  const businesses = myBusinesses(req.session.userId).map(withBrand);
  const filter = ['pending', 'all', 'auto'].includes(req.query.filter) ? req.query.filter : 'all';
  const selectedId = Number(req.query.business) || null;
  const allowed = businesses.some((b) => b.id === selectedId);
  const bid = allowed ? selectedId : (businesses[0]?.id || null);

  let pending = [], others = [];
  if (bid) {
    pending = q.all(
      `SELECT r.*, b.name AS business_name FROM reviews r JOIN businesses b ON b.id = r.business_id
       WHERE r.business_id = ? AND r.status = 'pending_approval' ORDER BY r.rating ASC, r.fetched_at DESC`, bid
    );
    others = q.all(
      `SELECT r.*, b.name AS business_name FROM reviews r JOIN businesses b ON b.id = r.business_id
       WHERE r.business_id = ? AND r.status != 'pending_approval'
       ORDER BY CASE r.status WHEN 'new' THEN 0 ELSE 1 END, r.fetched_at DESC LIMIT 60`, bid
    );
  }
  const counts = bid
    ? q.get(`SELECT SUM(status = 'pending_approval') AS pending, SUM(status = 'auto_replied') AS auto, COUNT(*) AS total FROM reviews WHERE business_id = ?`, bid)
    : { pending: 0, auto: 0, total: 0 };

  res.render('dashboard/reviews', {
    title: 'Reviews — AutoReview', businesses, bid, filter, pending, others,
    counts: counts || {},
    businessNames: Object.fromEntries(businesses.map((b) => [b.id, b.name])),
  });
});

/* Approve (and possibly edit) a draft → post to Google. */
router.post('/reviews/:id/approve', async (req, res, next) => {
  try {
    const review = q.get(
      `SELECT r.* FROM reviews r JOIN businesses b ON b.id = r.business_id WHERE r.id = ? AND b.owner_id = ?`,
      Number(req.params.id), req.session.userId
    );
    if (!review) return res.status(404).json({ ok: false, error: 'Review not found' });
    const text = String(req.body.text || '').trim().slice(0, 4000);
    if (!text) return res.status(400).json({ ok: false, error: 'Reply text is empty' });
    const posted = await pipeline.approveDraft(review.id, text, req.body.source === 'manual' ? 'manual' : 'ai_approved');
    res.json({ ok: posted, status: posted ? 'replied' : 'reply_failed' });
  } catch (e) { next(e); }
});

/* Regenerate the AI draft. */
router.post('/reviews/:id/regenerate', async (req, res, next) => {
  try {
    const review = q.get(
      `SELECT r.*, b.name AS business_name, b.category, b.connection FROM reviews r JOIN businesses b ON b.id = r.business_id
       WHERE r.id = ? AND b.owner_id = ?`, Number(req.params.id), req.session.userId
    );
    if (!review) return res.status(404).json({ ok: false, error: 'Review not found' });
    const business = q.get(`SELECT * FROM businesses WHERE id = ?`, review.business_id);
    const brand = q.get(`SELECT * FROM brand_identity WHERE business_id = ?`, business.id) || {};
    const { text, engine } = await generateReviewReply(business, brand, review);
    q.run(`UPDATE reviews SET reply_text = ?, reply_source = 'ai_draft' WHERE id = ?`, text, review.id);
    res.json({ ok: true, text, engine });
  } catch (e) { next(e); }
});

/* Skip a draft (no reply will be posted). */
router.post('/reviews/:id/skip', (req, res) => {
  const r = q.get(
    `SELECT r.id FROM reviews r JOIN businesses b ON b.id = r.business_id WHERE r.id = ? AND b.owner_id = ?`,
    Number(req.params.id), req.session.userId
  );
  if (!r) return res.status(404).json({ ok: false });
  q.run(`UPDATE reviews SET status = 'skipped' WHERE id = ?`, r.id);
  res.json({ ok: true });
});

/* ---------------- Brand identity ---------------- */
router.get('/brand', (req, res) => {
  const businesses = myBusinesses(req.session.userId).map(withBrand);
  const bid = Number(req.query.business);
  const selected = businesses.find((b) => b.id === bid) || businesses[0] || null;
  res.render('dashboard/brand', { title: 'Brand identity — AutoReview', businesses, selected });
});

const TONES = ['friendly', 'warm', 'professional', 'playful', 'quirky', 'luxurious'];
router.post('/brand', (req, res) => {
  const bid = Number(req.body.business_id);
  const business = myBusiness(req.session.userId, bid);
  if (!business) return res.status(403).send('Not your business');
  const pick = (v, max = 2000) => String(v || '').trim().slice(0, max);
  q.run(
    `INSERT INTO brand_identity (business_id, tone, about, signature, language, rules_do, rules_dont, emoji_policy, reply_length, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(business_id) DO UPDATE SET
       tone = excluded.tone, about = excluded.about, signature = excluded.signature, language = excluded.language,
       rules_do = excluded.rules_do, rules_dont = excluded.rules_dont, emoji_policy = excluded.emoji_policy,
       reply_length = excluded.reply_length, updated_at = datetime('now')`,
    bid, TONES.includes(req.body.tone) ? req.body.tone : 'friendly',
    pick(req.body.about), pick(req.body.signature, 120), pick(req.body.language, 40),
    pick(req.body.rules_do), pick(req.body.rules_dont),
    ['none', 'sparingly', 'freely'].includes(req.body.emoji_policy) ? req.body.emoji_policy : 'sparingly',
    ['short', 'medium', 'long'].includes(req.body.reply_length) ? req.body.reply_length : 'medium'
  );
  setFlash(req, 'success', 'Brand identity saved — the AI now answers in your voice.');
  res.redirect(`/dashboard/brand?business=${bid}`);
});

/* ---------------- Connect a business ---------------- */
router.get('/connect', (req, res) => {
  const businesses = myBusinesses(req.session.userId).map(withBrand);
  res.render('dashboard/connect', { title: 'Connect a business — AutoReview', businesses, error: null });
});

/* Add a demo-mode business (no Google credentials needed). */
router.post('/connect/demo', (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 80);
  if (!name) return res.redirect('/dashboard/connect');
  const info = q.run(
    `INSERT INTO businesses (owner_id, name, category, address, connection, google_location_name, google_place_id)
     VALUES (?, ?, ?, ?, 'demo', ?, ?)`,
    req.session.userId, name, String(req.body.category || '').trim().slice(0, 60),
    String(req.body.address || '').trim().slice(0, 120),
    `locations/demo_${Date.now()}`, `demo_place_${Date.now()}`
  );
  const bid = Number(info.lastInsertRowid);
  q.run(
    `INSERT INTO brand_identity (business_id, tone, language) VALUES (?, 'friendly', 'English')`, bid
  );
  setFlash(req, 'success', `"${name}" added in demo mode — reviews will start flowing in shortly.`);
  res.redirect('/dashboard');
});

/* Real Google Business Profile OAuth. */
router.get('/connect/google', (req, res) => {
  if (!google.googleConfigured()) {
    return res.render('dashboard/connect', {
      title: 'Connect a business — AutoReview', businesses: myBusinesses(req.session.userId),
      error: 'Google Business Profile connection is not configured on this server yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env — or add a demo business to try everything right now.',
    });
  }
  const redirectUri = `${req.protocol}://${req.get('host')}/dashboard/connect/google/callback`;
  res.redirect(google.connectUrl(redirectUri, String(req.session.id || 'x')));
});

router.get('/connect/google/callback', async (req, res, next) => {
  try {
    if (!req.query.code) return res.redirect('/dashboard/connect');
    const redirectUri = `${req.protocol}://${req.get('host')}/dashboard/connect/google/callback`;
    const tokens = await google.exchangeCode(String(req.query.code), redirectUri);
    const accounts = await google.listAccounts(tokens.access_token);
    const locations = [];
    for (const acc of accounts) {
      try { locations.push(...(await google.listLocations(tokens.access_token, acc.name)).map((l) => ({ ...l, account: acc.accountName, accountName2: acc.name }))); }
      catch { /* skip account */ }
    }
    req.session.gbp = { refresh_token: tokens.refresh_token || '', locations };
    res.render('dashboard/connect_picker', { title: 'Choose your location — AutoReview', locations, hasRefresh: Boolean(tokens.refresh_token) });
  } catch (e) {
    console.error('[gbp]', e.message);
    next(e);
  }
});

router.post('/connect/google/save', async (req, res, next) => {
  try {
    const gbp = req.session.gbp || {};
    const loc = (gbp.locations || []).find((l) => l.name === req.body.location);
    if (!loc) return res.status(400).send('Unknown location — reconnect Google.');
    const existing = q.get(`SELECT id FROM businesses WHERE owner_id = ? AND google_location_name = ?`, req.session.userId, loc.name);
    const info = existing
      ? { lastInsertRowid: existing.id }
      : q.run(
        `INSERT INTO businesses (owner_id, name, category, address, connection, google_account_name, google_location_name, google_place_id, google_refresh_token)
         VALUES (?, ?, ?, ?, 'google', ?, ?, ?, ?)`,
        req.session.userId, loc.title, loc.category || 'Business', loc.address || '',
        req.body.account || loc.accountName2 || '', loc.name, loc.placeId || '', gbp.refresh_token || ''
      );
    const bid = Number(info.lastInsertRowid);
    if (!q.get(`SELECT business_id FROM brand_identity WHERE business_id = ?`, bid)) {
      q.run(`INSERT INTO brand_identity (business_id, tone, language) VALUES (?, 'friendly', 'English')`, bid);
    }
    req.session.gbp = null;
    setFlash(req, 'success', `${loc.title} is connected to Google. Pulling your reviews now…`);
    res.redirect('/dashboard');
    const business = q.get(`SELECT * FROM businesses WHERE id = ?`, bid);
    pipeline.syncBusinessReviews(business).catch(() => {});
  } catch (e) { next(e); }
});

/* Disconnect a business. */
router.post('/business/:id/disconnect', (req, res) => {
  const business = myBusiness(req.session.userId, Number(req.params.id));
  if (business) {
    q.run(`DELETE FROM businesses WHERE id = ?`, business.id); // cascades to brand/reviews/perceptions
    setFlash(req, 'info', `${business.name} disconnected and removed.`);
  }
  res.redirect('/dashboard/connect');
});

/* Manual "check Google now" (worker tick). */
router.post('/sync', async (req, res, next) => {
  try {
    const result = await pipeline.tick();
    setFlash(req, 'success', result.skipped ? 'A sync is already running…' : `Sync complete — ${result.synced} new review(s) processed.`);
    res.redirect(req.get('referer') || '/dashboard');
  } catch (e) { next(e); }
});

/* Regenerate the public perception summary. */
router.post('/business/:id/refresh-perception', async (req, res, next) => {
  try {
    const business = myBusiness(req.session.userId, Number(req.params.id));
    if (business) await pipeline.refreshPerception(business);
    res.redirect(req.get('referer') || '/dashboard');
  } catch (e) { next(e); }
});

module.exports = router;

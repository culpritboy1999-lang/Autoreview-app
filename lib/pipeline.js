'use strict';
/**
 * Review pipeline — the heart of AutoReview.
 *
 * For every connected business (demo or real Google):
 *   1. Fetch new reviews (not yet in DB).
 *   2. Classify them (sentiment + topics).
 *   3. 4★ / 5★  → AI writes a brand-aware reply → posted automatically.
 *      ≤ 3★     → AI writes a draft → parked as `pending_approval`.
 *   4. Stats + perception cache refresh.
 *
 * Replies are posted through Google (mybusiness v4) when really connected.
 */

const { q } = require('./db');
const { generateReviewReply, classifyReview, generatePerception } = require('./ai');
const google = require('./google');
const demo = require('./demo');

const DEMO_AUTO_DRAFT = process.env.DEMO_AUTO_DRAFT !== '0';

/** Insert a fetched review if new; returns inserted row or null. */
function upsertReview(businessId, r) {
  const exists = q.get(`SELECT id FROM reviews WHERE business_id = ? AND google_review_id = ?`, businessId, r.googleReviewId);
  if (exists) return null;
  const cls = classifyReview({ rating: r.rating, text: r.text });
  const info = q.run(
    `INSERT INTO reviews (business_id, google_review_id, author_name, author_photo, rating, text, posted_at, status, sentiment, topics)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
    businessId, r.googleReviewId, r.authorName, r.authorPhoto || '', r.rating, r.text || '', r.postedAt || null, cls.sentiment, cls.topics
  );
  return q.get(`SELECT * FROM reviews WHERE id = ?`, Number(info.lastInsertRowid));
}

/** Fetch-and-insert new reviews for one business. Returns count of new reviews. */
async function syncBusinessReviews(business) {
  let incoming = [];
  if (business.connection === 'google') {
    const token = await accessTokenFor(business);
    let pageToken = null;
    for (let page = 0; page < 3; page++) {
      const res = await google.fetchReviews(token, business.google_location_name, pageToken);
      incoming.push(...res.reviews);
      pageToken = res.nextPageToken;
      if (!pageToken) break;
    }
  } else {
    incoming = demo.fetchNewDemoReviews(business);
  }
  let fresh = 0;
  for (const r of incoming) {
    const row = upsertReview(business.id, r);
    if (row) { fresh++; queueProcess(row, business); }
  }
  demo.refreshStats(business.id);
  return fresh;
}

/* ------------------------------------------------------------------ */
/* Processing queue — sequential to be gentle with free AI tiers       */
/* ------------------------------------------------------------------ */
const _queue = [];
let _draining = false;

function queueProcess(review, business) {
  _queue.push({ review, business });
  drain();
}

async function drain() {
  if (_draining) return;
  _draining = true;
  try {
    while (_queue.length) {
      const { review, business } = _queue.shift();
      try {
        await processReview(review, business);
      } catch (e) {
        console.error(`[pipeline] failed on review ${review.id}:`, e.message);
      }
    }
  } finally { _draining = false; }
}

/**
 * Decide + execute the reply policy for one review.
 *  rating >= 4 → auto reply & post
 *  rating  < 4 → draft for approval
 */
async function processReview(review, business) {
  const brand = q.get(`SELECT * FROM brand_identity WHERE business_id = ?`, business.id) || {};
  const { text, engine } = await generateReviewReply(business, brand, review);

  if (review.rating >= 4) {
    const posted = await postReplyToGoogle(business, review.google_review_id, text);
    q.run(
      `UPDATE reviews SET status = ?, reply_text = ?, reply_source = ?, replied_at = datetime('now'), sentiment = ? WHERE id = ?`,
      posted ? 'auto_replied' : 'reply_failed', text, 'ai_auto', review.sentiment || classifyReview(review).sentiment, review.id
    );
    console.log(`[pipeline] #${review.id} ${review.rating}★ auto-${posted ? 'replied' : 'FAILED'} via ${engine}`);
  } else {
    const cls = classifyReview(review);
    const status = DEMO_AUTO_DRAFT || business.connection === 'google' ? 'pending_approval' : 'pending_approval';
    q.run(
      `UPDATE reviews SET status = ?, reply_text = ?, reply_source = ?, sentiment = ?, topics = ? WHERE id = ?`,
      status, text, 'ai_draft', cls.sentiment, cls.topics, review.id
    );
    console.log(`[pipeline] #${review.id} ${review.rating}★ draft parked for approval via ${engine}`);
  }
}

/** Publish a reply via Google or demo surface. */
async function postReplyToGoogle(business, googleReviewId, text) {
  try {
    if (business.connection === 'google') {
      const token = await accessTokenFor(business);
      await google.postReply(token, business.google_location_name, googleReviewId, text);
    } else {
      await demo.postDemoReply(business, googleReviewId, text);
    }
    return true;
  } catch (e) {
    console.error('[pipeline] postReply failed:', e.message);
    return false;
  }
}

/** Owner approved (possibly edited) a draft → post it. */
async function approveDraft(reviewId, finalText, source) {
  const review = q.get(`SELECT * FROM reviews WHERE id = ?`, reviewId);
  if (!review) throw new Error('review not found');
  const business = q.get(`SELECT * FROM businesses WHERE id = ?`, review.business_id);
  const posted = await postReplyToGoogle(business, review.google_review_id, finalText);
  q.run(
    `UPDATE reviews SET status = ?, reply_text = ?, reply_source = ?, replied_at = datetime('now') WHERE id = ?`,
    posted ? 'replied' : 'reply_failed', finalText, source || 'ai_approved', review.id
  );
  demo.refreshStats(business.id);
  return posted;
}

/** Refresh cached access token for a Google-connected business. */
async function accessTokenFor(business) {
  if (!business.google_refresh_token) throw new Error('business missing refresh token');
  const key = `token_cache_${business.id}`;
  const row = q.get(`SELECT value FROM settings WHERE key = ?`, key);
  if (row) {
    const cached = JSON.parse(row.value);
    if (cached.expires_at > Date.now() + 60000) return cached.access_token;
  }
  const fresh = await google.refreshToken(business.google_refresh_token);
  const expires_at = Date.now() + (fresh.expires_in || 3600) * 1000;
  q.run(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, key, JSON.stringify({ access_token: fresh.access_token, expires_at }));
  return fresh.access_token;
}

/* ------------------------------------------------------------------ */
/* Perception cache for the public landing/shop pages                  */
/* ------------------------------------------------------------------ */
async function refreshPerception(business) {
  const reviews = q.all(`SELECT author_name, rating, text FROM reviews WHERE business_id = ? ORDER BY posted_at DESC, id DESC LIMIT 60`, business.id);
  if (!reviews.length) return null;
  const { data, engine } = await generatePerception(business.name, reviews);
  q.run(
    `INSERT INTO perceptions (business_id, data, engine, generated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(business_id) DO UPDATE SET data = excluded.data, engine = excluded.engine, generated_at = datetime('now')`,
    business.id, JSON.stringify(data), engine
  );
  return data;
}

function getCachedPerception(businessId) {
  return q.get(`SELECT * FROM perceptions WHERE business_id = ?`, businessId);
}

/* ------------------------------------------------------------------ */
/* Worker tick — run periodically + on demand (button in dashboard)    */
/* ------------------------------------------------------------------ */
let ticking = false;
async function tick() {
  if (ticking) return { synced: 0, skipped: true };
  ticking = true;
  try {
    const businesses = q.all(`SELECT * FROM businesses`);
    let fresh = 0;
    for (const b of businesses) {
      try { fresh += await syncBusinessReviews(b); }
      catch (e) { console.error(`[worker] sync failed for "${b.name}":`, e.message); }
    }
    // Refresh stale perceptions (older than 12h) in the background.
    const stale = q.all(
      `SELECT b.* FROM businesses b LEFT JOIN perceptions p ON p.business_id = b.id
       WHERE p.business_id IS NULL OR p.generated_at < datetime('now', '-12 hours')`
    );
    for (const b of stale) { try { await refreshPerception(b); } catch { /* non fatal */ } }
    return { synced: fresh };
  } finally { ticking = false; }
}

function startWorker(intervalMs = 90000) {
  setTimeout(() => tick().catch(() => {}), 8000);
  setInterval(() => tick().catch(() => {}), intervalMs);
  console.log(`[worker] auto-responder running every ${Math.round(intervalMs / 1000)}s`);
}

module.exports = { syncBusinessReviews, processReview, approveDraft, refreshPerception, getCachedPerception, tick, startWorker, postReplyToGoogle };

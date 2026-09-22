'use strict';
/** Public landing page + shop perception pages. */
const express = require('express');
const { q } = require('../lib/db');
const { refreshPerception } = require('../lib/pipeline');
const google = require('../lib/google');

const router = express.Router();

router.get('/', (req, res) => {
  const shops = q.all(
    `SELECT id, name, category, address, rating_avg, reviews_total FROM businesses ORDER BY reviews_total DESC`
  );
  const totals = q.get(
    `SELECT COUNT(*) AS reviews,
            SUM(CASE WHEN status IN ('auto_replied','replied') THEN 1 ELSE 0 END) AS answered,
            AVG(rating) AS avg
     FROM reviews`
  );
  res.render('index', {
    title: 'AutoReview — AI Google review responder & shop perception',
    shops, totals: totals || { reviews: 0, answered: 0, avg: 0 },
  });
});

router.get('/shop/:id', async (req, res, next) => {
  try {
    if (String(req.params.id).startsWith('g_')) {
      return res.status(404).render('error', { title: 'Shop not found', code: 404, message: 'Live Google places need a Places API key configured on this server.' });
    }
    const id = Number(req.params.id);
    const shop = q.get(`SELECT * FROM businesses WHERE id = ?`, id);
    if (!shop) return res.status(404).render('error', { title: 'Shop not found', code: 404, message: 'No shop lives at this address.' });

    let perc = q.get(`SELECT * FROM perceptions WHERE business_id = ?`, id);
    if (!perc) {
      await refreshPerception(shop);
      perc = q.get(`SELECT * FROM perceptions WHERE business_id = ?`, id);
    }
    const reviews = q.all(
      `SELECT author_name, rating, text, posted_at, sentiment FROM reviews WHERE business_id = ? ORDER BY posted_at DESC, id DESC LIMIT 30`,
      id
    );
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
    const total = reviews.length || 1;

    res.render('shop', {
      title: `${shop.name} — what guests say`,
      shop, perception: perc ? JSON.parse(perc.data) : null,
      engine: perc?.engine || '', generatedAt: perc?.generated_at || '',
      reviews, dist, total,
    });
  } catch (e) { next(e); }
});

/* Refresh perception on demand (public button, rate limited upstream in api). */
router.post('/shop/:id/refresh', async (req, res, next) => {
  try {
    const shop = q.get(`SELECT * FROM businesses WHERE id = ?`, Number(req.params.id));
    if (!shop) return res.status(404).json({ error: 'not found' });
    await refreshPerception(shop);
    res.redirect(`/shop/${shop.id}`);
  } catch (e) { next(e); }
});

module.exports = router;

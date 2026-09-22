'use strict';
/** Public JSON API: guest shop search on the landing page. */
const express = require('express');
const { q } = require('../lib/db');
const { rateLimit } = require('../lib/middleware');
const google = require('../lib/google');

const router = express.Router();
const guard = rateLimit(60 * 1000, 30);

router.get('/search', guard, async (req, res) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) return res.json({ results: [] });
  const like = `%${term.replace(/[%_]/g, '')}%`;
  const local = q.all(
    `SELECT id, name, category, address, rating_avg AS rating, reviews_total AS ratingsCount, 'local' AS source
     FROM businesses WHERE name LIKE ? OR category LIKE ? OR address LIKE ? ORDER BY reviews_total DESC LIMIT 8`,
    like, like, like
  );
  let googleResults = [];
  if (process.env.PLACES_API_KEY) {
    try { googleResults = (await google.placesSearch(term)).map((r) => ({ ...r, source: 'google' })); }
    catch { /* fall back to local only */ }
  }
  res.json({ results: [...local, ...googleResults] });
});

module.exports = router;

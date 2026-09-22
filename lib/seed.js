'use strict';
/**
 * One-time seed: demo owner, five fictional businesses (with brand identities),
 * their Google-style review history, and a showcase state for the dashboard:
 * some reviews already auto-replied, two negative drafts pending approval.
 */
const bcrypt = require('bcryptjs');
const { q, db } = require('./db');
const { BUSINESSES } = require('./demodata');
const { classifyReview, heuristicReply } = require('./ai');
const { refreshStats } = require('./demo');

function seedIfEmpty() {
  if (q.get(`SELECT value FROM settings WHERE key = 'seeded'`)) return;

  console.log('[seed] creating demo world…');
  const hash = bcrypt.hashSync('demo1234', 10);
  const owner = q.run(
    `INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)`,
    'demo@autoreview.app', hash, 'Demo Owner'
  );
  const other = q.run(
    `INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)`,
    'owners@demoshops.example', bcrypt.hashSync('owners-demo', 10), 'Demo Shop Group'
  );

  for (const B of BUSINESSES) {
    const ownerId = B.slug === 'cafe-aroma' ? Number(owner.lastInsertRowid) : Number(other.lastInsertRowid);
    const b = q.run(
      `INSERT INTO businesses (owner_id, name, category, address, connection, google_location_name, google_place_id, created_at)
       VALUES (?, ?, ?, ?, 'demo', ?, ?, datetime('now'))`,
      ownerId, B.name, B.category, B.address, `locations/demo_${B.slug}`, `demo_place_${B.slug}`
    );
    const bid = Number(b.lastInsertRowid);

    q.run(
      `INSERT INTO brand_identity (business_id, tone, about, signature, language, rules_do, rules_dont, emoji_policy, reply_length, thank_positive, handle_negative)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      bid, B.brand.tone, B.brand.about, B.brand.signature, B.brand.language, B.brand.rules_do,
      B.brand.rules_dont, B.brand.emoji_policy, B.brand.reply_length,
      B.brand.rules_do, B.brand.rules_dont
    );

    const now = Date.now();
    for (const [author, rating, text, daysAgo] of B.reviews) {
      const postedAt = new Date(now - daysAgo * 86400000).toISOString().replace('T', ' ').slice(0, 19);
      const cls = classifyReview({ rating, text });
      const rid = q.run(
        `INSERT INTO reviews (business_id, google_review_id, author_name, rating, text, posted_at, status, sentiment, topics)
         VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
        bid, `demo-seed-${B.slug}-${daysAgo}-${author.replace(/\W/g, '')}`, author, rating, text, postedAt, cls.sentiment, cls.topics
      );
      const id = Number(rid.lastInsertRowid);
      const business = { id: bid, name: B.name, category: B.category, connection: 'demo' };
      const brand = B.brand;
      const reply = heuristicReply(business, brand, { author_name: author, rating, text });

      if (rating >= 4) {
        q.run(
          `UPDATE reviews SET status = 'auto_replied', reply_text = ?, reply_source = 'ai_auto', replied_at = datetime('now') WHERE id = ?`,
          reply, id
        );
      } else if (B.slug === 'cafe-aroma' && rating <= 2) {
        // Showcase: two drafts waiting for the owner's approval in the demo dashboard.
        q.run(
          `UPDATE reviews SET status = 'pending_approval', reply_text = ?, reply_source = 'ai_draft' WHERE id = ?`,
          reply, id
        );
      } else {
        q.run(
          `UPDATE reviews SET status = 'replied', reply_text = ?, reply_source = 'ai_approved', replied_at = datetime('now') WHERE id = ?`,
          reply, id
        );
      }
    }
    refreshStats(bid);
  }

  q.run(`INSERT INTO settings (key, value) VALUES ('seeded', datetime('now'))`);
  console.log('[seed] done — login with demo@autoreview.app / demo1234');
}

module.exports = { seedIfEmpty };

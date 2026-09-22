'use strict';
/**
 * Generates docs/data/*.json — the "database" the static GitHub-native app
 * reads (and GitHub Actions writes back after syncs).
 * Run: node scripts/seed-static-data.mjs
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const req = createRequire(__filename);
const { BUSINESSES } = req('../lib/demodata');
const { classifyReview, heuristicReply, heuristicPerception } = req('../lib/ai');

const OUT = path.join(__dirname, '..', 'docs', 'data');
fs.mkdirSync(OUT, { recursive: true });

const businesses = [];
const reviews = [];
const perceptions = {};
let reviewId = 0;

for (const [i, B] of BUSINESSES.entries()) {
  const bid = i + 1;
  businesses.push({
    id: bid,
    name: B.name,
    category: B.category,
    address: B.address,
    connection: 'demo',
    googleLocationName: `locations/demo_${B.slug}`,
    placeId: `demo_place_${B.slug}`,
    ratingAvg: 0,
    reviewsTotal: 0,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    brand: {
      tone: B.brand.tone,
      about: B.brand.about,
      signature: B.brand.signature,
      language: B.brand.language,
      rulesDo: B.brand.rules_do,
      rulesDont: B.brand.rules_dont,
      emojiPolicy: B.brand.emoji_policy,
      replyLength: B.brand.reply_length,
    },
  });

  const now = Date.now();
  let sum = 0;
  for (const [author, rating, text, daysAgo] of B.reviews) {
    reviewId++;
    sum += rating;
    const postedAt = new Date(now - daysAgo * 86400000).toISOString().slice(0, 19).replace('T', ' ');
    const cls = classifyReview({ rating, text });
    const reply = heuristicReply({ name: B.name, category: B.category }, B.brand, { author_name: author, rating, text });
    const status = rating >= 4 ? 'auto_replied' : (B.slug === 'cafe-aroma' && rating <= 2 ? 'pending_approval' : 'replied');
    reviews.push({
      id: reviewId,
      businessId: bid,
      googleReviewId: `demo-seed-${B.slug}-${daysAgo}-${author.replace(/\W/g, '')}`,
      author,
      rating,
      text,
      postedAt,
      fetchedAt: postedAt,
      status,
      replyText: status === 'pending_approval' ? reply : reply,
      replySource: status === 'auto_replied' ? 'ai_auto' : (status === 'pending_approval' ? 'ai_draft' : 'ai_approved'),
      repliedAt: status === 'pending_approval' ? null : postedAt,
      topics: cls.topics ? cls.topics.split(', ') : [],
      sentiment: cls.sentiment,
    });
  }
  businesses[bid - 1].ratingAvg = Math.round((sum / B.reviews.length) * 10) / 10;
  businesses[bid - 1].reviewsTotal = B.reviews.length;

  const raw = heuristicPerception(B.name, B.reviews.map(([author, rating, text]) => ({ author_name: author, rating, text })));
  // map server snake_case → app camelCase
  const p = {
    about: raw.about,
    famousFor: raw.famous_for,
    thingsToNotice: raw.things_to_notice,
    atmosphere: raw.atmosphere,
    bestFor: raw.best_for,
    sentimentSummary: raw.sentiment_summary,
  };
  perceptions[String(bid)] = { ...p, engine: 'brand-rules-engine', generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') };
}

fs.writeFileSync(path.join(OUT, 'businesses.json'), JSON.stringify(businesses, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'reviews.json'), JSON.stringify(reviews, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'perceptions.json'), JSON.stringify(perceptions, null, 2) + '\n');
console.log(`seeded: ${businesses.length} businesses, ${reviews.length} reviews, ${Object.keys(perceptions).length} perceptions → docs/data/`);

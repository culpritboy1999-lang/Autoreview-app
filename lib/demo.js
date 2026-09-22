'use strict';
/**
 * Demo Mode — a faithful simulation of the Google surface.
 * When real Google credentials are not configured, connected businesses behave
 * exactly like Google-connected ones: reviews "arrive" over time, replies are
 * "posted", stats update — so the entire product can be exercised end-to-end.
 */

const { q } = require('./db');

/* New reviews that "arrive" from Google while the demo runs. */
const INCOMING = {
  'Café Aroma': [
    ['Laura K.', 5, 'Came for the lemon tart after seeing these reviews — no regrets. Creamy, sharp, perfect crust. The oat flat white was silky too.', 0],
    ['Dmitri A.', 2, 'Waited 15 minutes while one barista handled everything alone. Coffee was fine but the wait killed the morning vibe.', 0],
    ['Chloé B.', 4, 'Really charming spot with excellent Ethiopia filter. Upstairs gets a bit noisy when full, but I’ll definitely be back for the cinnamon knots.', 0],
    ['Marcell T.', 3, 'Coffee is genuinely great, but charging extra for oat milk in 2026 feels stingy. Staff were sweet about it though.', 0],
    ['Yuki N.', 5, 'The barista drew a tiny frog in my latte art and I thought about it all day. Warm, cozy, honest coffee.', 0],
    ['Robert F.', 1, 'Ordered at the till, waited, then they lost my ticket. Ended up leaving without a coffee. Poor organisation today.', 0],
  ],
  'The Rustic Spoon': [
    ['Viktor H.', 5, 'The venison special was cooked to perfection and the sommelier’s pairing advice was spot on. Courtyard is dreamy at dusk.', 0],
    ['Amelia D.', 2, 'Booked a table for 7:30, got seated at 8:15 with no apology. Food (when it came) was lovely, but the evening felt chaotic.', 0],
    ['Bálint O.', 4, 'Superb tartare and a thoughtful wine list. The pavlova is sweet but shareable. Service slightly stretched on Saturdays.', 0],
    ['Sofia L.', 3, 'Beautiful room and good food, but two of our four dishes arrived lukewarm. Staff replaced one quickly. Mixed evening.', 0],
    ['Jonas W.', 5, 'Chef came out to explain the farm sourcing — you can taste the difference. The 8-hour goulash is worth the flight alone.', 0],
  ],
  'Golden Crust Bakery': [
    ['Emma R.', 5, 'The seeded rye toast with their own honey = breakfast of champions. Queue at 8am but it flies.', 0],
    ['Ádám K.', 2, 'Arrived 10:40 Saturday — literally nothing left but one croissant. Update your online hours if you sell out by eleven!', 0],
    ['Nadia S.', 4, 'Almond croissant is elite. Card terminal worked fine today. Tight squeeze inside but worth it.', 0],
    ['Peti Zs.', 5, 'They saved me a loaf after I called ahead. That’s a bakery that cares. Crust like glass, crumb like custard.', 0],
    ['Helen M.', 3, 'Pastries superb; the coffee cart outside is mediocre though. Also nowhere to sit — it’s strictly takeaway.', 0],
  ],
  'Urban Verde': [
    ['Tímea N.', 5, 'The new jerk mushroom bowl is a flavour bomb. Zero-waste and they comped our water filter bottle tag by accident — honest folks.', 0],
    ['Gregor B.', 2, 'The burrata was sold out (of course) and the bowl I got was half sauce. Tasty but tiny for the price.', 0],
    ['Iris V.', 4, 'Lovely terrace, imaginative food. The tahini brownie was better this time — they must have tweaked the recipe!', 0],
    ['Kenji M.', 5, 'First vegan meal ever and I didn’t even notice. Staff cheered when I said that. Cashew burrata = witchcraft.', 0],
  ],
  'Danube Bites': [
    ['Martin Č.', 5, 'Chimney cake at midnight beside the Danube — perfect Budapest night. The walnut version is the one.', 0],
    ['Bea F.', 3, 'Lángos crisp and generous, but 25 minutes on a Friday. Get the sausage from the grill instead, zero wait.', 0],
    ['Ollie S.', 4, 'Garlic sauce is genuinely legendary. Cash only — the cash machine in the market charges silly fees, bring forints.', 0],
    ['Kata Gy.', 1, 'Rude when I asked for less garlic. It’s street food, I get it, but no need to roll eyes. Lángos itself was soggy.', 0],
  ],
};

let cursor = new Map(); // business_id -> shuffled index

function pickIncoming(businessId, name) {
  const pool = INCOMING[name] || [];
  if (!pool.length) return null;
  if (!cursor.has(businessId)) {
    const idx = [...pool.keys()].sort(() => Math.random() - 0.5);
    cursor.set(businessId, idx);
  }
  const idx = cursor.get(businessId);
  const next = idx.pop();
  if (next === undefined) { cursor.delete(businessId); return null; } // pool exhausted
  const [author, rating, text] = pool[next];
  return {
    googleReviewId: `demo-${businessId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    authorName: author, rating, text,
    postedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    replied: false, replyText: '',
  };
}

/** Simulate Google pushing new reviews for a demo business. */
function fetchNewDemoReviews(business) {
  const out = [];
  const n = Math.random() < 0.55 ? 1 : (Math.random() < 0.25 ? 2 : 0);
  for (let i = 0; i < n; i++) {
    const r = pickIncoming(business.id, business.name);
    if (r) out.push(r);
  }
  return out;
}

/** Simulate posting a reply to Google (demo). */
async function postDemoReply(business, reviewId, comment) {
  // In demo mode the reply is considered published the moment we record it.
  return true;
}

/** Demo business stats refresh (avg + total). */
function refreshStats(businessId) {
  const row = q.get(`SELECT COUNT(*) AS c, COALESCE(AVG(rating), 0) AS avg FROM reviews WHERE business_id = ?`, businessId);
  q.run(`UPDATE businesses SET reviews_total = ?, rating_avg = ? WHERE id = ?`, row.c, Math.round(row.avg * 10) / 10, businessId);
}

module.exports = { fetchNewDemoReviews, postDemoReply, refreshStats };

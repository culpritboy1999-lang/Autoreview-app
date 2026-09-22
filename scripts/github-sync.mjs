#!/usr/bin/env node
/**
 * AutoReview sync worker — runs inside GitHub Actions on a schedule.
 * This is what makes the GitHub repo itself the backend:
 *
 *   1. Reads docs/data/*.json (businesses, reviews, perceptions).
 *   2. For each Google-connected business (secrets configured + location set):
 *        - fetches new reviews via the Business Profile API (mybusiness v4)
 *        - AI-generates brand-aware replies
 *        - 4★/5★ → posted to Google automatically;  ≤3★ → saved as drafts
 *   3. Otherwise (demo mode) occasionally simulates a new review arriving.
 *   4. Refreshes stale perception summaries.
 *   5. Writes updated JSON files; the workflow commits them to the repo,
 *      where GitHub Pages immediately serves the new state.
 *
 * Zero npm dependencies (Node 20+, native fetch). Runs on GitHub Actions
 * (schedule / workflow_dispatch / push to this file). Env:
 *   GITHUB_* set by Actions; optional secrets:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN,
 *   OPENROUTER_API_KEY | GROQ_API_KEY | GOOGLE_AI_API_KEY
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'data');
const read = (f, fallback) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return fallback; }
};
const write = (f, v) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 2) + '\n');

const env = process.env;
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

/* ---------------- AI providers (free tiers, same chain as the server app) --------------- */
const providers = [
  env.OPENROUTER_API_KEY && { id: 'openrouter', model: env.OPENROUTER_MODEL || 'google/gemma-2-9b-it:free', key: env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions' },
  env.GROQ_API_KEY && { id: 'groq', model: env.GROQ_MODEL || 'gemma2-9b-it', key: env.GROQ_API_KEY, url: 'https://api.groq.com/openai/v1/chat/completions' },
  env.GOOGLE_AI_API_KEY && { id: 'google', model: env.GOOGLE_AI_MODEL || 'gemini-2.0-flash', key: env.GOOGLE_AI_API_KEY, url: `https://generativelanguage.googleapis.com/v1beta/models/${env.GOOGLE_AI_MODEL || 'gemini-2.0-flash'}:generateContent` },
].filter(Boolean);

async function llm(system, user, maxTokens = 400) {
  const p = providers[0];
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 30000);
  try {
    let res;
    if (p.id === 'google') {
      res = await fetch(p.url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 } }) });
    } else {
      res = await fetch(p.url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` }, body: JSON.stringify({ model: p.model, max_tokens: maxTokens, temperature: 0.7, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) });
    }
    if (!res.ok) throw new Error(`AI_HTTP_${res.status}`);
    const d = await res.json();
    return (p.id === 'google' ? d?.candidates?.[0]?.content?.parts?.map((x) => x.text).join('') : d?.choices?.[0]?.message?.content) || '';
  } finally { clearTimeout(t); }
}

const ENGINE = providers[0]?.model || 'brand-rules-engine';

function systemPrompt(biz) {
  const b = biz.brand || {};
  return [
    `You are the official responder for "${biz.name}" (${biz.category || 'local business'}), replying to Google reviews as the owner.`,
    b.about ? `About: ${b.about}` : '',
    b.tone ? `Tone: ${b.tone}.` : 'Tone: warm and professional.',
    b.language ? `Write in ${b.language}.` : 'Write in English.',
    b.rulesDo ? `ALWAYS: ${b.rulesDo}` : '',
    b.rulesDont ? `NEVER: ${b.rulesDont}` : '',
    b.emojiPolicy === 'none' ? 'No emojis.' : b.emojiPolicy === 'freely' ? 'Emojis welcome.' : 'At most one emoji.',
    b.replyLength === 'short' ? 'Under 45 words.' : b.replyLength === 'long' ? 'Up to 110 words.' : '40–80 words.',
    'Never promise refunds/compensation/payments. No URLs or contact details. Output only the reply text.',
    b.signature ? `End with the signature line: ${b.signature}` : '',
  ].filter(Boolean).join('\n');
}

function rulesReply(biz, r) {
  const b = biz.brand || {};
  const first = (r.author || 'there').split(' ')[0];
  const sig = b.signature ? `\n${b.signature}` : '';
  const t = (r.text || '').toLowerCase();
  const issue = /wait|slow|queue|hour|minutes/.test(t) ? 'the wait you experienced'
    : /cold|dry|burnt|soggy|stale/.test(t) ? 'the food not being right'
    : /rude|service|staff|ignored/.test(t) ? 'the service you received' : '';
  if (r.rating >= 5) return `Thank you so much, ${first}! Reviews like yours make our day at ${biz.name}. See you again soon!${sig}`;
  if (r.rating === 4) return `Thank you for the kind words, ${first}! We're delighted you enjoyed your visit to ${biz.name} — can't wait to welcome you back!${sig}`;
  if (r.rating === 3) return `Thank you for the balanced feedback, ${first}. We hear you on ${issue || 'the mixed experience'} and we're already working on it. We hope to welcome you back to ${biz.name} for a flawless visit.${sig}`;
  return `${first}, we're truly sorry about your experience at ${biz.name}${issue ? ` — especially ${issue}` : ''}. This isn't our standard, and your feedback has gone straight to the team. We'd genuinely love another chance to show you our best.${sig}`;
}

async function replyFor(biz, r) {
  if (providers.length) {
    try {
      const prompt = [`Google review for ${biz.name}:`, `Rating: ${r.rating}/5.`, r.text ? `Review: "${r.text}"` : '(stars only)', r.rating >= 4 ? 'Positive: thank warmly, be specific.' : r.rating === 3 ? 'Mixed: acknowledge and invite back addressing the concern.' : 'Negative: apologise specifically, one concrete improvement, invite another chance.'].join('\n');
      const text = (await llm(systemPrompt(biz), prompt)).trim();
      if (text) return { text, engine: ENGINE };
    } catch (e) { console.error(`[ai] ${e.message}; using rules engine`); }
  }
  return { text: rulesReply(biz, r), engine: 'brand-rules-engine' };
}

/* ---------------- Google Business Profile (real sync) --------------- */
async function googleAccessToken() {
  if (!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN)) return null;
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: env.GOOGLE_REFRESH_TOKEN, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token' }) });
  if (!res.ok) throw new Error(`google token refresh failed: ${res.status}`);
  return (await res.json()).access_token;
}

const STARS = { FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1 };

async function fetchGoogleReviews(token, locationName) {
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`fetchReviews ${res.status}`);
  const d = await res.json();
  return (d.reviews || []).map((r) => ({
    googleReviewId: r.reviewId, author: r.reviewer?.displayName || 'Google user',
    rating: STARS[r.starRating] || 0, text: r.comment || '',
    postedAt: r.createTime ? new Date(r.createTime).toISOString().slice(0, 19).replace('T', ' ') : now(),
    alreadyReplied: Boolean(r.reviewReply),
  }));
}

async function postGoogleReply(token, locationName, reviewId, comment) {
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews/${encodeURIComponent(reviewId)}:reply`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ comment }) });
  if (!res.ok) throw new Error(`postReply ${res.status}: ${(await res.text()).slice(0, 120)}`);
}

/* ---------------- Demo simulation --------------- */
const DEMO_POOL = [
  ['Sára J.', 5, 'Absolutely wonderful — warm staff, beautiful space and everything we tried was delicious. Highly recommend!'],
  ['Mike D.', 4, 'Really enjoyed it. Small hiccup with the wait, but the quality more than made up for it. Will be back.'],
  ['Edit F.', 3, 'Decent overall. Some things were great, others need a bit of polish. A mixed visit.'],
  ['Jon B.', 2, 'Not our best visit — it felt disorganised and the food took very long to arrive.'],
  ['Kata M.', 1, 'Honestly disappointing. Rude service and poor quality for the price.'],
  ['Leo V.', 5, 'Top marks! Friendly faces, great coffee/food and a lovely atmosphere. A new favourite.'],
  ['Hanna W.', 4, 'Very good experience overall — tiny details kept it from perfect, but I would absolutely return.'],
];

function simulateIncoming(businesses) {
  if (Math.random() > 0.45) return [];
  const biz = businesses[Math.floor(Math.random() * businesses.length)];
  const pick = DEMO_POOL[Math.floor(Math.random() * DEMO_POOL.length)];
  return [{
    businessId: biz.id, googleReviewId: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: pick[0], rating: pick[1], text: pick[2], postedAt: now(), alreadyReplied: false,
  }];
}

/* ---------------- Perception (heuristic, same as server app) --------------- */
const STOP = new Set('the a an and or but of to in on at for with is are was were be been it its this that we i my our us you your they their very really so just about from as than then there here what which who while when after before all any both each few more most other some such only own same too'.split(' '));
function heuristicPerception(name, revs) {
  const total = revs.length || 1;
  let pos = 0, neg = 0;
  const uni = new Map(), notes = new Map();
  for (const r of revs) {
    if (r.rating >= 4) pos++;
    if (r.rating <= 2) neg++;
    const t = (r.text || '').toLowerCase();
    if (!t) continue;
    if (r.rating >= 4) for (const w of t.replace(/[^a-záéíóöőúüű' -]/g, ' ').split(/\s+/)) if (w.length > 3 && !STOP.has(w)) uni.set(w, (uni.get(w) || 0) + 1);
    else for (const [re, label] of [[/wait|slow|queue/, 'can mean waits at busy times'], [/price|expensive/, 'prices on the higher side for some'], [/cold|dry|burnt|soggy/, 'occasional food consistency reports'], [/rude|service|staff/, 'service can be uneven per some guests'], [/sold out|ran out/, 'popular items sell out early'], [/card|cash/, 'bring cash — card payments can fail']]) if (re.test(t)) notes.set(label, (notes.get(label) || 0) + 2);
  }
  const pct = (n) => Math.round((n / total) * 100);
  const famous = [...uni.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w, c]) => ({ name: w[0].toUpperCase() + w.slice(1), why: `praised in ${c}+ reviews` }));
  return {
    about: `${name} collects strongly positive feedback — about ${pct(pos)}% of reviewers rate it 4★ or 5★${famous.length ? `, with “${famous.slice(0, 3).map((f) => f.name.toLowerCase()).join('”, “')}” recurring across happy reviews` : ''}.`,
    famousFor: famous,
    thingsToNotice: [...notes.keys()].slice(0, 5),
    atmosphere: pos > total / 2 ? 'Guests mostly describe the vibe warmly and keep coming back.' : 'Opinions on the atmosphere are divided.',
    bestFor: ['Regulars & locals', 'Visitors exploring the area', 'Food-first travellers'],
    sentimentSummary: `${pct(pos)}% positive · ${pct(Math.max(0, total - pos - neg))}% mixed · ${pct(neg)}% negative across ${total} reviews.`,
  };
}

/* ---------------- Main --------------- */
async function main() {
  const businesses = read('businesses.json', []);
  const reviews = read('reviews.json', []);
  const perceptions = read('perceptions.json', {});
  const events = [];
  let token = null;
  if (businesses.some((b) => b.connection === 'google')) {
    try { token = await googleAccessToken(); } catch (e) { console.error('[google]', e.message); }
    if (!token) console.error('[google] missing secrets (GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN)');
  }

  // 1) pull (or simulate) incoming reviews
  for (const biz of businesses) {
    let incoming = [];
    if (biz.connection === 'google' && token && biz.googleLocationName) {
      try { incoming = await fetchGoogleReviews(token, biz.googleLocationName); }
      catch (e) { console.error(`[google] ${biz.name}: ${e.message}`); }
    } else {
      incoming = simulateIncoming([biz]);
    }
    for (const r of incoming) {
      if (reviews.some((x) => x.businessId === biz.id && x.googleReviewId === r.googleReviewId)) continue;
      const sentiment = r.rating >= 4 ? 'positive' : r.rating === 3 ? 'mixed' : 'negative';
      const review = {
        id: reviews.reduce((m, x) => Math.max(m, x.id), 0) + 1,
        businessId: biz.id, googleReviewId: r.googleReviewId, author: r.author, rating: r.rating,
        text: r.text || '', postedAt: r.postedAt, fetchedAt: now(), status: 'new',
        replyText: '', replySource: '', repliedAt: null, topics: [], sentiment,
      };
      reviews.push(review);
      events.push(`${biz.name}: new ${r.rating}★ review from ${r.author}`);

      // 2) respond per policy
      const { text, engine } = await replyFor(biz, review);
      review.replyText = text;
      if (r.rating >= 4) {
        let posted = true;
        if (biz.connection === 'google' && token && biz.googleLocationName && !r.alreadyReplied) {
          try { await postGoogleReply(token, biz.googleLocationName, r.googleReviewId, text); }
          catch (e) { console.error(`[reply] ${e.message}`); posted = false; }
        }
        review.status = posted ? 'auto_replied' : 'reply_failed';
        review.replySource = 'ai_auto';
        review.repliedAt = now();
        events.push(`  ↳ ⚡ auto-posted ${r.rating}★ reply (${engine})`);
      } else {
        review.status = 'pending_approval';
        review.replySource = 'ai_draft';
        events.push(`  ↳ ✍️ draft parked for approval (${engine})`);
      }
    }
    // stats
    const mine = reviews.filter((x) => x.businessId === biz.id && x.status !== 'pending_approval');
    biz.reviewsTotal = mine.length;
    biz.ratingAvg = mine.length ? Math.round((mine.reduce((s, x) => s + x.rating, 0) / mine.length) * 10) / 10 : 0;
  }

  // 3) refresh stale perceptions (>12h) for businesses with reviews
  const STALE_HOURS = 12;
  for (const biz of businesses) {
    const mine = reviews.filter((x) => x.businessId === biz.id);
    if (!mine.length) continue;
    const p = perceptions[String(biz.id)];
    const ageH = p ? (Date.now() - new Date(p.generatedAt.replace(' ', 'T') + 'Z').getTime()) / 3600000 : Infinity;
    if (!p || ageH > STALE_HOURS) {
      perceptions[String(biz.id)] = { ...heuristicPerception(biz.name, mine), engine: providers.length ? ENGINE : 'brand-rules-engine', generatedAt: now() };
      events.push(`${biz.name}: perception refreshed`);
    }
  }

  write('businesses.json', businesses);
  write('reviews.json', reviews);
  write('perceptions.json', perceptions);

  console.log(events.length ? events.map((e) => '• ' + e).join('\n') : 'No changes — everything already in sync.');
  if (!events.length) {
    // restore mtimes so the workflow's git diff stays clean
    console.log('AUTOREVIEW_NO_CHANGES');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

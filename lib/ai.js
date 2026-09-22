'use strict';
/**
 * AI engine for AutoReview.
 *
 * Uses the best *free* chat models available, chosen automatically by which API
 * key is present in the environment:
 *   1. OpenRouter  → google/gemma-3-27b-it:free   (free tier, Gemma 3 27B)
 *   2. Groq        → gemma2-9b-it                 (free tier, Gemma 2 9B)
 *   3. Google AI   → gemini-2.0-flash             (generous free tier)
 * If no key is configured, a brand-aware heuristic reply engine keeps the whole
 * product functional (useful for demos / offline dev).
 */

const env = process.env || {};

const PROVIDERS = [
  {
    id: 'openrouter',
    label: 'Gemma 3 27B (free) via OpenRouter',
    model: env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free',
    key: env.OPENROUTER_API_KEY || '',
    url: 'https://openrouter.ai/api/v1/chat/completions',
  },
  {
    id: 'groq',
    label: 'Gemma 2 9B (free) via Groq',
    model: env.GROQ_MODEL || 'gemma2-9b-it',
    key: env.GROQ_API_KEY || '',
    url: 'https://api.groq.com/openai/v1/chat/completions',
  },
  {
    id: 'google',
    label: 'Gemini 2.0 Flash (free tier)',
    model: env.GOOGLE_AI_MODEL || 'gemini-2.0-flash',
    key: env.GOOGLE_AI_API_KEY || '',
    url: `https://generativelanguage.googleapis.com/v1beta/models/${env.GOOGLE_AI_MODEL || 'gemini-2.0-flash'}:generateContent`,
  },
];

function activeProvider() {
  return PROVIDERS.find((p) => p.key) || null;
}

function aiStatus() {
  const p = activeProvider();
  return p
    ? { available: true, provider: p.id, model: p.model, label: p.label }
    : { available: false, provider: 'heuristic', model: 'brand-rules-engine', label: 'Built-in brand-rules engine (add an AI key for LLM replies)' };
}

/* ------------------------------------------------------------------ */
/* Low-level provider calls (all OpenAI-style or Gemini-style)         */
/* ------------------------------------------------------------------ */
async function callLLM(systemPrompt, userPrompt, maxTokens = 500) {
  const p = activeProvider();
  if (!p) throw new Error('NO_AI_KEY');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    let res;
    if (p.id === 'google') {
      res = await fetch(p.url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
        }),
      });
    } else {
      res = await fetch(p.url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${p.key}`,
          ...(p.id === 'openrouter' ? { 'HTTP-Referer': 'https://autoreview.app', 'X-Title': 'AutoReview' } : {}),
        },
        body: JSON.stringify({
          model: p.model,
          max_tokens: maxTokens,
          temperature: 0.7,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`AI_HTTP_${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    let text = '';
    if (p.id === 'google') text = data?.candidates?.[0]?.content?.parts?.map((x) => x.text).join('') || '';
    else text = data?.choices?.[0]?.message?.content || '';
    return (text || '').trim();
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(raw) {
  const cleaned = raw.replace(/```json/gi, '```').split('```').filter(Boolean);
  const candidates = [raw, ...cleaned];
  for (const c of candidates) {
    const start = c.indexOf('{');
    const end = c.lastIndexOf('}');
    if (start === -1 || end <= start) continue;
    try { return JSON.parse(c.slice(start, end + 1)); } catch { /* next */ }
  }
  throw new Error('AI_JSON_PARSE');
}

/* ------------------------------------------------------------------ */
/* Brand-aware reply generation                                        */
/* ------------------------------------------------------------------ */
function brandSystemPrompt(business, brand) {
  const lines = [
    `You are the official responder for "${business.name}" (${business.category || 'local business'}), replying to Google reviews as the owner/manager.`,
    brand?.about ? `About the business: ${brand.about}` : '',
    brand?.tone ? `Brand voice/tone: ${brand.tone}.` : 'Brand voice/tone: warm and professional.',
    brand?.language ? `Write the reply in ${brand.language}.` : 'Write the reply in English.',
    brand?.rules_do ? `ALWAYS follow these rules: ${brand.rules_do}` : '',
    brand?.rules_dont ? `NEVER do any of these: ${brand.rules_dont}` : '',
    brand?.emoji_policy === 'none' ? 'Do not use emojis.' : brand?.emoji_policy === 'freely' ? 'Emojis are welcome where natural.' : 'Use at most one emoji.',
    brand?.reply_length === 'short' ? 'Keep the reply under 45 words.' : brand?.reply_length === 'long' ? 'You may write up to 110 words.' : 'Keep the reply between 40 and 80 words.',
    'Never promise refunds, compensation, discounts or payments. Never include phone numbers, emails or URLs.',
    'Be specific: reference what the guest actually experienced. Sound human, never template-y. Output ONLY the reply text.',
    brand?.signature ? `End every reply with the signature line: ${brand.signature}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

function ratingWord(n) {
  return { 5: '5', 4: '4', 3: '3', 2: '2', 1: '1' }[n] || String(n);
}

async function generateReviewReply(business, brand, review) {
  const userPrompt = [
    `Google review for ${business.name}:`,
    `Rating: ${ratingWord(review.rating)} out of 5 stars.`,
    review.text ? `Review text: "${review.text}"` : '(No text — stars only.)',
    review.author_name ? `Reviewer first name (use naturally if it fits): ${review.author_name.split(' ')[0]}` : '',
    review.rating >= 4
      ? 'This is a positive review: thank them warmly and highlight something specific they mentioned.'
      : review.rating === 3
        ? 'This is a lukewarm review: thank them, acknowledge the mixed experience, and invite them back addressing their concern.'
        : 'This is a negative review: apologise sincerely and specifically (without admitting legal fault), address each concrete issue raised, explain one concrete improvement, and invite them to give you another chance — offline if appropriate.',
  ].filter(Boolean).join('\n');

  if (activeProvider()) {
    try {
      const text = await callLLM(brandSystemPrompt(business, brand), userPrompt, 400);
      if (text) return { text: sanitizeReply(text, brand), engine: aiStatus().model };
    } catch (e) {
      console.error('[ai] reply generation failed, using rules engine:', e.message);
    }
  }
  return { text: heuristicReply(business, brand, review), engine: 'brand-rules-engine' };
}

function sanitizeReply(text, brand) {
  let t = String(text).trim().replace(/^["“]|["”]$/g, '').trim();
  t = t.replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[phone]').replace(/https?:\/\/\S+/g, '');
  if (brand?.signature && !t.includes(brand.signature)) t = `${t}\n${brand.signature}`;
  return t;
}

/* --- offline fallback: deterministic but brand-aware reply builder --- */
const POS_HOOKS = {
  'Café Aroma': 'our house-roasted single origins and fresh-baked pastries',
  'The Rustic Spoon': 'our slow-braised goulash and candle-lit courtyard',
  'Golden Crust Bakery': 'our 48-hour croissants and morning sourdough',
  'Urban Verde': 'our zero-waste kitchen and the cashew burrata',
  'Danube Bites': 'the garlic lángos and riverside nights',
};
const NEG_GESTURES = {
  friendly: 'we’d love to make it right — please come back and ask for the manager',
  warm: 'we’d genuinely love another chance to show you our best',
  professional: 'we have shared your feedback with our team and updated our service standards',
  playful: 'we’re on a mission to win back your taste buds',
  quirky: 'we’d love a rematch — swing by and the crew will take extra care',
  luxurious: 'we have addressed this with our team to ensure the standard you deserve',
};

function heuristicReply(business, brand, review) {
  const b = brand || {};
  const first = (review.author_name || 'there').split(' ')[0];
  const name = business.name;
  const hook = POS_HOOKS[name] || 'our team';
  const gesture = NEG_GESTURES[b.tone] || NEG_GESTURES.friendly;
  const sig = b.signature ? `\n${b.signature}` : '';
  const issue = review.text ? review.text.toLowerCase() : '';
  const detail = /wait|slow|hour|minutes|queue/.test(issue) ? 'the wait you experienced'
    : /cold|dry|burnt|soggy|under-?season/.test(issue) ? 'the food not being right'
    : /rude|service|staff|ignored/.test(issue) ? 'the service you received'
    : /price|expensive|portion/.test(issue) ? 'the value for money'
    : '';
  let body;
  if (review.rating >= 5) {
    body = `Thank you so much, ${first}! Reviews like yours make our day. We’re thrilled you enjoyed ${hook}${detail === '' ? '' : ''} — it means the world to the whole team at ${name}. See you again soon!${sig}`;
  } else if (review.rating === 4) {
    body = `Thank you for the kind words and the honest note, ${first}. We’re glad you enjoyed your visit to ${name}${detail ? '' : ''} — we’ll keep polishing the little things. Can’t wait to welcome you back!${sig}`;
  } else if (review.rating === 3) {
    body = `Thank you for the balanced feedback, ${first}. We’re happy parts of your visit hit the mark, and we hear you on ${detail || 'the mixed experience'}. We’re already working on it — we hope to welcome you back to ${name} for a flawless visit.${sig}`;
  } else {
    body = `${first}, we’re truly sorry about your experience at ${name}${detail ? ` — especially ${detail}` : ''}. This isn’t the standard we hold ourselves to, and your feedback has gone straight to our team. ${gesture.charAt(0).toUpperCase() + gesture.slice(1)}.${sig}`;
  }
  if (b.reply_length === 'short') body = body.replace(/ —[^.]*\./g, '.');
  return body;
}

/* ------------------------------------------------------------------ */
/* Public perception analysis (landing page)                           */
/* ------------------------------------------------------------------ */
async function generatePerception(businessName, reviews) {
  const sample = reviews.slice(0, 40).map((r) => `[${r.rating}★] ${r.author_name}: ${r.text || '(no text)'}`).join('\n');
  const system = [
    'You are an analyst that summarises what customers collectively say about a business on Google Maps.',
    'Reply with ONLY valid JSON (no markdown) with this shape:',
    '{"about":"2-3 sentences on what this place is and why people like it","famous_for":[{"name":"item/experience most praised","why":"one short clause"}],"things_to_notice":["practical honest caveats recurring in reviews"],"atmosphere":"one sentence","best_for":["audience/occasion"],"sentiment_summary":"one sentence"}',
  ].join('\n');
  const user = `Business: "${businessName}". Here are ${reviews.length} Google reviews:\n${sample}`;

  if (activeProvider()) {
    try {
      const raw = await callLLM(system, user, 800);
      const data = extractJson(raw);
      if (data && data.about) return { data: normalizePerception(data), engine: aiStatus().model };
    } catch (e) {
      console.error('[ai] perception failed, using heuristic:', e.message);
    }
  }
  return { data: heuristicPerception(businessName, reviews), engine: 'brand-rules-engine' };
}

function normalizePerception(d) {
  return {
    about: String(d.about || '').slice(0, 600),
    famous_for: (Array.isArray(d.famous_for) ? d.famous_for : []).slice(0, 6).map((f) =>
      typeof f === 'string' ? { name: f, why: '' } : { name: String(f.name || '').slice(0, 80), why: String(f.why || '').slice(0, 120) }),
    things_to_notice: (Array.isArray(d.things_to_notice) ? d.things_to_notice : []).slice(0, 6).map((s) => String(s).slice(0, 160)),
    atmosphere: String(d.atmosphere || '').slice(0, 240),
    best_for: (Array.isArray(d.best_for) ? d.best_for : []).slice(0, 5).map((s) => String(s).slice(0, 60)),
    sentiment_summary: String(d.sentiment_summary || '').slice(0, 300),
  };
}

/* --- heuristic perception: n-gram mining of praised items + caveats --- */
const STOP = new Set(('the a an and or but of to in on at for with is are was were be been it its this that we i my our us you your they their he she his her not no yes very really so just about from as than then there here what which who whom while when after before all any both each few more most other some such only own same too s t can will would should could have has had do does did doing done get got go went come came say said tell told want wanted like love liked enjoy enjoyed try tried eat ate food good great nice place service staff time back again one two next every always never us').split(' '));

function heuristicPerception(businessName, reviews) {
  const total = reviews.length || 1;
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let pos = 0, neg = 0;
  const uni = new Map(), negIssues = new Map();
  const bump = (m, k, w = 1) => m.set(k, (m.get(k) || 0) + w);

  for (const r of reviews) {
    dist[r.rating] = (dist[r.rating] || 0) + 1;
    if (r.rating >= 4) pos++;
    if (r.rating <= 2) neg++;
    const text = (r.text || '').toLowerCase();
    if (!text) continue;
    if (r.rating >= 4) {
      const words = text.replace(/[^a-záéíóöőúüűàâäèêëïîôöùûçñ' -]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
      for (const w of words) bump(uni, w);
    } else if (r.rating <= 2) {
      for (const [re, label] of [
        [/wait|slow|queue|hour|minutes/, 'can mean waits at busy times'],
        [/price|expensive|costly|overpriced/, 'some find prices on the higher side'],
        [/cold|dry|burnt|soggy|stale|undercooked/, 'occasional reports on food consistency'],
        [/rude|service|staff|ignored/, 'service can be uneven per some guests'],
        [/seat|crowd|cramp|small|noisy|loud/, 'gets crowded and noisy at peak hours'],
        [/sold out|ran out/, 'popular items can sell out early'],
        [/park/, 'parking nearby can be tricky'],
        [/card|cash|terminal/, 'bring cash — card payments can fail'],
      ]) if (re.test(text)) bump(negIssues, label, 2);
    }
  }
  const famous = [...uni.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([w, c]) => ({ name: w.charAt(0).toUpperCase() + w.slice(1), why: `praised in ${c}+ reviews` }));
  const pct = (n) => Math.round((n / total) * 100);
  return normalizePerception({
    about: `${businessName} collects strongly positive feedback overall — about ${pct(pos)}% of reviewers rate it 4★ or 5★${famous.length ? `, with words like “${famous.slice(0, 3).map((f) => f.name.toLowerCase()).join('”, “')}” recurring across happy reviews` : ''}.`,
    famous_for: famous,
    things_to_notice: [...negIssues.keys()].slice(0, 5),
    atmosphere: dist[5] + dist[4] > total / 2 ? 'Guests mostly describe the vibe warmly and keep coming back.' : 'Opinions on the atmosphere are divided.',
    best_for: ['Regulars & locals', 'Visitors exploring the area', dist[5] + dist[4] >= total * 0.7 ? 'Food-first travellers' : 'The curious'],
    sentiment_summary: `${pct(pos)}% positive · ${pct(total - pos - neg)}% mixed · ${pct(neg)}% negative across ${total} reviews.`,
  });
}

/* ------------------------------------------------------------------ */
/* Lightweight review classification (no AI needed)                    */
/* ------------------------------------------------------------------ */
function classifyReview(review) {
  const text = (review.text || '').toLowerCase();
  const topics = [];
  const map = [
    [/wait|slow|queue|took (an|one) hour|\d+ minutes/, 'wait time'],
    [/cold|dry|burnt|soggy|stale|undercook|overcook|taste/, 'food quality'],
    [/rude|service|staff|ignored|rolled|attitude/, 'service'],
    [/price|expensive|overpriced|portion|value/, 'value'],
    [/seat|crowd|cramp|noisy|loud|busy/, 'crowding'],
    [/card|cash|terminal/, 'payment'],
    [/sold out|ran out|unavailable/, 'availability'],
    [/wifi|wi-fi/, 'Wi-Fi'],
    [/order wrong|wrong order|mixed up/, 'order accuracy'],
    [/dog|pet/, 'pet-friendliness'],
  ];
  for (const [re, label] of map) if (re.test(text) && topics.length < 3) topics.push(label);
  const sentiment = review.rating >= 4 ? 'positive' : review.rating === 3 ? 'mixed' : 'negative';
  return { sentiment, topics: topics.join(', ') };
}

module.exports = { aiStatus, generateReviewReply, generatePerception, classifyReview, heuristicReply, heuristicPerception };

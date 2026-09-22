/* AutoReview — in-browser AI engine.
   Owners can plug a free-tier key (OpenRouter Gemma 3 27B / Groq Gemma 2 9B /
   Google Gemini Flash) in Settings — it's stored only in their browser.
   Without a key the built-in brand-rules engine writes solid replies offline. */
(function () {
  var KEY_STORAGE = 'ar_ai_key', PROV_STORAGE = 'ar_ai_provider';

  var PROVIDERS = {
    openrouter: { label: 'Gemma 3 27B (free) · OpenRouter', model: 'google/gemma-3-27b-it:free', url: 'https://openrouter.ai/api/v1/chat/completions', browser: true },
    groq: { label: 'Gemma 2 9B (free) · Groq', model: 'gemma2-9b-it', url: 'https://api.groq.com/openai/v1/chat/completions', browser: true },
    google: { label: 'Gemini 2.0 Flash (free tier) · Google AI', model: 'gemini-2.0-flash', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', browser: true },
  };

  function getKey() { return localStorage.getItem(KEY_STORAGE) || ''; }
  function setKey(k) { k ? localStorage.setItem(KEY_STORAGE, k.trim()) : localStorage.removeItem(KEY_STORAGE); }
  function getProvider() { return localStorage.getItem(PROV_STORAGE) || 'openrouter'; }
  function setProvider(p) { localStorage.setItem(PROV_STORAGE, p); }
  function engineLabel() {
    return getKey() ? (PROVIDERS[getProvider()] || PROVIDERS.openrouter).label : 'Built-in brand-rules engine';
  }

  function callLLM(system, user, maxTokens) {
    var key = getKey();
    if (!key) return Promise.reject(new Error('NO_KEY'));
    var p = PROVIDERS[getProvider()] || PROVIDERS.openrouter;
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 30000);
    var init;
    if (getProvider() === 'google') {
      init = { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { maxOutputTokens: maxTokens || 400, temperature: 0.7 } }) };
    } else {
      init = { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify({ model: p.model, max_tokens: maxTokens || 400, temperature: 0.7, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) };
    }
    return fetch(p.url, init).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) return res.text().then(function (t) { throw new Error('AI HTTP ' + res.status + (t ? ': ' + t.slice(0, 120) : '')); });
      return res.json().then(function (d) {
        var text = getProvider() === 'google'
          ? (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts || []).map(function (x) { return x.text || ''; }).join('')
          : (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
        return text.trim();
      });
    }, function (e) { clearTimeout(timer); throw e; });
  }

  function systemPrompt(biz) {
    var b = biz.brand || {};
    return [
      'You are the official responder for "' + biz.name + '" (' + (biz.category || 'local business') + '), replying to Google reviews as the owner/manager.',
      b.about ? 'About the business: ' + b.about : '',
      b.tone ? 'Brand voice/tone: ' + b.tone + '.' : 'Brand voice/tone: warm and professional.',
      b.language ? 'Write the reply in ' + b.language + '.' : 'Write in English.',
      b.rulesDo ? 'ALWAYS follow these rules: ' + b.rulesDo : '',
      b.rulesDont ? 'NEVER do any of these: ' + b.rulesDont : '',
      b.emojiPolicy === 'none' ? 'Do not use emojis.' : b.emojiPolicy === 'freely' ? 'Emojis are welcome where natural.' : 'Use at most one emoji.',
      b.replyLength === 'short' ? 'Keep the reply under 45 words.' : b.replyLength === 'long' ? 'You may write up to 110 words.' : 'Keep the reply between 40 and 80 words.',
      'Never promise refunds, compensation, discounts or payments. Never include phone numbers, emails or URLs.',
      'Be specific to what the guest experienced. Sound human, never template-y. Output ONLY the reply text.',
      b.signature ? 'End every reply with the signature line: ' + b.signature : '',
    ].filter(Boolean).join('\n');
  }

  function userPrompt(biz, r) {
    var angle = r.rating >= 4 ? 'This is a positive review: thank them warmly and highlight something specific they mentioned.'
      : r.rating === 3 ? 'This is a lukewarm review: thank them, acknowledge the mixed experience, invite them back addressing their concern.'
      : 'This is a negative review: apologise sincerely and specifically (without admitting legal fault), address each concrete issue, explain one concrete improvement, invite them to give you another chance.';
    return ['Google review for ' + biz.name + ':', 'Rating: ' + r.rating + ' out of 5 stars.', r.text ? 'Review text: "' + r.text + '"' : '(No text — stars only.)', r.author ? 'Reviewer first name (use naturally if it fits): ' + r.author.split(' ')[0] : '', angle].filter(Boolean).join('\n');
  }

  /* ---- offline brand-rules engine ---- */
  function rulesReply(biz, r) {
    var b = biz.brand || {};
    var first = (r.author || 'there').split(' ')[0];
    var sig = b.signature ? '\n' + b.signature : '';
    var t = (r.text || '').toLowerCase();
    var issue = /wait|slow|queue|hour|minutes/.test(t) ? 'the wait you experienced'
      : /cold|dry|burnt|soggy|stale/.test(t) ? 'the food not being right'
      : /rude|service|staff|ignored/.test(t) ? 'the service you received'
      : /price|expensive|portion/.test(t) ? 'the value for money' : '';
    if (r.rating >= 5) return 'Thank you so much, ' + first + '! Reviews like yours make our day. We\u2019re thrilled you enjoyed your visit to ' + biz.name + ' — it means the world to the whole team. See you again soon!' + sig;
    if (r.rating === 4) return 'Thank you for the kind words and the honest note, ' + first + '! We\u2019re delighted you enjoyed ' + biz.name + ' — we\u2019ll keep polishing the little things. Can\u2019t wait to welcome you back!' + sig;
    if (r.rating === 3) return 'Thank you for the balanced feedback, ' + first + '. We\u2019re happy parts of your visit hit the mark, and we hear you on ' + (issue || 'the mixed experience') + '. We\u2019re already working on it — we hope to welcome you back to ' + biz.name + ' for a flawless visit.' + sig;
    return first + ', we\u2019re truly sorry about your experience at ' + biz.name + (issue ? ' — especially ' + issue : '') + '. This isn\u2019t the standard we hold ourselves to, and your feedback has gone straight to our team. We\u2019d genuinely love another chance to show you our best.' + sig;
  }

  function classify(r) {
    var t = (r.text || '').toLowerCase();
    var topics = [];
    var map = [[/wait|slow|queue|\d+ minutes/, 'wait time'], [/cold|dry|burnt|soggy|stale|taste/, 'food quality'], [/rude|service|staff|ignored/, 'service'], [/price|expensive|portion|value/, 'value'], [/seat|crowd|cramp|noisy|busy/, 'crowding'], [/card|cash|terminal/, 'payment'], [/sold out|ran out/, 'availability']];
    map.forEach(function (m) { if (m[0].test(t) && topics.length < 3) topics.push(m[1]); });
    return { topics: topics, sentiment: r.rating >= 4 ? 'positive' : r.rating === 3 ? 'mixed' : 'negative' };
  }

  function sanitize(text, biz) {
    var t = String(text).trim().replace(/^["\u201c]|["\u201d]$/g, '').trim();
    t = t.replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[phone]').replace(/https?:\/\/\S+/g, '');
    var sig = biz.brand && biz.brand.signature;
    if (sig && t.indexOf(sig) === -1) t = t + '\n' + sig;
    return t;
  }

  function replyFor(biz, r) {
    if (getKey()) {
      return callLLM(systemPrompt(biz), userPrompt(biz, r)).then(function (text) {
        if (text) return { text: sanitize(text, biz), engine: PROVIDERS[getProvider()].model };
        return { text: rulesReply(biz, r), engine: 'brand-rules-engine' };
      }).catch(function (e) {
        console.error('[ai]', e.message);
        return { text: rulesReply(biz, r), engine: 'brand-rules-engine (AI failed: ' + e.message + ')' };
      });
    }
    return Promise.resolve({ text: rulesReply(biz, r), engine: 'brand-rules-engine' });
  }

  /* ---- perception (heuristic mining, mirrors the server engine) ---- */
  var STOP = {};
  ('the a an and or but of to in on at for with is are was were be been it its this that we i my our us you your they their very really so just about from as than then there here what which who while when after before all any both each few more most other some such only own same too').split(' ').forEach(function (w) { STOP[w] = 1; });

  function heuristicPerception(name, reviews) {
    var total = reviews.length || 1, pos = 0, neg = 0;
    var uni = new Map(), notes = new Map();
    reviews.forEach(function (r) {
      if (r.rating >= 4) pos++;
      if (r.rating <= 2) neg++;
      var t = (r.text || '').toLowerCase();
      if (!t) return;
      if (r.rating >= 4) {
        t.replace(/[^a-z\u00e1\u00e9\u00ed\u00f3\u00f6\u0151\u00fa\u00fc\u0171' -]/g, ' ').split(/\s+/).forEach(function (w) {
          if (w.length > 3 && !STOP[w]) uni.set(w, (uni.get(w) || 0) + 1);
        });
      } else {
        [[/wait|slow|queue/, 'can mean waits at busy times'], [/price|expensive/, 'prices on the higher side for some'], [/cold|dry|burnt|soggy/, 'occasional food consistency reports'], [/rude|service|staff/, 'service can be uneven per some guests'], [/sold out|ran out/, 'popular items sell out early'], [/card|cash/, 'bring cash \u2014 card payments can fail']].forEach(function (m) {
          if (m[0].test(t)) notes.set(m[1], (notes.get(m[1]) || 0) + 2);
        });
      }
    });
    function pct(n) { return Math.round(n / total * 100); }
    var famous = Array.from(uni.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6)
      .map(function (e) { return { name: e[0].charAt(0).toUpperCase() + e[0].slice(1), why: 'praised in ' + e[1] + '+ reviews' }; });
    return {
      about: name + ' collects strongly positive feedback \u2014 about ' + pct(pos) + '% of reviewers rate it 4\u2605 or 5\u2605' + (famous.length ? ', with \u201c' + famous.slice(0, 3).map(function (f) { return f.name.toLowerCase(); }).join('\u201d, \u201c') + '\u201d recurring across happy reviews' : '') + '.',
      famousFor: famous,
      thingsToNotice: Array.from(notes.keys()).slice(0, 5),
      atmosphere: pos > total / 2 ? 'Guests mostly describe the vibe warmly and keep coming back.' : 'Opinions on the atmosphere are divided.',
      bestFor: ['Regulars & locals', 'Visitors exploring the area', 'Food-first travellers'],
      sentimentSummary: pct(pos) + '% positive \u00b7 ' + pct(Math.max(0, total - pos - neg)) + '% mixed \u00b7 ' + pct(neg) + '% negative across ' + total + ' reviews.',
    };
  }

  function perceptionFor(biz, reviews) {
    if (getKey()) {
      var sample = reviews.slice(0, 40).map(function (r) { return '[' + r.rating + '\u2605] ' + r.author + ': ' + (r.text || '(no text)'); }).join('\n');
      var system = ['You are an analyst summarising what customers collectively say about a business on Google Maps.',
        'Reply with ONLY valid JSON of shape:',
        '{"about":"2-3 sentences","famous_for":[{"name":"most praised item","why":"short clause"}],"things_to_notice":["honest recurring caveats"],"atmosphere":"one sentence","best_for":["audience"],"sentiment_summary":"one sentence"}'].join('\n');
      return callLLM(system, 'Business: "' + biz.name + '". Here are ' + reviews.length + ' reviews:\n' + sample, 800)
        .then(function (raw) {
          var s = raw.indexOf('{'), e = raw.lastIndexOf('}');
          if (s === -1 || e <= s) throw new Error('bad json');
          var d = JSON.parse(raw.slice(s, e + 1));
          return {
            about: String(d.about || '').slice(0, 600),
            famousFor: (d.famous_for || []).slice(0, 6).map(function (f) { return typeof f === 'string' ? { name: f, why: '' } : { name: String(f.name || '').slice(0, 80), why: String(f.why || '').slice(0, 120) }; }),
            thingsToNotice: (d.things_to_notice || []).slice(0, 6).map(String),
            atmosphere: String(d.atmosphere || '').slice(0, 240),
            bestFor: (d.best_for || []).slice(0, 5).map(String),
            sentimentSummary: String(d.sentiment_summary || '').slice(0, 300),
          };
        })
        .then(function (d) { return Object.assign(d, { engine: PROVIDERS[getProvider()].model }); })
        .catch(function (e) { console.error('[ai] perception:', e.message); return Object.assign(heuristicPerception(biz.name, reviews), { engine: 'brand-rules-engine' }); });
    }
    return Promise.resolve(Object.assign(heuristicPerception(biz.name, reviews), { engine: 'brand-rules-engine' }));
  }

  window.AI = {
    PROVIDERS: PROVIDERS, getKey: getKey, setKey: setKey,
    getProvider: getProvider, setProvider: setProvider,
    engineLabel: engineLabel, replyFor: replyFor, classify: classify,
    perceptionFor: perceptionFor, heuristicPerception: heuristicPerception,
  };
})();

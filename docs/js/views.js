/* AutoReview — views. Each view returns { html, mount? }. Hash router in app.js. */

/* ---------------- shared chrome ---------------- */
function publicNav() {
  var u = Store.state.user;
  return '<header class="nav"><div class="wrap nav-in">'
    + '<a class="logo" href="#/"><span class="logo-mark">★</span> AutoReview</a>'
    + '<nav class="nav-links"><a href="#/" onclick="scrollToId(\'how\');return false">How it works</a><a href="#/" onclick="scrollToId(\'explore\');return false">Explore shops</a><a href="#/" onclick="scrollToId(\'pricing\');return false">Pricing</a></nav>'
    + '<div class="nav-cta">'
    + '<a class="btn btn-ghost btn-sm" href="' + ghRepoUrl() + '" target="_blank" rel="noopener">' + iconGitHub() + ' Repo</a>'
    + (u
      ? '<a class="nav-user" href="#/dashboard">' + (u.avatar_url ? '<img src="' + esc(u.avatar_url) + '" alt="">' : '') + esc(u.login) + '</a>'
      : '<a class="btn btn-dark btn-sm" href="#/login">' + iconGitHub() + ' Sign in</a>')
    + '</div></div></header>';
}
function ghRepoUrl() { return 'https://github.com/' + AR_CONFIG.repoFull; }
function scrollToId(id) { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }

function publicFoot() {
  return '<div class="gh-strip">' + iconGitHub() + ' This app runs entirely on GitHub — <a href="' + ghRepoUrl() + '" target="_blank" rel="noopener"><b>' + esc(AR_CONFIG.repoFull) + '</b></a>'
    + ' hosts the site, stores the data, and its <b>Actions</b> answer reviews on schedule.</div>'
    + '<footer class="footer"><div class="wrap footer-in"><div><a class="logo" href="#/"><span class="logo-mark">★</span> AutoReview</a><p>Every review answered. Every guest heard.</p></div>'
    + '<p class="faint tiny">AI engine: ' + esc(AI.engineLabel()) + '<br>Hosted on GitHub Pages · data versioned in Git</p></div></footer>';
}

/* ---------------- landing ---------------- */
function viewLanding() {
  var s = Store.stats();
  var shops = Store.state.businesses;
  var html = publicNav()
    + '<section class="hero"><div class="wrap hero-in">'
    + '<div class="hero-copy fade-up">'
    + '<div class="eyebrow"><span class="dot"></span> AI review responder · runs on GitHub</div>'
    + '<h1>Every Google review answered.<br><span class="grad-text">In your voice.</span> On autopilot.</h1>'
    + '<p class="sub">AutoReview answers your 4★ &amp; 5★ reviews instantly, drafts careful replies to the unhappy ones for your approval, and follows <b>your brand identity</b> on every word. Plus: anyone can look up what guests really say about a shop.</p>'
    + '<div class="hero-cta"><a class="btn btn-primary btn-lg" href="#/login">' + icon('bolt') + ' Connect your shop — free</a><a class="btn btn-outline btn-lg" href="#explore-dir" onclick="scrollToId(\'explore-dir\');return false">Explore shops</a></div>'
    + '<div class="hero-proof">'
    + '<div><strong>' + s.total + '</strong>reviews processed</div><div class="sep"></div>'
    + '<div><strong>' + s.answered + '</strong>answers posted</div><div class="sep"></div>'
    + '<div><strong>' + (s.avg || '—') + '★</strong>average rating</div><div class="sep"></div>'
    + '<div><strong>' + shops.length + '</strong>shops live</div>'
    + '</div></div>'
    + '<div class="mock fade-up">'
    + '<div class="mock-window"><div class="mock-bar"><i></i><i></i><i></i><span>autoreview · reviews inbox</span></div><div class="mock-body">'
    + '<div class="mock-row"><span class="mock-ava" style="' + avaStyle('Márta K.') + '">M</span><div class="mr-main"><div class="mr-name">Márta K. <span class="mock-stars">★★★★★</span></div><div class="mr-text">Best flat white in the district — the cinnamon knot is dangerous…</div></div><span class="chip-auto">' + icon('check') + ' auto-posted</span></div>'
    + '<div class="mock-ai"><div class="ai-tag">' + icon('sparkle') + ' AI reply · in brand voice</div>Thank you so much, Márta! Reviews like yours make our day — see you tomorrow at 8?<br>— Team Café Aroma ☕</div>'
    + '<div class="mock-row"><span class="mock-ava" style="' + avaStyle('Petra L.') + '">P</span><div class="mr-main"><div class="mr-name">Petra L. <span class="mock-stars mid">★★</span></div><div class="mr-text">Waited 20 minutes while staff chatted behind the counter…</div></div><span class="chip-draft">' + icon('edit') + ' draft waiting</span></div>'
    + '<div class="mock-row"><span class="mock-ava" style="' + avaStyle('James O.') + '">J</span><div class="mr-main"><div class="mr-name">James O’Connell <span class="mock-stars">★★★★★</span></div><div class="mr-text">Gorgeous interior, the Guatemala pour-over was fruity…</div></div><span class="chip-auto">' + icon('check') + ' auto-posted</span></div>'
    + '</div></div></div></div></section>'

    + '<section class="section"><div class="wrap">'
    + '<div class="grid grid-3">'
    + '<div class="feature"><div class="f-icon">' + iconGitHub('lg') + '</div><h3>GitHub Pages hosts it</h3><p>This whole app is a static site served by GitHub Pages — no servers, no bills, global CDN out of the box.</p></div>'
    + '<div class="feature"><div class="f-icon">' + icon('clock') + '</div><h3>GitHub Actions answers</h3><p>A scheduled workflow pulls new reviews, writes brand-aware replies with free AI models and posts them — every 30 minutes.</p></div>'
    + '<div class="feature"><div class="f-icon">' + icon('book') + '</div><h3>The repo is the database</h3><p>Businesses, reviews, replies and brand rules live as JSON in your repo — versioned, auditable, yours.</p></div>'
    + '</div></div></section>'

    + '<section class="section alt" id="how"><div class="wrap">'
    + '<div class="sec-head"><div class="eyebrow">' + icon('bolt') + ' How it works</div><h2>Sets up in minutes, then it just runs</h2><p>Four steps between you and never worrying about reviews again.</p></div>'
    + '<div class="steps">'
    + '<div class="step"><div class="step-num">1</div><h4>Sign in with GitHub</h4><p>A fine-grained token with write access to this repo is your owner key — no passwords stored on servers.</p></div>'
    + '<div class="step"><div class="step-num">2</div><h4>Add your brand</h4><p>Tone, house rules, signature, language. The AI follows your playbook on every reply.</p></div>'
    + '<div class="step"><div class="step-num">3</div><h4>Reviews flow in</h4><p>GitHub Actions syncs on schedule: 4–5★ answered &amp; posted instantly, ≤3★ parked as drafts.</p></div>'
    + '<div class="step"><div class="step-num">4</div><h4>You stay in control</h4><p>Approve, edit or skip negative-review drafts. Every change is a clean commit in your repo.</p></div>'
    + '</div></div></section>'

    + '<section class="section"><div class="wrap">'
    + '<div class="grid grid-4">'
    + '<div class="feature"><div class="f-icon">' + icon('bolt') + '</div><h3>Instant auto-replies</h3><p>4★ &amp; 5★ reviews get a warm, specific reply posted to Google without you lifting a finger.</p></div>'
    + '<div class="feature"><div class="f-icon">' + icon('shield') + '</div><h3>Negative? You decide</h3><p>1–3★ replies are never auto-posted. The AI drafts; you approve, edit or skip.</p></div>'
    + '<div class="feature"><div class="f-icon">' + icon('palette') + '</div><h3>Brand identity rules</h3><p>House “always” and “never” rules, tone, emoji policy, signature — enforced on every reply.</p></div>'
    + '<div class="feature"><div class="f-icon">' + icon('eye') + '</div><h3>Public perception pages</h3><p>Guests see what a shop is famous for, plus honest things to notice — built from real reviews.</p></div>'
    + '</div></div></section>'

    + '<section class="section alt" id="explore-dir"><div class="wrap">'
    + '<div class="sec-head"><div class="eyebrow">' + icon('search') + ' Shop perception search</div><h2>What do guests really say?</h2><p>Search a shop to see its collective perception: famous dishes, atmosphere, and the honest fine print.</p></div>'
    + '<div class="searchbox">' + icon('search', 's-icon') + '<input id="q" type="search" placeholder="Try “bakery”, “vegan” or “Aroma”…" autocomplete="off"><div id="q-results" class="results" hidden></div></div>'
    + '<div class="grid grid-3" id="dir" style="margin-top:40px">'
    + shops.map(function (b) { return shopCard(b); }).join('')
    + '</div></div></section>'

    + '<section class="section" id="pricing"><div class="wrap">'
    + '<div class="sec-head"><div class="eyebrow">' + icon('trend') + ' Pricing</div><h2>Free while you grow</h2><p>Running on your own GitHub repo keeps costs at zero — the paid tiers are for teams that want us to host everything.</p></div>'
    + '<div class="grid grid-3">'
    + '<div class="price-card"><h3>Self-hosted (this repo)</h3><div class="price">$0<span> forever</span></div><ul>'
    + ['Unlimited demo businesses', 'AI auto-replies via free models', 'Approval inbox & brand identity', 'GitHub Actions scheduled sync', 'Public perception pages'].map(function (f) { return '<li>' + icon('check') + f + '</li>'; }).join('')
    + '</ul><a class="btn btn-primary btn-block" href="#/login">Sign in with GitHub</a></div>'
    + '<div class="price-card hot"><div class="hot-badge">Most popular</div><h3>Hosted Pro</h3><div class="price">$19<span>/mo</span></div><ul>'
    + ['3 Google Business Profiles', 'Live Google review sync & posting', 'Priority AI models', 'Daily perception refresh', 'Email digests'].map(function (f) { return '<li>' + icon('check') + f + '</li>'; }).join('')
    + '</ul><a class="btn btn-dark btn-block" href="#/login">Start free trial</a></div>'
    + '<div class="price-card"><h3>Chain</h3><div class="price">$49<span>/mo</span></div><ul>'
    + ['Unlimited locations', 'Multi-owner teams', 'Custom AI models', 'SLA & priority support'].map(function (f) { return '<li>' + icon('check') + f + '</li>'; }).join('')
    + '</ul><a class="btn btn-outline btn-block" href="' + ghRepoUrl() + '/issues" target="_blank" rel="noopener">Talk to us</a></div>'
    + '</div></div></section>'
    + publicFoot();

  return {
    html: html,
    mount: function () {
      var input = document.getElementById('q'), box = document.getElementById('q-results');
      if (!input) return;
      input.addEventListener('input', function () {
        var term = input.value.trim().toLowerCase();
        if (term.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
        var hits = shops.filter(function (b) {
          return (b.name + ' ' + b.category + ' ' + b.address).toLowerCase().indexOf(term) !== -1;
        }).slice(0, 7);
        box.innerHTML = hits.length
          ? hits.map(function (b) {
              return '<a class="result" href="#/shop/' + b.id + '"><span><span class="r-name">' + esc(b.name) + '</span><br><span class="r-sub">' + esc(b.category) + (b.address ? ' · ' + esc(b.address) : '') + '</span></span><span class="r-stars">' + b.ratingAvg.toFixed(1) + '★ <span class="faint">(' + b.reviewsTotal + ')</span></span></a>';
            }).join('')
          : '<div class="result"><span class="r-sub">No shops match “' + esc(term) + '”</span></div>';
        box.hidden = false;
      });
      document.addEventListener('click', function onDoc(e) {
        if (box && !box.hidden && !box.contains(e.target) && e.target !== input) box.hidden = true;
      });
    },
  };
}

function shopCard(b) {
  var r = Math.round(b.ratingAvg);
  return '<a class="shop-card" href="#/shop/' + b.id + '">'
    + '<div class="top">' + avatar(b.name) + '<div style="flex:1;min-width:0"><h3>' + esc(b.name) + '</h3><span class="tag">' + esc(b.category) + '</span></div></div>'
    + starsHtml(b.ratingAvg) + '<span class="faint tiny">' + b.ratingAvg.toFixed(1) + ' · ' + b.reviewsTotal + ' reviews</span>'
    + '<p class="addr">' + esc(b.address || '') + '</p>'
    + '<span class="go">See perception ' + icon('external') + '</span></a>';
}

/* ---------------- public perception page ---------------- */
function viewShop(id) {
  var b = Store.bizById(id);
  if (!b) return viewError(404, 'No shop lives at this address.');
  var revs = Store.reviewsFor(id).sort(function (x, y) { return String(y.postedAt).localeCompare(String(x.postedAt)); });
  var p = Store.state.perceptions[String(b.id)];
  var split = sentimentSplit(revs);
  var dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  revs.forEach(function (r) { if (dist[r.rating] !== undefined) dist[r.rating]++; });
  var isOwner = !!Store.state.user;

  var html = publicNav()
    + '<section class="shop-hero"><div class="wrap shop-hero-in">'
    + '<span class="ava-xl" style="' + avaStyle(b.name) + '">' + esc(initials(b.name)) + '</span>'
    + '<div style="flex:1;min-width:220px"><h1>' + esc(b.name) + '</h1>'
    + '<p class="muted" style="margin:0">' + esc(b.category) + (b.address ? ' · ' + esc(b.address) : '') + '</p>'
    + '<p style="margin:6px 0 0">' + starsHtml(b.ratingAvg) + ' <b>' + b.ratingAvg.toFixed(1) + '</b> <span class="muted small">· ' + b.reviewsTotal + ' Google reviews · ' + (b.connection === 'google' ? 'live-synced' : 'demo data') + '</span></p></div>'
    + '<div style="text-align:center">'
    + '<div class="rating-ring" style="--p:' + Math.round(b.ratingAvg / 5 * 100) + '"><div class="inner"><div><b>' + b.ratingAvg.toFixed(1) + '</b><span>out of 5</span></div></div></div>'
    + (isOwner ? '<button class="btn btn-outline btn-sm" id="reanalyse" style="margin-top:10px">' + icon('refresh') + ' Re-analyse</button>' : '')
    + '</div></div></section>'

    + '<main class="wrap perc-grid">'
    + '<div>'
    + '<div class="panel fade-up"><div class="panel-head"><h2>' + icon('sparkle', 'lg') + ' What guests collectively say</h2>'
    + '<span class="badge brand">' + esc(p ? p.engine : 'not generated yet') + '</span></div>'
    + (p
      ? '<p style="font-size:1.02rem;color:var(--ink-2)">' + esc(p.about) + '</p>'
        + (p.famousFor && p.famousFor.length ? '<h3 class="sub-h">Most famous for</h3><div class="fame-grid">' + p.famousFor.map(function (f) { return '<div class="fame"><b>' + esc(f.name) + '</b>' + (f.why ? '<span>' + esc(f.why) + '</span>' : '') + '</div>'; }).join('') + '</div>' : '')
        + (p.atmosphere ? '<h3 class="sub-h">Atmosphere</h3><p class="muted" style="margin:0">' + esc(p.atmosphere) + '</p>' : '')
        + (p.thingsToNotice && p.thingsToNotice.length ? '<h3 class="sub-h">' + icon('warn') + ' Important things to notice</h3><ul class="notice">' + p.thingsToNotice.map(function (n) { return '<li>' + icon('warn') + '<span>' + esc(n) + '</span></li>'; }).join('') + '</ul>' : '')
        + (p.bestFor && p.bestFor.length ? '<h3 class="sub-h">Best for</h3><div class="pill-row">' + p.bestFor.map(function (x) { return '<span class="pill">' + esc(x) + '</span>'; }).join('') + '</div>' : '')
        + (p.sentimentSummary ? '<h3 class="sub-h">Sentiment</h3><div class="sent"><i class="s-pos" style="width:' + split.pos + '%"></i><i class="s-mid" style="width:' + split.mid + '%"></i><i class="s-neg" style="width:' + split.neg + '%"></i></div><p class="tiny muted" style="margin:0">' + esc(p.sentimentSummary) + '</p>' : '')
        + '<p class="faint tiny" style="margin:14px 0 0">Generated ' + esc(p.generatedAt || '') + ' UTC from real guest reviews.</p>'
      : '<p class="muted">No perception generated yet' + (isOwner ? ' — use “Re-analyse”.' : '. Check back soon!') + '</p>')
    + '</div>'

    + '<div class="panel"><div class="panel-head"><h2>Recent reviews</h2><span class="faint small">' + revs.length + ' shown</span></div>'
    + (revs.length ? revs.slice(0, 30).map(function (r) {
        return '<div class="review-item"><div class="ri-head"><b>' + esc(r.author) + '</b>' + starsHtml(r.rating) + (r.postedAt ? '<span class="faint tiny">' + esc(timeAgo(r.postedAt)) + '</span>' : '') + '</div>'
          + (r.text ? '<p>' + esc(r.text) + '</p>' : '')
          + (r.replyText && r.status !== 'pending_approval' ? '<div class="reply-of"><div class="lab">' + icon('send') + ' Reply from ' + esc(b.name) + '</div><p>' + esc(r.replyText).replace(/\n/g, '<br>') + '</p></div>' : '')
          + '</div>';
      }).join('') : '<p class="muted">No reviews yet.</p>')
    + '</div></div>'

    + '<aside>'
    + '<div class="panel"><h3 class="panel-title" style="font-size:1rem">Rating breakdown</h3>'
    + [5, 4, 3, 2, 1].map(function (star) {
        var n = dist[star] || 0, pct = revs.length ? Math.round(n / revs.length * 100) : 0;
        return '<div class="dist-row"><span class="lab">' + star + '★</span><div class="bar"><i class="' + (star === 3 ? 'mid' : star <= 2 ? 'neg' : '') + '" style="width:' + pct + '%"></i></div><span class="n">' + n + '</span></div>';
      }).join('')
    + '</div>'
    + (b.connection === 'demo' ? '<div class="panel" style="background:#fbfaff;border-color:#e6e1fa"><h4 style="margin-bottom:6px">Demo shop</h4><p class="muted small" style="margin:0">This is a fictional demo business with synthetic reviews so you can explore safely. Sign in and add your own to see your real perception here.</p></div>' : '')
    + '<div class="panel" style="background:linear-gradient(160deg,#141a2e,#252a4a);border:0"><h4 style="color:#fff">Own a shop?</h4><p class="small" style="color:#b6bdd6">Let AI answer your reviews in your voice — you keep control of the tricky ones.</p><a class="btn btn-primary btn-block" href="#/login">Start free</a></div>'
    + '</aside>'
    + '</main>'
    + publicFoot();

  return {
    html: html,
    mount: function () {
      var btn = document.getElementById('reanalyse');
      if (btn) btn.addEventListener('click', function () {
        busy(btn, true, 'Analysing…');
        Store.refreshPerception(b.id).then(function () {
          toast('Perception refreshed and committed to the repo'); location.reload();
        }).catch(function (e) { toast(e.message, 'err'); busy(btn, false); });
      });
    },
  };
}

/* ---------------- auth ---------------- */
function viewLogin() {
  var html = publicNav()
    + '<main class="auth"><div class="auth-card fade-up">'
    + '<a class="logo" href="#/" style="margin-bottom:20px"><span class="logo-mark">★</span> AutoReview</a>'
    + '<h1>Owner sign-in</h1><p class="muted small" style="margin-bottom:20px">This app is GitHub-native: your repo access <em>is</em> your owner account. Sign in with a GitHub token that can write to <b class="mono">' + esc(AR_CONFIG.repoFull) + '</b>.</p>'
    + '<div id="auth-error"></div>'
    + '<div class="field"><label>GitHub personal access token <span class="faint">(fine-grained)</span></label>'
    + '<input type="password" id="pat" placeholder="github_pat_… or ghp_…" autocomplete="off"></div>'
    + '<button class="btn btn-gh btn-block btn-lg" id="signin">' + iconGitHub() + ' Sign in with GitHub</button>'
    + '<div class="hint-box"><b style="color:var(--ink)">How to create the token</b><ol>'
    + '<li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → New fine-grained token</a></li>'
    + '<li><b>Repository access:</b> only <span class="mono">' + esc(AR_CONFIG.repoFull) + '</span></li>'
    + '<li><b>Permissions:</b> Contents → <b>Read and write</b>, Actions → <b>Read and write</b></li>'
    + '<li>Paste the token here — it stays in your browser (localStorage) and is sent only to GitHub.</li>'
    + '</ol></div>'
    + '<div class="or">or</div>'
    + '<a class="btn btn-outline btn-block" href="#/">Just browsing — view the public site</a>'
    + '<p class="faint tiny center" style="margin:14px 0 0">Why a token? With no backend server, writes (approving replies, saving brand rules) are committed to the repo with your token. Scope it tightly and give it a short expiry.</p>'
    + '</div></main>'
    + publicFoot();

  return {
    html: html,
    mount: function () {
      var btn = document.getElementById('signin'), input = document.getElementById('pat'), errBox = document.getElementById('auth-error');
      input.focus();
      function doLogin() {
        var t = input.value.trim();
        if (!t) { errBox.innerHTML = '<div class="badge err" style="margin-bottom:10px">Paste a token first</div>'; return; }
        busy(btn, true, 'Validating with GitHub…');
        GH.setToken(t);
        Promise.all([GH.me(), GH.repoAccess()]).then(function (res) {
          var user = res[0], perms = res[1];
          Store.state.user = user; Store.state.perms = perms;
          if (!perms.push) {
            GH.setToken('');
            Store.state.user = null;
            throw new Error('This token cannot push to ' + AR_CONFIG.repoFull + ' — grant Contents: Read and write.');
          }
          toast('Signed in as ' + user.login + ' — welcome!');
          location.hash = '#/dashboard';
        }).catch(function (e) {
          GH.setToken('');
          busy(btn, false);
          errBox.innerHTML = '<div class="badge err" style="margin-bottom:10px">' + esc(e.message) + '</div>';
        });
      }
      btn.addEventListener('click', doLogin);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    },
  };
}

/* ---------------- dashboard shell ---------------- */
function dashShell(content, active) {
  var u = Store.state.user, s = Store.stats();
  var pendingTotal = s.pending;
  var nav = [
    ['dashboard', 'grid', 'Overview', ''],
    ['dashboard/reviews', 'inbox', 'Reviews', pendingTotal ? String(pendingTotal) : ''],
    ['dashboard/brand', 'palette', 'Brand identity', ''],
    ['dashboard/settings', 'gear', 'Settings', ''],
  ].map(function (n) {
    return '<a href="#/' + n[0] + '" class="' + (active === n[0] ? 'active' : '') + '">' + icon(n[1]) + n[2] + (n[3] ? '<span class="count">' + n[3] + '</span>' : '') + '</a>';
  }).join('');
  return '<div class="shell"><aside class="side">'
    + '<a class="logo" href="#/"><span class="logo-mark">★</span> AutoReview</a>'
    + '<nav>' + nav + '</nav>'
    + '<div class="side-foot">'
    + '<div class="side-user">' + (u.avatar_url ? '<img src="' + esc(u.avatar_url) + '">' : '') + '<div><b>' + esc(u.name || u.login) + '</b><span>@' + esc(u.login) + '</span></div></div>'
    + '<button class="btn btn-ghost btn-sm" id="logout" style="justify-content:flex-start">' + icon('logout') + ' Sign out</button>'
    + '</div></aside>'
    + '<main class="main">' + content + '</main></div>';
}

function bindLogout() {
  var b = document.getElementById('logout');
  if (b) b.addEventListener('click', function () {
    GH.setToken(''); Store.state.user = null;
    toast('Signed out'); location.hash = '#/';
    render();
  });
}

/* ---------------- dashboard: overview ---------------- */
function viewDashOverview() {
  var s = Store.stats();
  var recent = Store.state.reviews.slice().sort(function (a, b) { return String(b.fetchedAt || b.postedAt).localeCompare(String(a.fetchedAt || a.postedAt)); }).slice(0, 8);
  var content = '<div class="main-head"><div><h1>Overview</h1><p class="sub">Repo <b class="mono">' + esc(AR_CONFIG.repoFull) + '</b> · AI engine: ' + esc(AI.engineLabel()) + '</p></div>'
    + '<div class="head-actions">'
    + '<button class="btn btn-outline" id="run-sync">' + icon('clock') + ' Run sync on GitHub</button>'
    + '<button class="btn btn-primary" id="sim-review">' + icon('sparkle') + ' Simulate incoming review</button>'
    + '</div></div>'
    + '<div class="stat-grid">'
    + '<div class="stat"><div class="n">' + s.total + '</div><div class="l">Total reviews</div></div>'
    + '<div class="stat warn"><div class="n">' + s.pending + '</div><div class="l">Awaiting approval</div></div>'
    + '<div class="stat good"><div class="n">' + s.answered + '</div><div class="l">Answered &amp; posted</div></div>'
    + '<div class="stat"><div class="n">' + (s.avg || '—') + '</div><div class="l">Average rating</div></div>'
    + '</div>'
    + '<div class="dash-grid">'
    + '<div class="panel"><div class="panel-head"><h2>Your businesses</h2><a class="small" href="#/dashboard/brand">Manage →</a></div>'
    + Store.state.businesses.map(function (b) {
        var pend = Store.pendingFor(b.id).length;
        return '<div class="row-item">' + avatar(b.name) + '<div class="row-main"><b>' + esc(b.name) + '</b><p>' + esc(b.category) + ' · ' + (b.connection === 'google' ? 'Google connected' : 'demo mode') + ' · ' + b.ratingAvg.toFixed(1) + '★</p></div>'
          + '<div class="row-actions">'
          + '<a class="btn btn-ghost btn-sm" href="#/dashboard/reviews?business=' + b.id + '">Inbox' + (pend ? ' (' + pend + ')' : '') + '</a>'
          + '<a class="btn btn-ghost btn-sm" href="#/shop/' + b.id + '" target="_blank">' + icon('eye') + '</a>'
          + '</div></div>';
      }).join('')
    + '<div style="padding-top:14px"><button class="btn btn-outline btn-sm" id="add-biz-open">' + icon('plus') + ' Add demo business</button>'
    + '<form id="add-biz" class="hidden" style="display:grid;gap:10px;margin-top:12px">'
    + '<input type="text" name="name" placeholder="Business name" required>'
    + '<input type="text" name="category" placeholder="Category (e.g. Bakery)">'
    + '<input type="text" name="address" placeholder="Address (optional)">'
    + '<button class="btn btn-primary btn-sm">Add business (commits to repo)</button></form></div>'
    + '</div>'
    + '<div class="panel"><div class="panel-head"><h2>Latest activity</h2><a class="small" href="#/dashboard/reviews">Inbox →</a></div>'
    + (recent.length ? recent.map(function (r) {
        var b = Store.bizById(r.businessId) || { name: '?' };
        var badge = r.status === 'auto_replied' ? '<span class="badge ok">' + icon('bolt') + 'auto-posted</span>'
          : r.status === 'pending_approval' ? '<span class="badge warn">' + icon('edit') + 'draft waiting</span>'
          : r.status === 'replied' ? '<span class="badge ok">' + icon('check') + 'replied</span>'
          : r.status === 'skipped' ? '<span class="badge soft">skipped</span>'
          : '<span class="badge soft">' + esc(r.status) + '</span>';
        return '<div class="row-item">' + starsHtml(r.rating) + '<div class="row-main"><b>' + esc(r.author) + '</b> <span class="faint tiny">on ' + esc(b.name) + ' · ' + esc(timeAgo(r.fetchedAt || r.postedAt)) + '</span>'
          + (r.text ? '<p>' + esc(r.text.slice(0, 90)) + (r.text.length > 90 ? '…' : '') + '</p>' : '') + '</div>' + badge + '</div>';
      }).join('') : '<p class="muted">No reviews yet — run a sync or simulate one.</p>')
    + '</div></div>';

  return {
    html: dashShell(content, 'dashboard'),
    mount: function () {
      bindLogout();
      var syncBtn = document.getElementById('run-sync');
      syncBtn.addEventListener('click', function () {
        busy(syncBtn, true, 'Dispatching…');
        GH.dispatchSync().then(function () {
          toast('Sync workflow dispatched — check the Actions tab');
          busy(syncBtn, false);
        }).catch(function (e) { toast(e.message, 'warn'); busy(syncBtn, false); });
      });
      document.getElementById('sim-review').addEventListener('click', function () {
        var biz = Store.state.businesses[0];
        if (!biz) { toast('Add a business first', 'warn'); return; }
        busy(this, true, 'Syncing…');
        Store.simulateIncoming(biz.id).then(function (res) {
          toast(res.review.rating + '★ from ' + res.review.author + ' — ' + (res.review.status === 'auto_replied' ? 'auto-replied & posted' : 'draft parked for approval'));
          render();
        }).catch(function (e) { toast(e.message, 'err'); render(); });
      });
      var open = document.getElementById('add-biz-open'), form = document.getElementById('add-biz');
      open.addEventListener('click', function () { form.classList.toggle('hidden'); });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        Store.addBusiness({ name: fd.get('name'), category: fd.get('category'), address: fd.get('address') }).then(function (b) {
          toast(b.name + ' added — committed to repo'); location.hash = '#/dashboard'; render();
        }).catch(function (er) { toast(er.message, 'err'); });
      });
    },
  };
}

/* ---------------- dashboard: reviews inbox ---------------- */
function viewReviews(query) {
  var businesses = Store.state.businesses;
  if (!businesses.length) {
    var emptyContent = '<div class="main-head"><div><h1>Reviews</h1><p class="sub">4–5★ posted automatically · ≤3★ waits for your approval</p></div></div>'
      + '<div class="empty">' + icon('inbox') + '<b>No business connected yet</b>Add one from the Overview page and reviews will start flowing.</div>';
    return { html: dashShell(emptyContent, 'dashboard/reviews'), mount: bindLogout };
  }
  var bid = Number(query.business) || businesses[0].id;
  var filter = ['pending', 'auto', 'all'].indexOf(query.filter) !== -1 ? query.filter : 'pending';
  var b = Store.bizById(bid) || businesses[0];
  var pending = Store.pendingFor(b.id);
  var auto = Store.reviewsFor(b.id).filter(function (r) { return r.status === 'auto_replied'; }).sort(function (x, y) { return String(y.postedAt).localeCompare(String(x.postedAt)); });
  var handled = Store.reviewsFor(b.id).filter(function (r) { return ['auto_replied', 'replied', 'skipped', 'reply_failed'].indexOf(r.status) !== -1; })
    .sort(function (x, y) { return String(y.postedAt).localeCompare(String(x.postedAt)); });

  var pills = businesses.map(function (x) {
    return '<a class="tab ' + (x.id === b.id ? 'active' : '') + '" href="#/dashboard/reviews?business=' + x.id + '&filter=' + filter + '">' + esc(x.name) + '</a>';
  }).join('');
  var tabs = '<div class="tabs">'
    + '<a class="tab ' + (filter === 'pending' ? 'active' : '') + '" href="#/dashboard/reviews?business=' + b.id + '&filter=pending">Needs approval <span class="n">' + pending.length + '</span></a>'
    + '<a class="tab ' + (filter === 'auto' ? 'active' : '') + '" href="#/dashboard/reviews?business=' + b.id + '&filter=auto">Auto-posted <span class="n">' + auto.length + '</span></a>'
    + '<a class="tab ' + (filter === 'all' ? 'active' : '') + '" href="#/dashboard/reviews?business=' + b.id + '&filter=all">All handled <span class="n">' + handled.length + '</span></a>'
    + '</div>';

  var body = '';
  if (filter === 'pending') {
    body = pending.length ? pending.map(function (r) { return draftCard(r, b); }).join('')
      : '<div class="empty">' + icon('check-circle') + '<b>All clear — nothing waiting</b>Negative review drafts land here for a final check before they go to Google.</div>';
  } else if (filter === 'auto') {
    body = auto.length ? auto.map(function (r) { return handledCard(r, b); }).join('') : '<div class="empty">' + icon('bolt') + '<b>No auto-posted replies yet</b>4★ and 5★ reviews answered by AI will appear here.</div>';
  } else {
    body = handled.length ? handled.map(function (r) { return handledCard(r, b); }).join('') : '<div class="empty">' + icon('inbox') + '<b>Nothing handled yet</b></div>';
  }

  var content = '<div class="main-head"><div><h1>Reviews inbox</h1><p class="sub">4–5★ replies are <b>posted automatically</b> · ≤3★ wait for <b>your approval</b></p></div>'
    + '<div class="head-actions"><button class="btn btn-outline" id="run-sync2">' + icon('clock') + ' Run sync</button>'
    + '<button class="btn btn-primary" id="sim-review2">' + icon('sparkle') + ' Simulate incoming review</button></div></div>'
    + '<div class="pill-switch">' + pills + '</div>' + tabs + '<div id="inbox-body">' + body + '</div>';

  return {
    html: dashShell(content, 'dashboard/reviews'),
    mount: function () {
      bindLogout();
      bindDraftCards();
      var syncBtn = document.getElementById('run-sync2');
      if (syncBtn) syncBtn.addEventListener('click', function () {
        busy(syncBtn, true, 'Dispatching…');
        GH.dispatchSync().then(function () { toast('Sync workflow dispatched'); busy(syncBtn, false); })
          .catch(function (e) { toast(e.message, 'warn'); busy(syncBtn, false); });
      });
      var sim = document.getElementById('sim-review2');
      if (sim) sim.addEventListener('click', function () {
        busy(sim, true, 'Syncing…');
        Store.simulateIncoming(b.id).then(function (res) {
          toast(res.review.rating + '★ from ' + res.review.author + ' — ' + (res.review.status === 'auto_replied' ? 'auto-replied' : 'draft waiting'));
          render();
        }).catch(function (e) { toast(e.message, 'err'); render(); });
      });
    },
  };
}

function draftCard(r, b) {
  return '<div class="draft in fade-up" data-id="' + r.id + '">'
    + '<div class="draft-left"><div class="ri-meta">' + starsHtml(r.rating) + '<b>' + esc(r.author) + '</b>'
    + (r.topics && r.topics.length ? '<span class="badge brand">' + esc(r.topics.join(', ')) + '</span>' : '')
    + '<span class="faint tiny">' + esc(timeAgo(r.postedAt)) + '</span></div>'
    + (r.text ? '<blockquote>“' + esc(r.text) + '”</blockquote>' : '<p class="muted small">(stars only, no text)</p>')
    + '</div>'
    + '<div class="draft-right"><div class="draft-label">' + icon('sparkle') + ' AI draft — edit freely, then approve to post</div>'
    + '<textarea rows="4" class="draft-text">' + esc(r.replyText || '') + '</textarea>'
    + '<div class="draft-actions">'
    + '<button class="btn btn-primary btn-sm act-approve">' + icon('send') + ' Approve &amp; post</button>'
    + '<button class="btn btn-outline btn-sm act-regen">' + icon('refresh') + ' Regenerate</button>'
    + '<button class="btn btn-ghost btn-sm act-skip">' + icon('skip') + ' Skip</button>'
    + '</div><div class="tiny faint act-status" style="margin-top:8px"></div></div></div>';
}

function handledCard(r, b) {
  var badge = r.status === 'auto_replied' ? '<span class="badge ok">' + icon('bolt') + ' auto-posted</span>'
    : r.status === 'replied' ? '<span class="badge ok">' + icon('check') + ' replied</span>'
    : r.status === 'skipped' ? '<span class="badge soft">skipped — no reply</span>'
    : '<span class="badge err">post failed</span>';
  var src = r.replySource === 'ai_auto' ? 'AI auto-reply' : r.replySource === 'ai_approved' ? 'AI draft, approved by you' : r.replySource === 'manual' ? 'written by you' : r.replySource;
  return '<div class="handled fade-up"><div class="ri-meta">' + starsHtml(r.rating) + '<b>' + esc(r.author) + '</b><span class="faint tiny">' + esc(timeAgo(r.postedAt)) + '</span>' + badge + '</div>'
    + (r.text ? '<blockquote>“' + esc(r.text) + '”</blockquote>' : '')
    + (r.replyText && r.status !== 'skipped' ? '<div class="reply-of"><div class="lab">' + icon('send') + ' Your reply · ' + esc(src || '') + (r.repliedAt ? ' · ' + esc(timeAgo(r.repliedAt)) : '') + '</div><p>' + esc(r.replyText).replace(/\n/g, '<br>') + '</p></div>' : '')
    + '</div>';
}

function bindDraftCards() {
  document.querySelectorAll('.draft').forEach(function (card) {
    var id = card.dataset.id;
    var textarea = card.querySelector('.draft-text');
    var statusEl = card.querySelector('.act-status');
    function lock(on) { card.querySelectorAll('button').forEach(function (x) { x.disabled = on; }); }
    card.querySelector('.act-approve').addEventListener('click', function () {
      var btn = this; lock(true); statusEl.textContent = 'Committing to repo & posting…';
      Store.approveDraft(id, textarea.value.trim()).then(function () {
        toast('Reply approved, posted and committed'); render();
      }).catch(function (e) { toast(e.message, 'err'); statusEl.textContent = ''; lock(false); });
    });
    card.querySelector('.act-regen').addEventListener('click', function () {
      var btn = this; lock(true); statusEl.textContent = 'Generating new draft…';
      var r = Store.state.reviews.find(function (x) { return x.id === Number(id); });
      var b = Store.bizById(r.businessId);
      AI.replyFor(b, r).then(function (res) {
        textarea.value = res.text;
        statusEl.textContent = 'New draft ready (' + res.engine + ')';
        lock(false);
      });
    });
    card.querySelector('.act-skip').addEventListener('click', function () {
      lock(true);
      Store.skipReview(id).then(function () { toast('Skipped — this review won’t be answered'); render(); })
        .catch(function (e) { toast(e.message, 'err'); lock(false); });
    });
  });
}

/* ---------------- dashboard: brand identity ---------------- */
function viewBrand(query) {
  var businesses = Store.state.businesses;
  if (!businesses.length) {
    var c = '<div class="main-head"><div><h1>Brand identity</h1></div></div><div class="empty">' + icon('palette') + '<b>No business yet</b>Add one from the Overview page first.</div>';
    return { html: dashShell(c, 'dashboard/brand'), mount: bindLogout };
  }
  var b = Store.bizById(Number(query.business)) || businesses[0];
  var brand = b.brand || {};
  var pills = businesses.map(function (x) {
    return '<a class="tab ' + (x.id === b.id ? 'active' : '') + '" href="#/dashboard/brand?business=' + x.id + '">' + esc(x.name) + '</a>';
  }).join('');

  function sel(list, cur) {
    return list.map(function (v) { return '<option value="' + v[0] + '"' + (cur === v[0] ? ' selected' : '') + '>' + v[1] + '</option>'; }).join('');
  }
  var content = '<div class="main-head"><div><h1>Brand identity</h1><p class="sub">These rules steer every AI reply — the more specific, the more <em>you</em> it sounds.</p></div></div>'
    + '<div class="pill-switch">' + pills + '</div>'
    + '<div class="brand-grid">'
    + '<div>'
    + '<div class="panel"><h3 class="panel-title">' + icon('palette') + ' Voice</h3>'
    + '<div class="form-2">'
    + '<div class="field"><label>Tone</label><select id="b-tone">' + sel([['friendly', 'Friendly'], ['warm', 'Warm'], ['professional', 'Professional'], ['playful', 'Playful'], ['quirky', 'Quirky'], ['luxurious', 'Luxurious']], brand.tone || 'friendly') + '</select></div>'
    + '<div class="field"><label>Reply language</label><input id="b-language" type="text" value="' + esc(brand.language || 'English') + '" placeholder="English / Magyar / Deutsch…"></div>'
    + '<div class="field"><label>Emoji policy</label><select id="b-emoji">' + sel([['none', 'None'], ['sparingly', 'Sparingly'], ['freely', 'Freely']], brand.emojiPolicy || 'sparingly') + '</select></div>'
    + '<div class="field"><label>Reply length</label><select id="b-length">' + sel([['short', 'Short (under 45 words)'], ['medium', 'Medium (40–80)'], ['long', 'Long (up to 110)']], brand.replyLength || 'medium') + '</select></div>'
    + '</div>'
    + '<div class="field"><label>About the business <span class="faint">(the AI weaves this in)</span></label><textarea id="b-about" rows="3" placeholder="Family-run specialty coffee house since 2016…">' + esc(brand.about || '') + '</textarea></div>'
    + '<div class="field" style="margin-bottom:0"><label>Signature <span class="faint">(ends every reply)</span></label><input id="b-signature" type="text" value="' + esc(brand.signature || '') + '" placeholder="— Team Café Aroma ☕"></div>'
    + '</div>'
    + '<div class="panel"><h3 class="panel-title">' + icon('shield') + ' House rules</h3>'
    + '<div class="field"><label>Always</label><textarea id="b-rulesDo" rows="3" placeholder="Thank guests by name. Mention our house pastries…">' + esc(brand.rulesDo || '') + '</textarea></div>'
    + '<div class="field" style="margin-bottom:0"><label>Never</label><textarea id="b-rulesDont" rows="3" placeholder="Never offer refunds. No slang. Don’t mention prices…">' + esc(brand.rulesDont || '') + '</textarea></div>'
    + '<p class="faint tiny" style="margin:12px 0 0">Safety rails are always on: the AI never promises refunds or payments and never shares contact details.</p></div>'
    + '</div>'
    + '<div class="panel"><h3 class="panel-title">' + icon('sparkle') + ' Live reply preview</h3>'
    + '<p class="muted small">Test how a 5★ and a 2★ review would be answered with the current rules.</p>'
    + '<div class="preview-box"><div class="pv-tag">' + icon('star') + ' Reply to a 5★ review</div><div id="pv-pos">Fill in the brand fields and press preview…</div></div>'
    + '<div class="preview-box" style="margin-top:10px"><div class="pv-tag" style="color:var(--red)">' + icon('star') + ' Reply to a 2★ review</div><div id="pv-neg">…</div></div>'
    + '<button class="btn btn-outline btn-block btn-sm" id="preview-btn" style="margin-top:12px">' + icon('sparkle') + ' Preview with current fields</button>'
    + '<button class="btn btn-primary btn-block" id="save-brand" style="margin-top:10px">' + icon('check') + ' Save brand identity (commits to repo)</button>'
    + '<p class="faint tiny center" style="margin:10px 0 0">Applies to all future replies — including the GitHub Actions worker.</p>'
    + '</div>'
    + '</div>';

  return {
    html: dashShell(content, 'dashboard/brand'),
    mount: function () {
      bindLogout();
      var saveBtn = document.getElementById('save-brand');
      saveBtn.addEventListener('click', function () {
        busy(saveBtn, true, 'Committing…');
        var brand = {
          tone: document.getElementById('b-tone').value,
          language: document.getElementById('b-language').value.trim(),
          emojiPolicy: document.getElementById('b-emoji').value,
          replyLength: document.getElementById('b-length').value,
          about: document.getElementById('b-about').value.trim(),
          signature: document.getElementById('b-signature').value.trim(),
          rulesDo: document.getElementById('b-rulesDo').value.trim(),
          rulesDont: document.getElementById('b-rulesDont').value.trim(),
        };
        Store.saveBrand(b.id, brand).then(function () {
          toast('Brand identity saved — committed to the repo'); busy(saveBtn, false);
        }).catch(function (e) { toast(e.message, 'err'); busy(saveBtn, false); });
      });
      var pvBtn = document.getElementById('preview-btn');
      pvBtn.addEventListener('click', function () {
        busy(pvBtn, true, 'Generating…');
        var current = {
          tone: document.getElementById('b-tone').value,
          language: document.getElementById('b-language').value.trim(),
          emojiPolicy: document.getElementById('b-emoji').value,
          replyLength: document.getElementById('b-length').value,
          about: document.getElementById('b-about').value.trim(),
          signature: document.getElementById('b-signature').value.trim(),
          rulesDo: document.getElementById('b-rulesDo').value.trim(),
          rulesDont: document.getElementById('b-rulesDont').value.trim(),
        };
        var testBiz = Object.assign({}, b, { brand: current });
        Promise.all([
          AI.replyFor(testBiz, { author: 'Anna K.', rating: 5, text: 'Amazing place — the best thing I tasted all month. Lovely staff too!' }),
          AI.replyFor(testBiz, { author: 'Tom R.', rating: 2, text: 'Waited 30 minutes and the order came out wrong. Not great.' }),
        ]).then(function (res) {
          document.getElementById('pv-pos').innerHTML = esc(res[0].text).replace(/\n/g, '<br>');
          document.getElementById('pv-neg').innerHTML = esc(res[1].text).replace(/\n/g, '<br>');
          busy(pvBtn, false);
        });
      });
    },
  };
}

/* ---------------- dashboard: settings ---------------- */
function viewSettings() {
  var u = Store.state.user;
  var content = '<div class="main-head"><div><h1>Settings</h1><p class="sub">Connection health, AI engine and credentials.</p></div></div>'
    + '<div class="panel"><h3 class="panel-title">' + icon('plug') + ' Connections</h3>'
    + '<div class="set-row"><div class="s-main"><b><span class="status-dot ok"></span> GitHub repo</b><p>Data + hosting: <span class="mono">' + esc(AR_CONFIG.repoFull) + '</span> — public pages, versioned data, Actions worker.</p></div><a class="btn btn-outline btn-sm" href="' + ghRepoUrl() + '" target="_blank" rel="noopener">' + icon('external') + ' Open</a></div>'
    + '<div class="set-row"><div class="s-main"><b><span class="status-dot ok"></span> GitHub Pages</b><p>This site is served from <span class="mono">/docs</span> by the pages.yml workflow.</p></div><span class="badge ok">live</span></div>'
    + '<div class="set-row"><div class="s-main"><b><span class="status-dot ok"></span> Actions sync worker</b><p>Runs every 30 minutes (<span class="mono">sync.yml</span>): pulls reviews, answers, commits. Add Google secrets to sync your real Business Profile.</p></div><button class="btn btn-outline btn-sm" id="run-sync3">' + icon('clock') + ' Run now</button></div>'
    + '<div class="set-row"><div class="s-main"><b><span class="status-dot off"></span> Google Business Profile</b><p>Live review pulling & reply posting run inside the Actions worker. Configure repo secrets: <span class="mono">GOOGLE_CLIENT_ID</span>, <span class="mono">GOOGLE_CLIENT_SECRET</span>, <span class="mono">GOOGLE_REFRESH_TOKEN</span>, then set the business connection to “google”.</p></div><a class="btn btn-outline btn-sm" href="' + ghRepoUrl() + '/settings/secrets/actions" target="_blank" rel="noopener">' + icon('external') + ' Secrets</a></div>'
    + '</div>'
    + '<div class="panel"><h3 class="panel-title">' + icon('sparkle') + ' AI engine (your browser only)</h3>'
    + '<p class="muted small">Pick a free-tier provider and paste an API key. It is stored in this browser\u2019s localStorage and never committed. Without a key, the built-in brand-rules engine writes replies offline.</p>'
    + '<div class="form-2">'
    + '<div class="field"><label>Provider</label><select id="ai-provider">'
    + Object.keys(AI.PROVIDERS).map(function (k) { return '<option value="' + k + '"' + (AI.getProvider() === k ? ' selected' : '') + '>' + esc(AI.PROVIDERS[k].label) + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="field"><label>API key</label><input type="password" id="ai-key" value="' + esc(AI.getKey()) + '" placeholder="sk-or-… / gsk_… / AIza…"></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="ai-save">Save AI key</button>'
    + '<button class="btn btn-ghost btn-sm" id="ai-clear">Clear key (use rules engine)</button>'
    + '<span class="badge soft" style="align-self:center">Current: ' + esc(AI.engineLabel()) + '</span></div>'
    + '</div>'
    + '<div class="panel"><h3 class="panel-title">' + iconGitHub() + ' GitHub account</h3>'
    + '<div class="set-row"><div class="s-main"><b><img src="' + esc(u.avatar_url || '') + '" style="width:26px;height:26px;border-radius:50%"> ' + esc(u.name || u.login) + ' <span class="faint">@' + esc(u.login) + '</span></b><p>Token stored locally · ' + (Store.state.perms && Store.state.perms.admin ? 'admin' : 'write') + ' access to this repo.</p></div>'
    + '<button class="btn btn-outline btn-sm" id="logout2">' + icon('logout') + ' Sign out</button></div>'
    + '</div>';

  return {
    html: dashShell(content, 'dashboard/settings'),
    mount: function () {
      bindLogout();
      var lb = document.getElementById('logout2');
      if (lb) lb.addEventListener('click', function () { GH.setToken(''); Store.state.user = null; toast('Signed out'); location.hash = '#/'; render(); });
      document.getElementById('ai-save').addEventListener('click', function () {
        var v = document.getElementById('ai-key').value.trim();
        AI.setProvider(document.getElementById('ai-provider').value);
        AI.setKey(v);
        toast(v ? 'AI key saved — replies now use ' + AI.engineLabel() : 'Provider saved');
        render();
      });
      document.getElementById('ai-clear').addEventListener('click', function () {
        AI.setKey(''); toast('Key cleared — using brand-rules engine'); render();
      });
      var syncBtn = document.getElementById('run-sync3');
      syncBtn.addEventListener('click', function () {
        busy(syncBtn, true, 'Dispatching…');
        GH.dispatchSync().then(function () { toast('Sync workflow dispatched — watch the Actions tab'); busy(syncBtn, false); })
          .catch(function (e) { toast(e.message, 'warn'); busy(syncBtn, false); });
      });
    },
  };
}

/* ---------------- error ---------------- */
function viewError(code, msg) {
  return {
    html: publicNav() + '<main class="wrap error-page"><h1>' + code + '</h1><p class="muted">' + esc(msg || 'Something went wrong.') + '</p><a class="btn btn-primary" href="#/">Back home</a></main>' + publicFoot(),
  };
}

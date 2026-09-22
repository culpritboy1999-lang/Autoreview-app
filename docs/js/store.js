/* AutoReview — data store. Source of truth: docs/data/*.json in this repo.
   Reads are public (Pages static files); writes are Git commits by the signed-in owner. */
(function () {
  var state = {
    businesses: [], reviews: [], perceptions: {},
    loaded: false, user: null, perms: null, repoError: null,
  };

  function load() {
    return Promise.all([
      GH.readPublic('businesses.json'),
      GH.readPublic('reviews.json'),
      GH.readPublic('perceptions.json').catch(function () { return {}; }),
    ]).then(function (r) {
      state.businesses = r[0]; state.reviews = r[1]; state.perceptions = r[2] || {};
      state.loaded = true; state.repoError = null;
      return state;
    }).catch(function (e) {
      state.repoError = e.message; state.loaded = true;
      throw e;
    });
  }

  function bizById(id) { return state.businesses.find(function (b) { return String(b.id) === String(id); }); }
  function reviewsFor(bid) { return state.reviews.filter(function (r) { return String(r.businessId) === String(bid); }); }
  function pendingFor(bid) { return reviewsFor(bid).filter(function (r) { return r.status === 'pending_approval'; }); }
  function nextReviewId() { return state.reviews.reduce(function (m, r) { return Math.max(m, r.id || 0); }, 0) + 1; }
  function stats() {
    var total = state.reviews.length;
    var pending = state.reviews.filter(function (r) { return r.status === 'pending_approval'; }).length;
    var answered = state.reviews.filter(function (r) { return ['auto_replied', 'replied'].indexOf(r.status) !== -1; }).length;
    var avg = total ? Math.round(state.reviews.reduce(function (s, r) { return s + r.rating; }, 0) / total * 10) / 10 : 0;
    return { total: total, pending: pending, answered: answered, avg: avg };
  }

  /* ---------- mutations (each = a Git commit to the repo) ---------- */
  function saveReviews(msg) { return GH.writeFile('reviews.json', state.reviews, msg); }
  function saveBusinesses(msg) { return GH.writeFile('businesses.json', state.businesses, msg); }
  function savePerceptions(msg) { return GH.writeFile('perceptions.json', state.perceptions, msg); }

  function approveDraft(reviewId, text, source) {
    var r = state.reviews.find(function (x) { return x.id === Number(reviewId); });
    if (!r) return Promise.reject(new Error('Review not found'));
    r.replyText = text;
    r.replySource = source || 'ai_approved';
    r.status = 'replied';
    r.repliedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return saveReviews('reply approved & posted to review #' + r.id + ' (' + r.author + ')').then(function () { return r; });
  }

  function saveDraft(reviewId, text) {
    var r = state.reviews.find(function (x) { return x.id === Number(reviewId); });
    if (!r) return Promise.reject(new Error('Review not found'));
    r.replyText = text; r.replySource = 'ai_draft';
    return saveReviews('regenerated draft for review #' + r.id).then(function () { return r; });
  }

  function skipReview(reviewId) {
    var r = state.reviews.find(function (x) { return x.id === Number(reviewId); });
    if (!r) return Promise.reject(new Error('Review not found'));
    r.status = 'skipped';
    return saveReviews('skipped review #' + r.id + ' (no reply posted)');
  }

  function saveBrand(businessId, brand) {
    var b = bizById(businessId);
    if (!b) return Promise.reject(new Error('Business not found'));
    b.brand = brand;
    return saveBusinesses('brand identity updated for ' + b.name);
  }

  function addBusiness(data) {
    var id = state.businesses.reduce(function (m, b) { return Math.max(m, b.id), m; }, 0) + 1;
    var b = {
      id: id, name: data.name, category: data.category || 'Local business', address: data.address || '',
      connection: 'demo', googleLocationName: 'locations/demo_' + Date.now(), placeId: 'demo_place_' + Date.now(),
      ratingAvg: 0, reviewsTotal: 0,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      brand: { tone: 'friendly', about: '', signature: '', language: 'English', rulesDo: '', rulesDont: '', emojiPolicy: 'sparingly', replyLength: 'medium' },
    };
    state.businesses.push(b);
    return saveBusinesses('added business ' + b.name).then(function () { return b; });
  }

  function removeBusiness(businessId) {
    var b = bizById(businessId);
    if (!b) return Promise.reject(new Error('Business not found'));
    state.businesses = state.businesses.filter(function (x) { return String(x.id) !== String(businessId); });
    state.reviews = state.reviews.filter(function (x) { return String(x.businessId) !== String(businessId); });
    delete state.perceptions[String(businessId)];
    return Promise.all([
      saveBusinesses('removed business ' + b.name),
      saveReviews('cleanup reviews for removed ' + b.name),
    ]).then(function () { return b; });
  }

  function refreshPerception(businessId) {
    var b = bizById(businessId);
    var revs = reviewsFor(businessId);
    if (!b || !revs.length) return Promise.reject(new Error('No reviews to analyse yet'));
    return AI.perceptionFor(b, revs).then(function (p) {
      p.generatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      state.perceptions[String(businessId)] = p;
      return savePerceptions('perception refreshed for ' + b.name + ' (' + p.engine + ')').then(function () { return p; });
    });
  }

  /* ---------- incoming review pipeline (same policy as the Actions worker) ---------- */
  var GENERIC_POOL = [
    ['Sára J.', 5, 'Absolutely wonderful — warm staff, beautiful space and everything we tried was delicious. Highly recommend!'],
    ['Mike D.', 4, 'Really enjoyed it. Small hiccup with the wait, but the quality more than made up for it. Will be back.'],
    ['Edit F.', 3, 'Decent overall. Some things were great, others need a bit of polish. A mixed visit.'],
    ['Jon B.', 2, 'Not our best visit — it felt disorganised and things took very long to arrive.'],
    ['Kata M.', 1, 'Honestly disappointing. Rude service and poor quality for the price.'],
    ['Leo V.', 5, 'Top marks! Friendly faces and a lovely atmosphere. A new favourite.'],
    ['Hanna W.', 4, 'Very good experience overall — tiny details kept it from perfect, but I would absolutely return.'],
  ];
  var NAMED_POOL = {
    'Café Aroma': [['Yuki N.', 5, 'The barista drew a tiny frog in my latte art and I thought about it all day. Warm, cozy, honest coffee.'], ['Dmitri A.', 2, 'Waited 15 minutes while one barista handled everything alone. Coffee was fine but the wait killed the morning vibe.']],
    'The Rustic Spoon': [['Jonas W.', 5, 'Chef came out to explain the farm sourcing — you can taste the difference. The 8-hour goulash is worth the flight alone.'], ['Amelia D.', 2, 'Booked a table for 7:30, got seated at 8:15 with no apology. Food was lovely, but the evening felt chaotic.']],
    'Golden Crust Bakery': [['Peti Zs.', 5, 'They saved me a loaf after I called ahead. That’s a bakery that cares. Crust like glass, crumb like custard.'], ['Ádám K.', 2, 'Arrived 10:40 Saturday — literally nothing left but one croissant. Update your online hours!']],
    'Urban Verde': [['Kenji M.', 5, 'First vegan meal ever and I didn’t even notice. Staff cheered when I said that. Cashew burrata = witchcraft.'], ['Gregor B.', 2, 'The burrata was sold out (of course) and the bowl I got was half sauce. Tasty but tiny for the price.']],
    'Danube Bites': [['Martin Č.', 5, 'Chimney cake at midnight beside the Danube — perfect Budapest night. The walnut version is the one.'], ['Kata Gy.', 1, 'Rude when I asked for less garlic. Lángos itself was soggy.']],
  };

  function simulateIncoming(businessId) {
    var b = bizById(businessId);
    if (!b) return Promise.reject(new Error('Business not found'));
    var pool = (NAMED_POOL[b.name] || []).concat(GENERIC_POOL);
    var pick = pool[Math.floor(Math.random() * pool.length)];
    var cls = AI.classify({ rating: pick[1], text: pick[2] });
    var review = {
      id: nextReviewId(), businessId: b.id,
      googleReviewId: 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      author: pick[0], rating: pick[1], text: pick[2],
      postedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      fetchedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 'new', replyText: '', replySource: '', repliedAt: null,
      topics: cls.topics, sentiment: cls.sentiment,
    };
    state.reviews.push(review);
    return AI.replyFor(b, review).then(function (res) {
      review.replyText = res.text;
      if (review.rating >= 4) {
        review.status = 'auto_replied'; review.replySource = 'ai_auto'; review.repliedAt = review.fetchedAt;
      } else {
        review.status = 'pending_approval'; review.replySource = 'ai_draft';
      }
      var mine = reviewsFor(b.id);
      b.reviewsTotal = mine.filter(function (x) { return x.status !== 'pending_approval'; }).length;
      b.ratingAvg = Math.round(mine.reduce(function (s, x) { return s + x.rating; }, 0) / mine.length * 10) / 10;
      return saveReviews('sync: new ' + review.rating + '\u2605 review from ' + review.author + ' (' + res.engine + ') — ' + (review.status === 'auto_replied' ? 'auto-replied' : 'draft awaiting approval'))
        .then(function () { return { review: review, engine: res.engine }; });
    });
  }

  window.Store = {
    state: state, load: load,
    bizById: bizById, reviewsFor: reviewsFor, pendingFor: pendingFor, stats: stats,
    approveDraft: approveDraft, saveDraft: saveDraft, skipReview: skipReview,
    saveBrand: saveBrand, addBusiness: addBusiness, removeBusiness: removeBusiness,
    refreshPerception: refreshPerception, simulateIncoming: simulateIncoming,
  };
})();

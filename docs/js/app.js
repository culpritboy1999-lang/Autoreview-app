/* AutoReview — hash router + boot */
(function () {
  function parseHash() {
    var h = location.hash.replace(/^#/, '') || '/';
    var q = {};
    var qm = h.indexOf('?');
    if (qm !== -1) {
      h.slice(qm + 1).split('&').forEach(function (kv) {
        var p = kv.split('=');
        q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
      h = h.slice(0, qm);
    }
    return { path: h.replace(/\/+$/, '') || '/', query: q };
  }

  function render() {
    var route = parseHash();
    var app = document.getElementById('app');
    var v;
    try {
      if (route.path === '/') v = viewLanding();
      else if (/^\/shop\/[\w-]+$/.test(route.path)) v = viewShop(route.path.split('/')[2]);
      else if (route.path === '/login') v = viewLogin();
      else if (route.path === '/dashboard') v = guard(viewDashOverview, route);
      else if (route.path === '/dashboard/reviews') v = guard(function () { return viewReviews(route.query); }, route);
      else if (route.path === '/dashboard/brand') v = guard(function () { return viewBrand(route.query); }, route);
      else if (route.path === '/dashboard/settings') v = guard(viewSettings, route);
      else v = viewError(404, 'That page drifted off the map.');
    } catch (e) {
      console.error(e);
      v = viewError(500, e.message);
    }
    app.innerHTML = v.html;
    window.scrollTo(0, 0);
    if (v.mount) v.mount();
  }

  function guard(viewFn) {
    if (!Store.state.user) {
      setTimeout(function () { location.hash = '#/login'; }, 0);
      return { html: '<main class="wrap error-page"><span class="spinner"></span><p class="muted">Redirecting to sign-in…</p></main>' };
    }
    return viewFn();
  }

  function boot() {
    var splash = document.getElementById('splash');
    var app = document.getElementById('app');

    Store.load().then(function () {
      return GH.token()
        ? Promise.all([GH.me(), GH.repoAccess()]).then(function (res) {
            Store.state.user = res[0]; Store.state.perms = res[1];
            if (!res[1].push) { GH.setToken(''); Store.state.user = null; }
          }).catch(function () { GH.setToken(''); })
        : Promise.resolve();
    }).then(function () {
      app.hidden = false;
      splash.classList.add('done');
      setTimeout(function () { splash.remove(); }, 400);
      window.addEventListener('hashchange', render);
      render();
    }).catch(function (e) {
      splash.innerHTML = '<div class="splash-mark">★</div><div class="center" style="max-width:420px">'
        + '<h2 style="font-size:1.1rem">Cannot load shop data</h2>'
        + '<p class="muted small">' + esc(e.message || 'Unknown error') + '</p>'
        + '<p class="muted tiny">Serve this app over HTTP (GitHub Pages does this automatically) so it can read <span class="mono">data/*.json</span>.</p></div>';
    });
  }

  boot();
})();

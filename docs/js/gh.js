/* AutoReview — GitHub API client.
   The repo IS the backend: data files live in docs/data/, public reads go
   through the Pages-hosted static files, owner writes go through the
   GitHub Contents API using the signed-in owner's token. */
(function () {
  var CFG = window.AR_CONFIG;
  var TOKEN_KEY = 'ar_token';

  function token() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ Accept: 'application/vnd.github+json' }, opts.headers || {});
    var t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    return fetch('https://api.github.com' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      if (res.status === 401) { setToken(''); throw new Error('Your GitHub token expired or is invalid — please sign in again.'); }
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          var msg = (body && body.message) || ('GitHub API error ' + res.status);
          var err = new Error(msg); err.status = res.status; throw err;
        });
      }
      return res.status === 204 ? null : res.json();
    });
  }

  /* ---- identity & permissions ---- */
  function me() { return api('/user'); }
  function repoAccess() {
    return api('/repos/' + CFG.repoFull).then(function (r) {
      var perms = r.permissions || {};
      return { push: !!perms.push, admin: !!perms.admin, private: r.private };
    });
  }

  /* ---- data files ---- */
  function publicFilePath(name) { return (CFG.dataDir || 'data') + '/' + name; }
  function repoFilePath(name) { return (CFG.repoDataDir || 'docs/data') + '/' + name; }

  // Public read: relative fetch (served by GitHub Pages — fast, no rate limits)
  function readPublic(name) {
    return fetch(publicFilePath(name), { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('Cannot load ' + name + ' (' + res.status + ')');
      return res.json();
    });
  }
  // Current blob sha (needed for updates via Contents API)
  function shaOf(name) {
    return api('/repos/' + CFG.repoFull + '/contents/' + repoFilePath(name)).then(function (r) { return r.sha; });
  }
  // Commit a JSON file to the repo
  function writeFile(name, value, message) {
    return shaOf(name).catch(function (e) {
      if (e.status === 404) return undefined; // new file
      throw e;
    }).then(function (sha) {
      return api('/repos/' + CFG.repoFull + '/contents/' + repoFilePath(name), {
        method: 'PUT',
        body: {
          message: message || 'update ' + name + ' [skip ci]',
          branch: 'main',
          sha: sha,
          content: btoa(unescape(encodeURIComponent(JSON.stringify(value, null, 2) + '\n'))),
        },
      });
    });
  }

  /* ---- workflow dispatch (run the sync worker on GitHub) ---- */
  function dispatchSync() {
    return api('/repos/' + CFG.repoFull + '/actions/workflows/' + CFG.syncWorkflow + '/dispatches', {
      method: 'POST', body: { ref: 'main' },
    }).catch(function (e) {
      if (e.status === 404 || e.status === 403) throw new Error('Your token needs Actions: write permission to trigger the sync workflow.');
      throw e;
    });
  }

  window.GH = {
    token: token, setToken: setToken,
    me: me, repoAccess: repoAccess,
    readPublic: readPublic, writeFile: writeFile, dispatchSync: dispatchSync,
  };
})();

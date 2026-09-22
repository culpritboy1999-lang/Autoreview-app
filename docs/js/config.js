/* AutoReview — runtime config. Repo is auto-detected from the GitHub Pages URL;
   override with window.AUTOREVIEW_CONFIG if you fork into a different layout. */
(function () {
  function detect() {
    try {
      var h = location.hostname, p = location.pathname;
      if (h.endsWith('.github.io') || h.endsWith('.github.com')) {
        var owner = h.split('.')[0];
        var seg = p.split('/').filter(Boolean)[0];
        if (seg) return { owner: owner, repo: seg };
        return { owner: owner, repo: owner + '.github.io' };
      }
    } catch (e) { /* fall through */ }
    return { owner: 'culpritboy1999-lang', repo: 'Autoreview-app' };
  }
  var c = detect();
  window.AR_CONFIG = Object.assign({
    owner: c.owner,
    repo: c.repo,
    repoFull: c.owner + '/' + c.repo,
    dataDir: 'data',
    repoDataDir: 'docs/data',
    syncWorkflow: 'sync.yml',
    demoLogin: null
  }, window.AUTOREVIEW_CONFIG || {});
})();

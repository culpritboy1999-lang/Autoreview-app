'use strict';
/* Headless render test: loads the browser scripts with DOM stubs and renders
   every view, catching reference errors and broken templates. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DOCROOT = path.join(__dirname, '..', 'docs');

function makeEl() {
  return {
    innerHTML: '', hidden: false, value: '', dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    style: {},
    addEventListener() {}, appendChild() {}, remove() {}, focus() {},
    querySelectorAll() { return []; }, querySelector() { return makeEl(); },
    contains() { return false; }, scrollIntoView() {},
  };
}
const sandbox = {
  console,
  localStorage: { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; }, removeItem(k) { delete this._s[k]; } },
  location: { hash: '', hostname: 'localhost', pathname: '/' },
  navigator: {},
  fetch(url) {
    const m = String(url).match(/data\/([\w-]+\.json)$/);
    if (m) return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(path.join(DOCROOT, 'data', m[1]), 'utf8'))) });
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  },
  document: {
    getElementById() { return makeEl(); },
    querySelectorAll() { return []; },
    addEventListener() {}, createElement() { return makeEl(); },
  },
  requestAnimationFrame(fn) { fn(); },
  setTimeout(fn) { return 0; }, clearTimeout() {},
  AbortController: class { constructor() { this.signal = {}; } abort() {} },
  btoa(s) { return Buffer.from(s, 'binary').toString('base64'); },
  URL,
};
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const f of ['config.js', 'util.js', 'icons.js', 'gh.js', 'ai.js', 'store.js', 'views.js']) {
  vm.runInContext(fs.readFileSync(path.join(DOCROOT, 'js', f), 'utf8'), sandbox, { filename: f });
}

const tests = [];
function t(name, fn) { tests.push([name, fn]); }

t('landing renders', () => {
  const v = sandbox.viewLanding();
  if (!v.html.includes('Every Google review answered')) throw new Error('hero missing');
  if (!v.html.includes('Golden Crust Bakery')) throw new Error('directory missing');
  if (v.mount) v.mount();
});
t('perception page renders with AI content', () => {
  const v = sandbox.viewShop('1');
  if (!v.html.includes('What guests collectively say')) throw new Error('perception panel missing');
  if (!v.html.includes('Most famous for')) throw new Error('famous section missing');
});
t('perception 404', () => {
  const v = sandbox.viewShop('999');
  if (!v.html.includes('404')) throw new Error('expected 404');
});
t('login renders', () => {
  const v = sandbox.viewLogin();
  if (!v.html.includes('Sign in with GitHub')) throw new Error('login missing');
});
t('dashboard requires auth + renders', () => {
  sandbox.Store.state.user = { login: 'octocat', name: 'Octo Cat', avatar_url: '' };
  sandbox.Store.state.perms = { push: true, admin: false };
  const v = sandbox.viewDashOverview();
  if (!v.html.includes('Overview')) throw new Error('overview missing');
  if (!v.html.includes('Awaiting approval')) throw new Error('stats missing');
});
t('reviews inbox renders drafts', () => {
  const v = sandbox.viewReviews({ business: '1', filter: 'pending' });
  if (!v.html.includes('Needs approval')) throw new Error('tabs missing');
  if (!v.html.includes('draft')) throw new Error('draft cards missing');
});
t('brand editor renders', () => {
  const v = sandbox.viewBrand({ business: '1' });
  if (!v.html.includes('House rules')) throw new Error('brand panel missing');
  if (!v.html.includes('Live reply preview')) throw new Error('preview missing');
});
t('settings renders', () => {
  const v = sandbox.viewSettings();
  if (!v.html.includes('AI engine')) throw new Error('ai panel missing');
  if (!v.html.includes('Actions sync worker')) throw new Error('actions row missing');
});
t('ai rules engine reply works offline', () => {
  const b = sandbox.Store.bizById('1');
  return sandbox.AI.replyFor(b, { author: 'Test User', rating: 2, text: 'Waited forever, rude staff.' }).then((res) => {
    if (!res.text.includes('Test') || !res.text.includes('sorry')) throw new Error('bad reply: ' + res.text);
  });
});
t('simulate incoming review pipeline', () => {
  return sandbox.Store.simulateIncoming('1').then((res) => {
    if (!res.review.replyText) throw new Error('no reply generated');
    if (res.review.rating >= 4 && res.review.status !== 'auto_replied') throw new Error('policy broken');
    if (res.review.rating < 4 && res.review.status !== 'pending_approval') throw new Error('policy broken');
  });
});
t('heuristic perception works', () => {
  const b = sandbox.Store.bizById('2');
  const p = sandbox.AI.heuristicPerception(b.name, sandbox.Store.reviewsFor('2'));
  if (!p.about || !Array.isArray(p.famousFor)) throw new Error('bad perception');
});

(async () => {
  await sandbox.Store.load();
  let pass = 0, fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('  ✓', name); }
    catch (e) { fail++; console.log('  ✗', name, '→', e.message); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

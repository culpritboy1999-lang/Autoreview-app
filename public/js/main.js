'use strict';
/* AutoReview client behaviours: public search, draft actions, toasts. */

/* ---------------- toast ---------------- */
function toast(message, type) {
  let holder = document.getElementById('toast-holder');
  if (!holder) {
    holder = document.createElement('div');
    holder.id = 'toast-holder';
    holder.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:200;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(holder);
  }
  const t = document.createElement('div');
  t.textContent = message;
  t.style.cssText = `padding:12px 18px;border-radius:12px;box-shadow:0 12px 32px -8px rgba(0,0,0,.25);font:600 .9rem/1.4 -apple-system,Segoe UI,Roboto,sans-serif;max-width:340px;background:${type === 'error' ? '#dc2626' : type === 'warn' ? '#d97706' : '#171923'};color:#fff;opacity:0;transform:translateY(8px);transition:all .25s`;
  holder.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'none'; });
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 300); }, 3600);
}

/* ---------------- public shop search ---------------- */
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
if (searchInput && searchResults) {
  let timer = null;
  const run = async () => {
    const qy = searchInput.value.trim();
    if (qy.length < 2) { searchResults.hidden = true; searchResults.innerHTML = ''; return; }
    try {
      const res = await fetch(`/api/public/search?q=${encodeURIComponent(qy)}`);
      const data = await res.json();
      if (!data.results.length) {
        searchResults.innerHTML = '<div class="search-result"><span class="sr-sub">No shops found</span></div>';
        searchResults.hidden = false;
        return;
      }
      searchResults.innerHTML = data.results.map((r) => {
        const href = r.source === 'google' ? '#' : `/shop/${r.id}`;
        const stars = r.rating ? `<span class="sr-stars">${Number(r.rating).toFixed(1)}★ <span class="muted">(${r.ratingsCount || 0})</span></span>` : '';
        const sub = r.source === 'google' ? `${r.address || ''} · on Google — add a Places key to open` : `${r.category || ''}${r.address ? ' · ' + r.address : ''}`;
        return `<a class="search-result" href="${href}">
          <span><span class="sr-name">${r.name}</span><br><span class="sr-sub">${sub}</span></span>${stars}</a>`;
      }).join('');
      searchResults.hidden = false;
      searchResults.querySelectorAll('.search-result').forEach((el) =>
        el.addEventListener('click', () => { searchResults.hidden = true; }));
    } catch { /* silent */ }
  };
  searchInput.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 220); });
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
  document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) searchResults.hidden = true;
  });
}

/* ---------------- review draft actions ---------------- */
document.querySelectorAll('.draft-card').forEach((card) => {
  const id = card.dataset.reviewId;
  const textarea = card.querySelector('.draft-text');
  const status = card.querySelector('.draft-status');
  const setBusy = (b) => card.querySelectorAll('button').forEach((x) => (x.disabled = b));

  card.querySelector('.act-approve')?.addEventListener('click', async () => {
    setBusy(true); status.textContent = 'Posting to Google…';
    try {
      const res = await fetch(`/dashboard/reviews/${id}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textarea.value, source: 'ai_approved' }),
      });
      const data = await res.json();
      if (data.ok) { toast('Reply posted to Google ✓'); card.style.transition = 'all .4s'; card.style.opacity = '0.35'; setTimeout(() => location.reload(), 700); }
      else { toast(data.error || 'Posting failed — check the connection', 'error'); status.textContent = ''; }
    } catch { toast('Network error while posting', 'error'); status.textContent = ''; }
    setBusy(false);
  });

  card.querySelector('.act-regen')?.addEventListener('click', async () => {
    setBusy(true); status.textContent = 'Regenerating with AI…'; textarea.value = '';
    try {
      const res = await fetch(`/dashboard/reviews/${id}/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) { textarea.value = data.text; status.textContent = `New draft ready (${data.engine}).`; }
      else toast(data.error || 'Regeneration failed', 'error');
    } catch { toast('Network error', 'error'); }
    setBusy(false);
  });

  card.querySelector('.act-skip')?.addEventListener('click', async () => {
    setBusy(true);
    try {
      await fetch(`/dashboard/reviews/${id}/skip`, { method: 'POST' });
      toast('Skipped — this review won’t be answered'); setTimeout(() => location.reload(), 500);
    } catch { toast('Network error', 'error'); setBusy(false); }
  });
});

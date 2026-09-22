/* AutoReview — tiny DOM + helper utilities */
(function () { /* nothing to initialise here; helpers below are global */ })();

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function starsHtml(rating, cls) {
  var r = Math.max(0, Math.min(5, rating | 0));
  var full = '★'.repeat(r), off = '★'.repeat(5 - r);
  var c = cls || (rating >= 4 ? 'pos' : rating === 3 ? 'mid' : 'neg');
  return '<span class="stars ' + c + '" title="' + rating + ' out of 5">' + full + '<span class="off">' + off + '</span></span>';
}
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var d = new Date(String(dateStr).replace(' ', 'T') + (String(dateStr).length === 19 ? 'Z' : ''));
  var s = (Date.now() - d.getTime()) / 1000;
  if (isNaN(s)) return String(dateStr).slice(0, 10);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 86400 * 30) return Math.floor(s / 86400) + 'd ago';
  return String(dateStr).slice(0, 10);
}
function initials(name) { return String(name || '?').trim().charAt(0).toUpperCase(); }
function hue(str) { var h = 0; for (var i = 0; i < String(str).length; i++) h = (h * 31 + str.charCodeAt(i)) % 360; return h; }
function avaStyle(name) { return 'background:linear-gradient(135deg,hsl(' + hue(name) + ',62%,52%),hsl(' + ((hue(name) + 40) % 360) + ',58%,44%))'; }
function avatar(name, cls) { return '<span class="' + (cls || 'ava') + '" style="' + avaStyle(name) + '">' + esc(initials(name)) + '</span>'; }

function toast(msg, type) {
  var holder = document.getElementById('toasts');
  var t = document.createElement('div');
  t.className = 'toast ' + (type || 'ok');
  var ic = type === 'err' ? 'alert' : type === 'warn' ? 'alert' : 'check';
  t.innerHTML = icon(ic) + '<span>' + esc(msg) + '</span>';
  holder.appendChild(t);
  requestAnimationFrame(function () { t.classList.add('show'); });
  setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 3800);
}

function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> ' + (label || 'Working…'); }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}
function sentimentSplit(reviews) {
  var pos = 0, mid = 0, neg = 0;
  reviews.forEach(function (r) { if (r.rating >= 4) pos++; else if (r.rating === 3) mid++; else neg++; });
  var t = pos + mid + neg;
  return t ? { pos: Math.round(pos / t * 100), mid: Math.round(mid / t * 100), neg: Math.round(neg / t * 100) } : { pos: 0, mid: 0, neg: 0 };
}

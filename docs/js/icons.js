/* AutoReview — inline SVG icon set (stroke, 24px viewBox) */
(function () {
  var P = {
    star: '<path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" fill="currentColor" stroke="none"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>',
    bolt: '<path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5z"/>',
    shield: '<path d="M12 2.5l7.5 3v6c0 5-3.2 8.4-7.5 10-4.3-1.6-7.5-5-7.5-10v-6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    palette: '<path d="M12 21a9 9 0 1 1 9-9c0 2.5-1.5 3.5-3 3.5h-2a2 2 0 0 0-1.5 3.3c.4.5.5 1.2.1 1.6-.5.4-1.5.6-2.6.6z"/><circle cx="7.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/>',
    plug: '<path d="M9 7V3m6 4V3M6.5 7h11l-.7 5.2a5 5 0 0 1-4.8 4.3v4.5h0a2 2 0 1 1-1 0v-4.5a5 5 0 0 1-4.8-4.3z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.3M20 5v6h-6"/>',
    send: '<path d="M21 3L10.5 13.5M21 3l-7 19-3.5-8.5L2 10z"/>',
    edit: '<path d="M17 3.5a2.3 2.3 0 0 1 3.3 3.3L8 19l-4.5 1.2L4.7 15.7z"/>',
    skip: '<path d="M17 5v14M6 5l8 7-8 7z"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19 12c0-.6.4-1.7 0-2.3l1.6-1.8-1.6-2.8-2.3.6c-.6-.3-1.2-.9-2.3-1L13.7 2h-3.4l-.7 2.7c-1 .2-1.7.7-2.3 1l-2.3-.6-1.6 2.8L5 9.7c-.4.6 0 1.7 0 2.3s-.4 1.7 0 2.3l-1.6 1.8 1.6 2.8 2.3-.6c.6.3 1.3.8 2.3 1l.7 2.7h3.4l.7-2.7c1-.2 1.7-.7 2.3-1l2.3.6 1.6-2.8-1.6-1.8c.4-.6 0-1.7 0-2.3z"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h11"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.8-4.8"/>',
    sparkle: '<path d="M12 3l1.7 4.6L18.5 9l-4.8 1.4L12 15l-1.7-4.6L5.5 9l4.8-1.4zM19 15l.9 2.4 2.1.6-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.6z" fill="currentColor" stroke="none"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>',
    inbox: '<path d="M4 13h4l2 3h4l2-3h4M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    eye: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h14"/>',
    warn: '<path d="M12 3L2.5 20h19zM12 10v4M12 17.5v.5"/>',
  };
  window.icon = function (name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.star) + '</svg>';
  };
  window.iconGitHub = function (cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .8a11.2 11.2 0 0 0-3.5 21.8c.5.1.8-.2.8-.5v-2c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.5-.3-5.1-1.3-5.1-5.6 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.5.1-3 0 0 1-.3 3.1 1.2a10.7 10.7 0 0 1 5.6 0c2.2-1.5 3.1-1.2 3.1-1.2.6 1.5.2 2.7.1 3 .7.8 1.1 1.8 1.1 3 0 4.4-2.6 5.3-5.1 5.6.4.4.8 1.1.8 2.2v3.2c0 .3.2.6.8.5A11.2 11.2 0 0 0 12 .8z"/></svg>';
  };
})();

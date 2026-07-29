/*
 * Soft page transitions.
 * When a user clicks an internal link, fade the page out, then navigate.
 * Respects prefers-reduced-motion.
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Respect user's reduced-motion preference
  var prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  var FADE_OUT_MS = 320;

  function isInternalLink(a) {
    if (!a || !a.href) return false;
    // Ignore anchors, javascript:, mailto:, tel:, external targets
    if (a.target && a.target !== '_self') return false;
    var href = a.getAttribute('href') || '';
    if (!href) return false;
    if (href.charAt(0) === '#') return false;
    if (/^(javascript:|mailto:|tel:|sms:)/i.test(href)) return false;
    // Same-origin only
    try {
      var url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      // If it's a link to the same page (with only hash difference), skip
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  document.addEventListener(
    'click',
    function (e) {
      // Support modifier clicks (Cmd/Ctrl/Shift/Middle) — user wants a new tab
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      var target = e.target;
      while (target && target !== document.body) {
        if (target.tagName === 'A') break;
        target = target.parentNode;
      }
      if (!target || target.tagName !== 'A') return;
      if (!isInternalLink(target)) return;

      // If already leaving, ignore
      if (document.body.classList.contains('page-leaving')) return;

      e.preventDefault();
      var href = target.href;
      document.body.classList.add('page-leaving');
      window.setTimeout(function () {
        window.location.href = href;
      }, FADE_OUT_MS);
    },
    false
  );

  // Handle browser back/forward: if returning via bfcache, ensure the
  // page-leaving class is removed so the page is visible.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      document.body.classList.remove('page-leaving');
    }
  });
})();

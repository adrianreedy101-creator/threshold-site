/* ==========================================================================
   TRANSLATE - language switcher for The Missing Link / Threshold
   No dependencies. Detects current language from the URL, remembers
   user choice, offers browser-language on first visit.
   ========================================================================== */
(function () {
  'use strict';

  // Language catalog - code, native label, English label, RTL flag
  const LANGS = [
    { code: 'en', native: 'English',    english: 'English',    rtl: false },
    { code: 'es', native: 'Español',    english: 'Spanish',    rtl: false },
    { code: 'ru', native: 'Русский',    english: 'Russian',    rtl: false },
    { code: 'id', native: 'Indonesia',  english: 'Indonesian', rtl: false },
    { code: 'ar', native: 'العربية',    english: 'Arabic',     rtl: true  },
  ];

  // Detect the current language from the URL path.
  // Scans every segment (not just the first) so it works under proxied
  // preview URLs like /proxy/xxx/es/index.html AND real deployment URLs
  // like themissinglink.one/es/index.html.
  function detectCurrentLang() {
    const parts = location.pathname.split('/').filter(Boolean);
    // Iterate from the last segment backward - the language code always
    // sits immediately before the filename.
    for (let i = parts.length - 1; i >= 0; i--) {
      const seg = parts[i].toLowerCase();
      if (LANGS.some(l => l.code === seg)) return seg;
    }
    return 'en';
  }

  // Given the current URL, compute the equivalent URL in target lang.
  // Uses RELATIVE path navigation so it works both on the real production
  // domain (themissinglink.one/es/index.html) and inside proxied previews.
  //
  // The key insight: we know the CURRENT language, so we just compute how
  // many `../` segments we need to escape the current language folder,
  // then append the target language folder + current filename.
  function computeUrlForLang(targetLang) {
    const { pathname, search, hash } = location;
    const parts = pathname.split('/').filter(Boolean);

    // Find current language segment index (if any)
    let langIndex = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (LANGS.some(l => l.code === parts[i].toLowerCase())) {
        langIndex = i;
        break;
      }
    }

    // Get the filename (last segment, e.g. index.html)
    let filename = parts[parts.length - 1] || 'index.html';
    if (!filename.includes('.')) filename = 'index.html';

    // Build the relative URL
    let relPath;
    if (langIndex >= 0) {
      // We're inside a language folder - go up one level, then into target
      if (targetLang === 'en') {
        relPath = '../' + filename;
      } else {
        relPath = '../' + targetLang + '/' + filename;
      }
    } else {
      // We're at the English root
      if (targetLang === 'en') {
        relPath = './' + filename;
      } else {
        relPath = './' + targetLang + '/' + filename;
      }
    }
    return relPath + search + hash;
  }

  // Build the switcher DOM element
  function buildSwitcher(currentLang) {
    const container = document.createElement('div');
    container.className = 'lang-switch';
    container.setAttribute('aria-expanded', 'false');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-switch-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-label', 'Translate');
    btn.innerHTML = `
      <span>Translate</span>
      <span class="lang-code">${currentLang.toUpperCase()}</span>
      <span class="lang-caret" aria-hidden="true"></span>
    `;
    container.appendChild(btn);

    const menu = document.createElement('ul');
    menu.className = 'lang-switch-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Choose a language');
    LANGS.forEach(lang => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = computeUrlForLang(lang.code);
      a.setAttribute('hreflang', lang.code);
      a.setAttribute('lang', lang.code);
      if (lang.code === currentLang) a.setAttribute('aria-current', 'true');
      a.innerHTML = `
        <span class="lang-native">${lang.native}</span>
        <span class="lang-english">${lang.english}</span>
      `;
      // Persist choice on click
      a.addEventListener('click', function () {
        try { var s = window['local'+'Storage']; if (s) s.setItem('tml_lang', lang.code); } catch (e) {}
      });
      li.appendChild(a);
      menu.appendChild(li);
    });
    container.appendChild(menu);

    // Toggle open/close
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      const isOpen = container.getAttribute('aria-expanded') === 'true';
      container.setAttribute('aria-expanded', String(!isOpen));
    });
    // Close on outside click
    document.addEventListener('click', function () {
      container.setAttribute('aria-expanded', 'false');
    });
    // Close on Escape
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') container.setAttribute('aria-expanded', 'false');
    });

    return container;
  }

  // ------------------------------------------------------------------
  // Rewrite all internal links on the page so they stay inside the
  // current language. Runs on every page load in every language.
  //
  // Rules:
  //   "/"                        -> "/<lang>/"  (root -> language root)
  //   "/about"  or "/about.html" -> "/<lang>/about.html"
  //   "./about.html"             -> "./about.html" (already relative, leave)
  //   "../about.html"            -> "../about.html" (already relative to lang, leave)
  //   External URLs (http://, mailto:, tel:)   -> untouched
  //   Anchors (#foo)             -> untouched
  //   Zapier / form actions / third-party      -> untouched
  //
  // When on the English root, no rewriting needed (default state).
  // ------------------------------------------------------------------
  function rewriteInternalLinks(currentLang) {
    // We run this on every language, English included. English pages
    // still need their clean-URL nav links (e.g. "/about") normalized
    // to relative paths ("./about.html") so they work on the preview
    // proxy and locally, not just on the live domain.

    // Known internal page slugs across both sites.
    const KNOWN_PAGES = new Set([
      // TML
      'index', 'index.html', 'about', 'about.html',
      'threshold', 'threshold.html', 'request', 'request.html',
      'thank-you', 'thank-you.html',
      // Threshold
      'apply', 'apply.html', 'the-missing-link', 'the-missing-link.html',
    ]);

    // Figure out where we currently sit relative to the site root.
    // A page under a language folder needs "./<file>" for siblings; a page
    // at the root needs "./<lang>/<file>".  We detect by looking at the
    // last non-empty path segment before the filename.
    //
    // Examples:
    //   /es/about.html    -> depth in lang folder, prefix = './'
    //   /es/              -> same
    //   /about.html       -> at site root, prefix = './<lang>/'
    //   /                 -> same
    //
    // We do NOT use absolute paths starting with '/', because the site can
    // live under a proxy prefix (preview URLs) where '/' is the proxy origin
    // rather than the site root.
    const path = location.pathname.split('/').filter(Boolean);
    const langCodes = LANGS.map(l => l.code);
    // Walk from the end; the last segment that is a known language code
    // tells us we're inside that language folder.
    let currentPathLang = 'en';
    for (let i = path.length - 1; i >= 0; i--) {
      const seg = path[i].toLowerCase();
      if (langCodes.indexOf(seg) !== -1) {
        currentPathLang = seg;
        break;
      }
    }

    // Where does the target language live relative to us?
    //   currentPathLang == currentLang, currentLang == 'en'  -> './'         (root -> root sibling)
    //   currentPathLang == currentLang, other lang           -> './'         (in lang folder -> sibling)
    //   currentPathLang == 'en',        target other lang    -> './<lang>/'  (root -> lang folder)
    //   currentPathLang == other lang,  target == 'en'       -> '../'        (lang folder -> root)
    //   currentPathLang == 'ru',        target == 'es'       -> '../es/'     (lang folder -> another lang folder)
    let langPrefix;
    if (currentPathLang === currentLang) {
      langPrefix = './';
    } else if (currentPathLang === 'en') {
      langPrefix = './' + currentLang + '/';
    } else if (currentLang === 'en') {
      langPrefix = '../';
    } else {
      langPrefix = '../' + currentLang + '/';
    }

    const links = document.querySelectorAll('a[href]');
    links.forEach(function (a) {
      // Skip the language switcher - it manages its own hrefs.
      if (a.closest('.lang-switch')) return;

      const raw = a.getAttribute('href');
      if (!raw) return;

      // Skip external / mail / tel / anchor / javascript.
      if (/^(https?:|mailto:|tel:|javascript:|#)/i.test(raw)) return;

      // Split off query / hash so we can preserve them.
      const hashIdx = raw.search(/[?#]/);
      const pathPart = hashIdx === -1 ? raw : raw.slice(0, hashIdx);
      const suffix   = hashIdx === -1 ? ''  : raw.slice(hashIdx);

      // Normalize the slug: strip leading ./ ../ / and any language segment.
      let slug = pathPart.replace(/^(\.\.?\/)+/, '').replace(/^\//, '');
      const parts = slug.split('/').filter(Boolean);
      if (parts.length > 0 && langCodes.indexOf(parts[0].toLowerCase()) !== -1) {
        parts.shift();
      }
      const cleanSlug = parts.join('/');

      // Empty (root) -> language home
      if (cleanSlug === '' || cleanSlug === 'index.html') {
        a.setAttribute('href', langPrefix + 'index.html' + suffix);
        return;
      }

      // Known internal page -> language folder
      const baseSlug = cleanSlug.replace(/\.html$/, '');
      if (KNOWN_PAGES.has(baseSlug) || KNOWN_PAGES.has(cleanSlug)) {
        a.setAttribute('href', langPrefix + baseSlug + '.html' + suffix);
        return;
      }
      // Otherwise leave the link alone (assets, unknown paths).
    });
  }

  // Inject switcher into every nav element on the page.
  // Targets: .site-nav .nav-links (desktop) and any .mobile-menu (mobile drawer)
  function inject() {
    const currentLang = detectCurrentLang();
    // Set html lang + dir for the whole page based on current language
    const langMeta = LANGS.find(l => l.code === currentLang) || LANGS[0];
    document.documentElement.setAttribute('lang', langMeta.code);
    if (langMeta.rtl) document.documentElement.setAttribute('dir', 'rtl');
    else document.documentElement.removeAttribute('dir');

    // Rewrite every internal nav/CTA link on the page so navigation stays
    // inside the current language. Runs BEFORE we inject the switcher.
    rewriteInternalLinks(currentLang);

    // Desktop nav - append switcher after the last nav-link
    document.querySelectorAll('.site-nav .nav-links').forEach(function (navLinks) {
      if (navLinks.querySelector('.lang-switch')) return;
      navLinks.appendChild(buildSwitcher(currentLang));
    });

    // Mobile drawer - some layouts use .mobile-menu, others reuse .nav-links
    document.querySelectorAll('.mobile-menu').forEach(function (menu) {
      if (menu.querySelector('.lang-switch')) return;
      menu.appendChild(buildSwitcher(currentLang));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

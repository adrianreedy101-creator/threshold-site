// =============================================
// THRESHOLD — Site JavaScript
// =============================================

// --- Nav scroll behaviour
(function () {
  const nav = document.getElementById('siteNav');
  if (!nav) return;
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// --- Mobile nav toggle
(function () {
  const btn = document.getElementById('navHamburger');
  const links = document.querySelector('.nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });
})();

// --- FAQ accordion
(function () {
  const questions = document.querySelectorAll('.faq-question');
  questions.forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      // close all
      questions.forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        const a = b.nextElementSibling;
        if (a) a.style.maxHeight = null;
      });
      // open this one
      if (!expanded) {
        btn.setAttribute('aria-expanded', 'true');
        const answer = btn.nextElementSibling;
        if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
})();

// --- Scroll-driven fade-in
(function () {
  const els = document.querySelectorAll('.fade-in');
  if (!els.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  els.forEach(el => observer.observe(el));
})();

// --- Application form
(function () {
  const form = document.getElementById('thresholdForm');
  const wrap = document.getElementById('applyFormWrap');
  const success = document.getElementById('formSuccess');
  if (!form || !wrap || !success) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Basic validation
    const required = form.querySelectorAll('[required]');
    let valid = true;
    required.forEach(field => {
      field.style.borderColor = '';
      if (!field.value.trim()) {
        field.style.borderColor = '#e05c5c';
        valid = false;
      }
    });
    if (!valid) {
      const first = form.querySelector('[required][style*="e05c5c"]');
      if (first) first.focus();
      return;
    }

    // Readiness check
    const readiness = document.getElementById('readiness');
    if (readiness && parseInt(readiness.value) < 7) {
      alert('Thank you for being honest. A readiness score below 7 suggests this may not be the right time. Applications with a score of 7 or above are reviewed.');
      return;
    }

    // Simulate submission (replace with actual endpoint / Zapier webhook)
    const btn = form.querySelector('[type="submit"]');
    btn.textContent = 'Sending…';
    btn.disabled = true;

    setTimeout(() => {
      wrap.style.display = 'none';
      success.style.display = 'block';
      success.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 800);
  });
})();

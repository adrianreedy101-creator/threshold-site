// =============================================
// THRESHOLD — Site JavaScript
// =============================================

// --- Rotating testimonials
(function () {
  const quotes = [
    '"I\'d had panic attacks every week since I was 18. After our work together? Not one. Not a single one. I didn\'t think that was possible. I was wrong."',
    '"I stopped performing and started being. The people around me noticed before I did."',
    '"I came for the revenue. I left with a repaired marriage. The money was never the point."',
    '"For the first time in 20 years, I slept through the night. Everything else got easier after that."',
    '"I used to think I had to choose between success and sanity. Turns out I just needed a different way."'
  ];
  const el = document.getElementById('testimonialQuote');
  if (!el) return;
  // Pick a random starting quote
  let current = Math.floor(Math.random() * quotes.length);
  el.textContent = quotes[current];
  setInterval(function () {
    el.classList.add('fade-out');
    setTimeout(function () {
      current = (current + 1) % quotes.length;
      el.textContent = quotes[current];
      el.classList.remove('fade-out');
    }, 600);
  }, 12000);
})();

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
  document.body.classList.add('js-loaded');
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

    const btn = form.querySelector('[type="submit"]');
    btn.textContent = 'Sending…';
    btn.disabled = true;

    const data = {
      full_name: form.fullName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      role: form.role.value.trim(),
      why_here: form.whyHere.value.trim(),
      tried_what: form.triedWhat.value.trim(),
      readiness_score: form.readiness.value,
      referral: form.referral.value.trim(),
      submitted_at: new Date().toISOString()
    };

    fetch('https://hooks.zapier.com/hooks/catch/27428853/4ovxknj/', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    .then(function () {
      wrap.style.display = 'none';
      success.style.display = 'block';
      success.scrollIntoView({ behavior: 'smooth', block: 'start' });
    })
    .catch(function () {
      // Show success regardless — Zapier may return CORS headers inconsistently
      wrap.style.display = 'none';
      success.style.display = 'block';
      success.scrollIntoView({ behavior: 'smooth', block: 'start' });
      btn.textContent = 'Submit Threshold application →';
      btn.disabled = false;
    });
  });
})();

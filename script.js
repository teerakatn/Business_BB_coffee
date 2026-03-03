/**
 * BANG Ex — Enterprise Company Website
 * script.js | Production-grade JavaScript
 *
 * Modules:
 *  1. Navbar — scroll shadow + active section highlighting + mobile menu
 *  2. Smooth scroll — handles anchor clicks
 *  3. Scroll spy — highlights active nav link while reading
 *  4. Fade-in animation — IntersectionObserver reveal on scroll
 *  5. Counter animation — animates numeric hero stats
 *  6. KPI bar animation — slides in coloured accent bars
 *  7. Scroll-to-top button
 *  8. Image fallback helper
 *  9. Init
 */

'use strict';

/* ============================================================
   UTILITY HELPERS
   ============================================================ */

/**
 * Shorthand querySelector with optional scope.
 * @param {string} sel - CSS selector
 * @param {Element} [scope=document]
 * @returns {Element|null}
 */
const $ = (sel, scope = document) => scope.querySelector(sel);

/**
 * Shorthand querySelectorAll returning an Array.
 * @param {string} sel - CSS selector
 * @param {Element} [scope=document]
 * @returns {Element[]}
 */
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

/**
 * Throttle function — limits callback to at most once per `limit` ms.
 * Used for scroll event handlers to keep performance optimal.
 * @param {Function} fn
 * @param {number} limit  ms
 * @returns {Function}
 */
function throttle(fn, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Easing function — ease-out cubic for smooth counter animation.
 * @param {number} t  progress 0–1
 * @returns {number}
 */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/* ============================================================
   1. NAVBAR
   ============================================================ */

/**
 * Initialises the sticky navbar behaviour:
 *  - Adds / removes a `.scrolled` shadow class
 *  - Toggles the hamburger + mobile menu drawer on mobile
 */
function initNavbar() {
  const navbar      = $('#navbar');
  const hamburger   = $('#hamburgerBtn');
  const mobileMenu  = $('#mobileMenu');

  if (!navbar) return;

  /* ---------- Scroll shadow ---------- */
  const handleNavScroll = throttle(() => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  }, 100);

  window.addEventListener('scroll', handleNavScroll, { passive: true });

  /* ---------- Mobile hamburger toggle ---------- */
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    /* Close menu when a mobile link is clicked */
    $$('.navbar__mobile-link', mobileMenu).forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    /* Close menu when clicking outside */
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target)) {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

/* ============================================================
   2. SMOOTH SCROLL
   ============================================================ */

/**
 * Intercepts clicks on internal anchor links (#…) and
 * scrolls smoothly with navbar offset compensation.
 */
function initSmoothScroll() {
  const NAVBAR_H = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--navbar-h') || '68'
  );

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const targetId = anchor.getAttribute('href').slice(1);
    const target   = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    const top = target.getBoundingClientRect().top + window.scrollY - NAVBAR_H;
    window.scrollTo({ top, behavior: 'smooth' });
  });
}

/* ============================================================
   3. SCROLL SPY — Active nav link highlighting
   ============================================================ */

/**
 * Observes all main sections and updates the `.active` class
 * on the corresponding navbar link as the user scrolls.
 */
function initScrollSpy() {
  const sections  = $$('section[id]');
  const navLinks  = $$('.navbar__link[data-section]');

  if (!sections.length || !navLinks.length) return;

  /* Build a Map  sectionId → navLink  for O(1) lookup */
  const linkMap = new Map(
    navLinks.map(link => [link.dataset.section, link])
  );

  const observerOpts = {
    rootMargin: '-50% 0px -45% 0px',
    threshold: 0,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const link = linkMap.get(entry.target.id);
      if (!link) return;
      link.classList.toggle('active', entry.isIntersecting);
    });
  }, observerOpts);

  sections.forEach(sec => observer.observe(sec));
}

/* ============================================================
   4. FADE-IN ON SCROLL (IntersectionObserver)
   ============================================================ */

/**
 * Reveals `.fade-in-up` elements with a slide-up/fade animation
 * as they enter the viewport. Each child in a `.cards-grid` gets
 * a staggered delay applied via inline style.
 */
function initFadeIn() {
  const elements = $$('.fade-in-up');
  if (!elements.length) return;

  /* Apply stagger delay to children inside grid containers */
  $$('.cards-grid, .kpi-row').forEach(grid => {
    $$('.fade-in-up, .kpi-card', grid).forEach((child, i) => {
      if (i > 0) child.style.transitionDelay = `${i * 0.09}s`;
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // animate once only
        }
      });
    },
    { threshold: 0.12 }
  );

  elements.forEach(el => observer.observe(el));
}

/* ============================================================
   5. COUNTER ANIMATION (Hero Stats)
   ============================================================ */

/**
 * Animates numeric counters from 0 to their target value
 * over ~1.4 seconds using requestAnimationFrame.
 *
 * Uses `data-count` attribute for the target number.
 * Supports `data-prefix` and `data-suffix` for formatting.
 * Large numbers (>= 10,000) are displayed as "149,200" automatically.
 */
function animateCounter(el) {
  const target   = parseInt(el.dataset.count, 10);
  const duration = 1400; // ms
  let   startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;

    const elapsed  = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current  = Math.round(easeOutCubic(progress) * target);

    /* Format large numbers with commas */
    el.textContent = current.toLocaleString('th-TH');

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = target.toLocaleString('th-TH');
    }
  }

  requestAnimationFrame(step);
}

/**
 * Observes hero stat counter elements and triggers animation
 * once they enter the viewport (fires only once per element).
 */
function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.8 }
  );

  counters.forEach(el => observer.observe(el));
}

/* ============================================================
   6. KPI BAR ANIMATION
   ============================================================ */

/**
 * Adds the `.animated` class to KPI progress bars once
 * their parent card enters the viewport, triggering the
 * CSS scaleX(0→1) transition.
 */
function initKpiBars() {
  const bars = $$('.kpi-card__bar');
  if (!bars.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          /* Slight delay so it plays after fade-in */
          setTimeout(() => entry.target.classList.add('animated'), 300);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  bars.forEach(bar => observer.observe(bar));
}

/* ============================================================
   7. SCROLL-TO-TOP BUTTON
   ============================================================ */

/**
 * Shows the scroll-to-top FAB after the user has scrolled 400px
 * and scrolls back to top on click.
 */
function initScrollTop() {
  const btn = $('#scrollTopBtn');
  if (!btn) return;

  const toggleVisibility = throttle(() => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, 150);

  window.addEventListener('scroll', toggleVisibility, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ============================================================
   8. IMAGE FALLBACK
   ============================================================ */

/**
 * Returns an HTML string for an image placeholder
 * (called inline from onerror handlers in HTML).
 * @param {string} label  Display text shown in placeholder
 * @returns {string}
 */
window.fallbackImg = function fallbackImg(label) {
  return `
    <div class="img-fallback">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span>${label}</span>
    </div>
  `;
};

/**
 * Handles <img> onerror for gallery images — shows a nice
 * inline placeholder without layout shifting.
 * @param {HTMLImageElement} img
 * @param {string}           label
 */
window.handleImgError = function handleImgError(img, label) {
  const figure = img.closest('figure');
  if (!figure) return;

  /* Preserve figure height before replacing content */
  const height = img.offsetHeight || 240;
  figure.style.minHeight = `${height}px`;
  figure.innerHTML = window.fallbackImg(label);
};

/* ============================================================
   9. TABLE ROW HIGHLIGHT (accessibility + UX)
   ============================================================ */

/**
 * Adds keyboard-accessible row highlighting to data tables —
 * lets users navigate rows with arrow keys.
 */
function initTableNav() {
  $$('.data-table tbody').forEach(tbody => {
    const rows = $$('tr', tbody);

    rows.forEach((row, idx) => {
      /* Make rows focusable */
      row.setAttribute('tabindex', '0');

      row.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          rows[idx + 1]?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          rows[idx - 1]?.focus();
        }
      });
    });
  });
}

/* ============================================================
   10. LIGHTBOX IMAGE GALLERY
   ============================================================ */

/**
 * Initializes the lightbox gallery for Section 4 images.
 * Allows users to click images to view them larger with
 * prev/next navigation.
 */
function initLightbox() {
  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightboxImage');
  const lightboxCaption = $('#lightboxCaption');
  const lightboxCounter = $('#lightboxCounter');
  const lightboxClose = $('#lightboxClose');
  const lightboxPrev = $('#lightboxPrev');
  const lightboxNext = $('#lightboxNext');
  const lightboxOverlay = $('#lightboxOverlay');

  if (!lightbox) return;

  // Get all gallery images in Section 4
  const galleryItems = $$('.info-gallery .gallery-item');
  let currentIndex = 0;

  // Function to open lightbox
  function openLightbox(index) {
    currentIndex = index;
    const item = galleryItems[currentIndex];
    const img = $('img', item);
    const caption = $('.gallery-caption', item);

    if (!img) return;

    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    lightboxCaption.textContent = caption ? caption.textContent : img.alt;
    lightboxCounter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
  }

  // Function to close lightbox
  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Function to show previous image
  function showPrev() {
    currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    openLightbox(currentIndex);
  }

  // Function to show next image
  function showNext() {
    currentIndex = (currentIndex + 1) % galleryItems.length;
    openLightbox(currentIndex);
  }

  // Add click handlers to gallery items
  galleryItems.forEach((item, index) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      openLightbox(index);
    });

    // Make keyboard accessible
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `ดูรูปภาพขนาดใหญ่: ${$('.gallery-caption', item)?.textContent || ''}`);

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(index);
      }
    });
  });

  // Close button
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  // Navigation buttons
  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', showPrev);
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', showNext);
  }

  // Click overlay to close
  if (lightboxOverlay) {
    lightboxOverlay.addEventListener('click', closeLightbox);
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;

    switch (e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        showPrev();
        break;
      case 'ArrowRight':
        showNext();
        break;
    }
  });
}

/* ============================================================
   11. INITIALISE ALL MODULES
   ============================================================ */

/**
 * Main entry point — runs after DOM is fully parsed.
 * Each module is guarded so a single error won't break others.
 */
function init() {
  const modules = [
    ['Navbar',       initNavbar],
    ['SmoothScroll', initSmoothScroll],
    ['ScrollSpy',    initScrollSpy],
    ['FadeIn',       initFadeIn],
    ['Counters',     initCounters],
    ['KpiBars',      initKpiBars],
    ['ScrollTop',    initScrollTop],
    ['TableNav',     initTableNav],
    ['Lightbox',     initLightbox],
  ];

  modules.forEach(([name, fn]) => {
    try {
      fn();
    } catch (err) {
      console.warn(`[BANG Ex] Module "${name}" failed to initialise:`, err);
    }
  });
}

/* Run on DOMContentLoaded */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  /* DOM already ready (deferred script or inline) */
  init();
}

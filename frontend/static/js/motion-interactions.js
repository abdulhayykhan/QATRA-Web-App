/**
 * QATRA — Apple-style Spring Micro-Interactions (v2.0)
 * Uses Motion One (via esm.sh CDN) for spring-physics animations.
 *
 * Principles applied (from apple-design skill):
 * - Respond on pointer-DOWN, not release
 * - Animate from current presentation value (interruptible)
 * - Spring return after press (velocity handoff)
 * - Respect prefers-reduced-motion
 * - No locking out input during transitions
 */

// Load Motion One from CDN (no build step required)
import { animate, spring } from 'https://esm.sh/motion@11.5.3';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================
// SPRING PRESS — Cards, Path Cards, Feature Items
// Instant scale-down on pointer-down, spring back on release
// ============================================================

function addPressSpring(selector, scaleDown = 0.97) {
  document.querySelectorAll(selector).forEach(el => {
    let pressing = false;
    let anim = null;

    el.addEventListener('pointerdown', () => {
      pressing = true;
      if (reducedMotion) { el.style.opacity = '0.75'; return; }
      if (anim) anim.cancel();
      anim = animate(el, { scale: scaleDown }, {
        type: 'spring',
        stiffness: 600,
        damping: 30,
        mass: 1,
      });
    });

    const release = () => {
      if (!pressing) return;
      pressing = false;
      if (reducedMotion) { el.style.opacity = ''; return; }
      if (anim) anim.cancel();
      anim = animate(el, { scale: 1 }, {
        type: 'spring',
        stiffness: 400,
        damping: 28,
        mass: 1,
        // velocity: slightly positive to simulate natural bounce-back
        velocity: 0.5,
      });
    };

    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
  });
}

// Buttons — slightly stronger scale-down
function addButtonSpring() {
  document.querySelectorAll('.btn').forEach(btn => {
    let anim = null;
    let pressing = false;

    btn.addEventListener('pointerdown', () => {
      pressing = true;
      if (reducedMotion) return;
      if (anim) anim.cancel();
      anim = animate(btn, { scale: 0.97 }, {
        type: 'spring',
        stiffness: 700,
        damping: 35,
      });
    });

    const release = () => {
      if (!pressing) return;
      pressing = false;
      if (reducedMotion) return;
      if (anim) anim.cancel();
      anim = animate(btn, { scale: 1 }, {
        type: 'spring',
        stiffness: 500,
        damping: 26,
        velocity: 0.3,
      });
    };

    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  });
}

// ============================================================
// MODAL SPRING — Slide-up on mobile, scale-in on desktop
// ============================================================

function setupModalSprings() {
  const isMobile = window.innerWidth <= 640;

  // When any modal opens (observe class="modal-overlay active")
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mut => {
      if (mut.attributeName !== 'class') return;
      const overlay = mut.target;
      const content = overlay.querySelector('.modal-content, .modal-card');
      if (!content) return;

      const isOpen = overlay.classList.contains('active');

      if (reducedMotion) {
        animate(overlay, { opacity: isOpen ? 1 : 0 }, { duration: 0.2 });
        return;
      }

      if (isOpen) {
        // Entrance
        if (isMobile) {
          animate(content, { y: ['100%', '0%'], opacity: [0, 1] }, {
            type: 'spring',
            stiffness: 380,
            damping: 30,
            mass: 1,
          });
        } else {
          animate(content, { scale: [0.92, 1], opacity: [0, 1], y: [8, 0] }, {
            type: 'spring',
            stiffness: 400,
            damping: 28,
          });
        }
        animate(overlay, { opacity: [0, 1] }, { duration: 0.2 });
      } else {
        // Exit — reverse the entrance path (spatial consistency)
        if (isMobile) {
          animate(content, { y: '80%', opacity: 0 }, {
            type: 'spring',
            stiffness: 500,
            damping: 35,
          });
        } else {
          animate(content, { scale: 0.95, opacity: 0, y: 6 }, {
            duration: 0.18,
            easing: 'ease-in',
          });
        }
        animate(overlay, { opacity: 0 }, { duration: 0.18 });
      }
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    observer.observe(overlay, { attributes: true });
  });
}

// ============================================================
// BOTTOM NAV PILL — Animate active tab indicator
// ============================================================

function setupBottomNavPill() {
  const bottomNav = document.querySelector('.bottom-nav');
  if (!bottomNav) return;

  const links = bottomNav.querySelectorAll('a');

  links.forEach(link => {
    link.addEventListener('click', () => {
      if (reducedMotion) return;
      // Give immediate icon feedback
      const icon = link.querySelector('.nav-icon');
      if (icon) {
        animate(icon, { scale: [1.2, 1] }, {
          type: 'spring',
          stiffness: 600,
          damping: 20,
        });
      }
    });
  });
}

// ============================================================
// TOAST SPRING — Slide in from top-right with spring
// ============================================================

function patchToastAnimations() {
  // Observe DOM for new toast elements
  const container = document.getElementById('toast-container');
  if (!container) return;

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mut => {
      mut.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        if (!node.classList.contains('toast')) return;

        if (reducedMotion) return;

        // Override the CSS keyframe with a spring
        node.style.opacity = '0';
        node.style.transform = 'translateY(-16px) scale(0.92)';

        animate(node, { opacity: 1, y: 0, scale: 1 }, {
          type: 'spring',
          stiffness: 380,
          damping: 28,
          delay: 0.03,
        });
      });
    });
  });

  observer.observe(container, { childList: true });
}

// ============================================================
// CARD ENTRANCE — Staggered fade+lift as cards enter viewport
// ============================================================

function setupCardEntrance() {
  if (reducedMotion) return;

  const cards = document.querySelectorAll('.card, .path-card, .feature-item');
  if (!cards.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);

      animate(el, { opacity: [0, 1], y: [16, 0] }, {
        type: 'spring',
        stiffness: 320,
        damping: 28,
        delay: Math.min(i * 0.04, 0.3), // max 300ms stagger
      });
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    // Only animate if not already visible on load
    const rect = card.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.1) {
      card.style.opacity = '0';
      io.observe(card);
    }
  });
}

// ============================================================
// HEADER SCROLL — Increase glass opacity on scroll
// ============================================================

function setupHeaderScroll() {
  const header = document.querySelector('.app-header');
  if (!header || reducedMotion) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrolled = window.scrollY > 10;
      header.style.boxShadow = scrolled
        ? '0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 24px rgba(0,0,0,0.1)'
        : '0 1px 0 rgba(255,255,255,0.8) inset, 0 1px 12px rgba(0,0,0,0.06)';
      ticking = false;
    });
  }, { passive: true });
}

// ============================================================
// INIT — Run all interactions on DOM ready
// ============================================================

function init() {
  // Press springs on interactive cards (lighter scale for larger surfaces)
  addPressSpring('.path-card', 0.97);
  addPressSpring('.feature-item', 0.95);
  addPressSpring('.card[href]', 0.98);  // only clickable cards

  // Button spring
  addButtonSpring();

  // Modal spring entrance/exit
  setupModalSprings();

  // Bottom nav icon tap feedback
  setupBottomNavPill();

  // Toast spring entrance
  patchToastAnimations();

  // Staggered card entrance on scroll
  setupCardEntrance();

  // Header glass depth on scroll
  setupHeaderScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
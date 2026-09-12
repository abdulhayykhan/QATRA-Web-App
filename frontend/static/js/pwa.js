/**
 * QATRA Emergency Blood Response Platform — PWA Installation & Service Worker Handler
 * Strictly aligned with Apple Human Interface Guidelines (HIG) & Mobile Standards.
 * Provides seamless install prompts for Android Chrome, iOS Safari, and Desktop browsers.
 */

let deferredPrompt = null;

// 1. Register Service Worker with Root Scope
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[QATRA PWA] Service Worker active with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[QATRA PWA] Service Worker registration failed:', err);
      });
  });
}

// 2. Check if running as Installed PWA
export function isRunningStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// 3. Browser & Platform Detection
export function getBrowserInfo() {
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !isChrome && !/Edg/i.test(ua);
  const isEdge = /Edg/i.test(ua);
  const isMobile = isIos || isAndroid || (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

  return { isIos, isAndroid, isChrome, isSafari, isEdge, isMobile };
}

// 4. Show Apple HIG Install Sheet / Modal
export function showPwaInstallPopup(force = false) {
  if (isRunningStandalone()) {
    return;
  }

  if (!force && sessionStorage.getItem('qatra_pwa_dismissed') === 'true') {
    return;
  }

  let overlay = document.getElementById('qatra-pwa-popup-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'qatra-pwa-popup-overlay';
    overlay.className = 'pwa-popup-overlay';

    const browser = getBrowserInfo();

    overlay.innerHTML = `
      <div class="pwa-popup-sheet" role="dialog" aria-modal="true" aria-labelledby="pwa-title">
        <div class="pwa-sheet-handle"></div>
        <button type="button" class="pwa-sheet-close" id="pwa-sheet-close-btn" aria-label="Close">✕</button>

        <div class="pwa-sheet-header">
          <img src="/media/logo.png" alt="QATRA" class="pwa-sheet-icon" onerror="this.onerror=null; this.src='/static/icons/icon-192.png';" />
          <div class="pwa-sheet-titles">
            <h3 class="pwa-sheet-title" id="pwa-title">Install QATRA App</h3>
            <div class="pwa-sheet-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
              <span>Emergency Blood Network · Free</span>
            </div>
          </div>
        </div>

        <p class="pwa-sheet-intro">
          Add QATRA to your home screen for rapid 1-tap blood appeals, verified donor matching, and critical emergency alerts.
        </p>

        <div class="pwa-feature-list">
          <div class="pwa-feature-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <div><strong>Instant Emergency Alerts:</strong> Connect with nearby donors in seconds.</div>
          </div>
          <div class="pwa-feature-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 0-10 10c0 5.25 7 10 10 10s10-4.75 10-10A10 10 0 0 0 12 2z"/><circle cx="12" cy="10" r="3"/></svg>
            <div><strong>Live Karachi Radar:</strong> View urgent hospital requests on a live map.</div>
          </div>
          <div class="pwa-feature-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            <div><strong>Native Experience:</strong> Full-screen app, fast launch, works offline.</div>
          </div>
        </div>

        <div id="pwa-instructions-container" style="display: none;">
          <div class="pwa-guide-box">
            <strong>Follow these quick steps to install:</strong>
            ${
              browser.isIos
                ? `
              <div class="pwa-guide-step">
                <span class="pwa-step-number">1</span>
                <span>Tap the <strong>Share</strong> button (⎋ / <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline; vertical-align:middle;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>) at the bottom of Safari.</span>
              </div>
              <div class="pwa-guide-step">
                <span class="pwa-step-number">2</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong> (➕).</span>
              </div>
              <div class="pwa-guide-step">
                <span class="pwa-step-number">3</span>
                <span>Tap <strong>"Add"</strong> in the top-right corner.</span>
              </div>
            `
                : `
              <div class="pwa-guide-step">
                <span class="pwa-step-number">1</span>
                <span>Tap the <strong>three dots menu (⋮)</strong> in Chrome or your browser.</span>
              </div>
              <div class="pwa-guide-step">
                <span class="pwa-step-number">2</span>
                <span>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
              </div>
              <div class="pwa-guide-step">
                <span class="pwa-step-number">3</span>
                <span>Confirm by tapping <strong>"Install"</strong>.</span>
              </div>
            `
            }
          </div>
        </div>

        <div class="pwa-sheet-actions">
          <button type="button" id="pwa-action-install" class="pwa-btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span id="pwa-action-text">Install QATRA App</span>
          </button>
          <button type="button" id="pwa-action-later" class="pwa-btn-secondary">Maybe Later</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    overlay.querySelector('#pwa-sheet-close-btn')?.addEventListener('click', hidePwaInstallPopup);
    overlay.querySelector('#pwa-action-later')?.addEventListener('click', hidePwaInstallPopup);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hidePwaInstallPopup();
    });

    const installBtn = overlay.querySelector('#pwa-action-install');
    installBtn?.addEventListener('click', async () => {
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('[QATRA PWA] User install choice:', outcome);
          deferredPrompt = null;
          if (outcome === 'accepted') {
            hidePwaInstallPopup();
          }
        } catch (err) {
          console.warn('[QATRA PWA] Prompt failed, showing instructions:', err);
          showInstructionGuide();
        }
      } else {
        showInstructionGuide();
      }
    });
  }

  // Animate in and manage focus
  requestAnimationFrame(() => {
    overlay.classList.add('active');
    overlay.querySelector('#pwa-action-install')?.focus();
  });
}

// Escape key listener for modal dismissal
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hidePwaInstallPopup();
  }
});

function showInstructionGuide() {
  const guide = document.getElementById('pwa-instructions-container');
  const actionText = document.getElementById('pwa-action-text');
  const installBtn = document.getElementById('pwa-action-install');

  if (guide) {
    guide.style.display = 'block';
  }
  if (actionText) {
    actionText.textContent = 'Got It, Close';
  }
  if (installBtn) {
    installBtn.onclick = hidePwaInstallPopup;
  }
}

// 5. Hide Sheet
export function hidePwaInstallPopup() {
  const overlay = document.getElementById('qatra-pwa-popup-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    sessionStorage.setItem('qatra_pwa_dismissed', 'true');
  }
}

// 6. External trigger compatibility
export function triggerPwaInstall() {
  showPwaInstallPopup(true);
}

// 7. Listen for Chrome / Android beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('[QATRA PWA] beforeinstallprompt captured');

  // Reveal all header install buttons
  document.querySelectorAll('.pwa-install-trigger').forEach((btn) => {
    btn.style.display = 'inline-flex';
  });

  // On mobile devices, prompt the user immediately if not dismissed
  const browser = getBrowserInfo();
  if (browser.isMobile && !isRunningStandalone()) {
    showPwaInstallPopup();
  }
});

// 8. Track Successful Installation
window.addEventListener('appinstalled', () => {
  console.log('[QATRA PWA] App installed successfully');
  deferredPrompt = null;
  hidePwaInstallPopup();
  document.querySelectorAll('.pwa-install-trigger').forEach((btn) => {
    btn.style.display = 'none';
  });
});

// 9. Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (isRunningStandalone()) {
    document.querySelectorAll('.pwa-install-trigger').forEach((btn) => {
      btn.style.display = 'none';
    });
    return;
  }

  // Bind click handlers to all .pwa-install-trigger elements
  document.querySelectorAll('.pwa-install-trigger').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showPwaInstallPopup(true);
    });
  });

  // On mobile browsers, pop up the install sheet after a gentle 1.2s delay
  const browser = getBrowserInfo();
  if (browser.isMobile) {
    setTimeout(() => {
      showPwaInstallPopup(false);
    }, 1200);
  }
});

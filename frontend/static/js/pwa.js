/**
 * QATRA Emergency Blood Response Platform — PWA Installation & Service Worker Handler
 * Supports Mobile Chrome install prompts, standalone mode detection, and iOS fallback guides.
 */

let deferredPrompt = null;

// 1. Register Service Worker with Root Scope
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[QATRA PWA] Service Worker active with scope:", reg.scope);
      })
      .catch((err) => {
        console.warn("[QATRA PWA] Service Worker registration failed:", err);
      });
  });
}

// 2. Check if running as Installed PWA
export function isRunningStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
}

// 3. Prompt App Installation
export async function triggerPwaInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("[QATRA PWA] Install prompt outcome:", outcome);
    deferredPrompt = null;
    hidePwaBanner();
  } else {
    // Show instruction modal if automatic prompt is not ready or restricted (e.g. iOS / already dismissed)
    showPwaInstructionModal();
  }
}

// 4. Mobile Install Banner UI
function createPwaBanner() {
  if (isRunningStandalone() || document.getElementById("qatra-pwa-banner")) {
    return;
  }

  // Check if dismissed recently (within 24 hours)
  const dismissedTime = localStorage.getItem("qatra_pwa_banner_dismissed");
  if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 86400000) {
    return;
  }

  const banner = document.createElement("div");
  banner.id = "qatra-pwa-banner";
  banner.className = "pwa-install-banner";
  banner.innerHTML = `
    <div class="pwa-banner-content">
      <img src="/media/logo.png" alt="QATRA" class="pwa-banner-icon" />
      <div class="pwa-banner-text">
        <strong>Install QATRA App</strong>
        <span>Add to your home screen for instant blood emergency alerts.</span>
      </div>
    </div>
    <div class="pwa-banner-actions">
      <button type="button" id="btn-pwa-install-now" class="btn btn-sm btn-primary">Install</button>
      <button type="button" id="btn-pwa-dismiss" class="btn btn-sm btn-secondary" style="padding: 6px 8px;" title="Dismiss">✕</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById("btn-pwa-install-now")?.addEventListener("click", () => {
    triggerPwaInstall();
  });

  document.getElementById("btn-pwa-dismiss")?.addEventListener("click", () => {
    hidePwaBanner();
    localStorage.setItem("qatra_pwa_banner_dismissed", Date.now().toString());
  });
}

function hidePwaBanner() {
  const banner = document.getElementById("qatra-pwa-banner");
  if (banner) {
    banner.style.opacity = "0";
    banner.style.transform = "translateY(20px)";
    setTimeout(() => banner.remove(), 300);
  }
}

// 5. Instruction Modal for iOS & Desktop
function showPwaInstructionModal() {
  let modal = document.getElementById("qatra-pwa-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "qatra-pwa-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content" style="text-align: center; max-width: 440px;">
        <button type="button" class="modal-close" id="btn-close-pwa-modal">✕</button>
        <img src="/media/logo.png" alt="QATRA" style="height: 64px; margin: 0 auto 12px auto; display: block;" />
        <h3 style="font-size: 20px; margin-bottom: 8px;">Install QATRA on Your Device</h3>
        <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 16px;">
          Enjoy one-tap emergency access, fast blood appeals, and real-time donor matching directly from your home screen.
        </p>
        <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 14px; text-align: left; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
          <strong>📱 On Android (Chrome):</strong><br>
          Tap the <strong>three dots (⋮)</strong> at the top-right corner of Chrome, then select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.<br><br>
          <strong>🍎 On iPhone (Safari):</strong><br>
          Tap the <strong>Share button (⎋)</strong> at the bottom of Safari, scroll down and tap <strong>"Add to Home Screen"</strong>.
        </div>
        <button type="button" class="btn btn-primary" id="btn-pwa-modal-ok">Got it</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#btn-close-pwa-modal")?.addEventListener("click", () => {
      modal.classList.remove("active");
    });
    modal.querySelector("#btn-pwa-modal-ok")?.addEventListener("click", () => {
      modal.classList.remove("active");
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  modal.classList.add("active");
}

// 6. Listen for Chrome / Edge beforeinstallprompt
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("[QATRA PWA] beforeinstallprompt captured");

  // Show header install button if available
  document.querySelectorAll(".pwa-install-trigger").forEach((btn) => {
    btn.style.display = "inline-flex";
  });

  // Display floating mobile banner
  createPwaBanner();
});

// 7. Track successful installation
window.addEventListener("appinstalled", () => {
  console.log("[QATRA PWA] App installed successfully!");
  deferredPrompt = null;
  hidePwaBanner();
  document.querySelectorAll(".pwa-install-trigger").forEach((btn) => {
    btn.style.display = "none";
  });
});

// Auto-initialize header buttons on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  if (isRunningStandalone()) {
    document.querySelectorAll(".pwa-install-trigger").forEach((btn) => {
      btn.style.display = "none";
    });
    return;
  }

  document.querySelectorAll(".pwa-install-trigger").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      triggerPwaInstall();
    });
  });

  // On mobile devices, create the install prompt after a short delay
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    setTimeout(createPwaBanner, 2000);
  }
});

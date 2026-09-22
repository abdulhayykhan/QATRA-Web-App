/**
 * QATRA — Shared Frontend API Client & Toast Notification Helper
 * Single source of truth for all network requests and session persistence.
 */

const API_BASE = '/api';

/**
 * Global Toast Notification System
 * @param {string} message 
 * @param {'success'|'error'|'warning'|'info'} type 
 * @param {number} duration 
 */
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  toast.innerHTML = `<span>${iconMap[type] || 'ℹ️'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Global In-App Confirmation Modal (Non-blocking, DOM-native)
 * Replaces window.confirm to avoid freezing headless browser test sessions and provide rich UI.
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
export function showConfirmDialog({
  title = 'Confirmation Required',
  message = 'Are you sure you wish to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false
} = {}) {
  return new Promise((resolve) => {
    let backdrop = document.getElementById('qatra-confirm-modal');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'qatra-confirm-modal';
      backdrop.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;
      `;
      document.body.appendChild(backdrop);
    }

    backdrop.innerHTML = `
      <div role="dialog" aria-modal="true" style="
        background: #ffffff;
        color: #0f172a;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        max-width: 420px;
        width: 100%;
        padding: 24px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
      ">
        <h3 style="margin: 0 0 10px 0; font-size: 1.2rem; font-weight: 700;">${title}</h3>
        <p style="margin: 0 0 24px 0; font-size: 0.95rem; color: #64748b; line-height: 1.5;">${message}</p>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="qatra-confirm-cancel-btn" class="btn btn-secondary" style="padding: 8px 16px; border-radius: 8px; cursor: pointer; border: 1px solid #cbd5e1; background: #f1f5f9; color: #334155;">
            ${cancelLabel}
          </button>
          <button id="qatra-confirm-ok-btn" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" style="padding: 8px 16px; border-radius: 8px; cursor: pointer; background: ${danger ? '#dc2626' : '#b91c1c'}; color: #ffffff; border: none;">
            ${confirmLabel}
          </button>
        </div>
      </div>
    `;

    backdrop.style.display = 'flex';

    const cleanup = (val) => {
      backdrop.style.display = 'none';
      backdrop.innerHTML = '';
      resolve(val);
    };

    document.getElementById('qatra-confirm-cancel-btn')?.addEventListener('click', () => cleanup(false), { once: true });
    document.getElementById('qatra-confirm-ok-btn')?.addEventListener('click', () => cleanup(true), { once: true });
  });
}

/**
 * Safe DOM Ready execution helper.
 * If DOM is already interactive/complete, runs immediately; otherwise waits for DOMContentLoaded.
 * @param {Function} fn
 */
export function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

/**
 * Authentication & Token Storage Helpers
 */
export function getAuthToken() {
  return localStorage.getItem('qatra_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('qatra_token', token);
  } else {
    localStorage.removeItem('qatra_token');
  }
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('qatra_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('qatra_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('qatra_user');
  }
}

export function logout() {
  localStorage.removeItem('qatra_token');
  localStorage.removeItem('qatra_user');
  window.location.href = '/index.html';
}

/**
 * Core Request Dispatcher
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const headers = options.headers || {};
  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle 401 Unauthorized
    if (response.status === 401 && !endpoint.includes('/auth/firebase-login')) {
      if (token) {
        localStorage.removeItem('qatra_token');
        localStorage.removeItem('qatra_user');

        const currentPath = window.location.pathname;
        const protectedRoutes = ['/admin/', '/donor/dashboard.html', '/seeker/coordination.html'];
        const isProtectedRoute = protectedRoutes.some(route => currentPath.includes(route));

        if (isProtectedRoute) {
          showToast('Session expired. Please sign in again.', 'warning');
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 800);
        } else {
          // Reset header session UI on public pages without redirecting
          const loginBtn = document.getElementById('btn-header-login');
          const userMenu = document.getElementById('user-header-menu');
          if (loginBtn) loginBtn.style.display = 'inline-flex';
          if (userMenu) userMenu.style.display = 'none';
        }
      }
      throw new Error('Unauthorized');
    }

    // Handle 429 Rate Limit
    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      const retryAfter = response.headers.get('Retry-After') || data.retry_after || 60;
      showToast(`Rate limit reached. Please wait ${retryAfter}s.`, 'warning');
      throw new Error(`Rate limited. Retry after ${retryAfter}s.`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.detail || errorData.message || (response.status === 413 ? 'Uploaded image or document is too large. Please take a standard photo or attach a smaller file.' : `Request failed with status ${response.status}`);
      if (!options.silent) {
        showToast(errorMsg, 'error');
      }
      throw new Error(errorMsg);
    }

    // 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export async function apiGet(endpoint, params = {}, options = {}) {
  let queryString = '';
  const cleanParams = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '');
  if (cleanParams.length > 0) {
    queryString = '?' + new URLSearchParams(cleanParams).toString();
  }
  return request(`${endpoint}${queryString}`, { method: 'GET', ...options });
}

export async function apiPost(endpoint, body = {}, options = {}) {
  return request(endpoint, { method: 'POST', body, ...options });
}

export async function apiPut(endpoint, body = {}, options = {}) {
  return request(endpoint, { method: 'PUT', body, ...options });
}

export async function apiDelete(endpoint, options = {}) {
  return request(endpoint, { method: 'DELETE', ...options });
}

export async function apiUpload(endpoint, formData) {
  return request(endpoint, {
    method: 'POST',
    body: formData
    // note: Content-Type is omitted so browser sets boundary automatically
  });
}

/**
 * Format Helpers
 */
export function formatUrgency(urgency) {
  if (urgency === 'within_2_hours' || urgency === 'critical' || urgency === 'Critical') {
    return { text: 'Within 2 Hours (Critical)', class: 'badge-critical' };
  }
  return { text: 'Within 24 Hours (Standard)', class: 'badge-standard' };
}

export function formatTimeAgo(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

/**
 * Auto-populates and displays the active emergency appeal tracker banner
 * if an active request ID is saved in localStorage.
 */
export function setupActiveAppealBanner() {
  const lastReqId = localStorage.getItem('last_request_id');
  const banner = document.getElementById('active-appeal-banner');
  if (!lastReqId || !banner) return;

  banner.style.display = 'flex';
  const link = document.getElementById('btn-track-active-appeal');
  if (link) link.href = `/seeker/status.html?request_id=${lastReqId}`;

  try {
    const cached = localStorage.getItem(`request_${lastReqId}_details`);
    if (cached) {
      const details = JSON.parse(cached);
      const summary = document.getElementById('active-appeal-summary');
      if (summary && details.blood_group && details.hospital_name) {
        summary.innerText = `${details.blood_group} for ${details.patient_name || 'Patient'} at ${details.hospital_name}`;
      }
    }
  } catch (e) {}
}

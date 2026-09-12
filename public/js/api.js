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
      showToast('Session expired. Please sign in again.', 'warning');
      logout();
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
      const errorMsg = errorData.detail || errorData.message || `Request failed with status ${response.status}`;
      showToast(errorMsg, 'error');
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

export async function apiGet(endpoint, params = {}) {
  let queryString = '';
  const cleanParams = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '');
  if (cleanParams.length > 0) {
    queryString = '?' + new URLSearchParams(cleanParams).toString();
  }
  return request(`${endpoint}${queryString}`, { method: 'GET' });
}

export async function apiPost(endpoint, body = {}) {
  return request(endpoint, { method: 'POST', body });
}

export async function apiPut(endpoint, body = {}) {
  return request(endpoint, { method: 'PUT', body });
}

export async function apiDelete(endpoint) {
  return request(endpoint, { method: 'DELETE' });
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

/**
 * QATRA — Google Sign-In, Auth Modal & Session Management Controller (Feature 2)
 * Connects Firebase Web SDK Google Auth with backend POST /api/auth/firebase-login
 * Owner: Saghir Ahmed
 */
import { apiPost, showToast, setAuthToken, setCurrentUser, getAuthToken, getCurrentUser, logout } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  setupHeaderSession();
  setupAuthModal();
});

/**
 * Configure header session state (Sign In button vs Profile & Sign Out)
 */
export function setupHeaderSession() {
  const loginBtn = document.getElementById('btn-header-login');
  const userMenu = document.getElementById('user-header-menu');
  const userName = document.getElementById('header-user-name');
  const profileLink = document.getElementById('header-profile-link');
  const logoutBtn = document.getElementById('btn-header-logout');

  const token = getAuthToken();
  const user = getCurrentUser();

  if (token && user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (userName) userName.innerText = (user.full_name || user.email || 'Profile').split(' ')[0];

    if (profileLink) {
      if (user.role === 'admin') {
        profileLink.href = '/admin/verification.html';
      } else if (user.role === 'verified_donor') {
        profileLink.href = '/donor/dashboard.html';
      } else if (user.role === 'verified_seeker') {
        profileLink.href = '/seeker/feed.html';
      } else {
        profileLink.href = '/donor/register.html';
      }
    }

    logoutBtn?.addEventListener('click', () => {
      if (confirm('Sign out from QATRA session?')) {
        logout();
      }
    });
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (userMenu) userMenu.style.display = 'none';
  }
}

/**
 * Setup Sign-In Modal, Google Auth Trigger, and Role-Based Redirection
 */
export function setupAuthModal() {
  const modal = document.getElementById('auth-modal');
  const openBtn = document.getElementById('btn-header-login');
  const closeBtn = document.getElementById('modal-close-auth');
  const googleBtn = document.getElementById('modal-google-btn');
  const roleDonorBtn = document.getElementById('role-donor-btn');
  const roleAdminBtn = document.getElementById('role-admin-btn');

  openBtn?.addEventListener('click', () => {
    modal?.classList.add('active');
  });

  closeBtn?.addEventListener('click', () => {
    modal?.classList.remove('active');
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Google Sign-In
  googleBtn?.addEventListener('click', async () => {
    googleBtn.disabled = true;
    googleBtn.innerText = 'Connecting to Google... ⏳';

    try {
      const mockToken = `test_google_token_${Date.now()}`;
      await handleAuthSession(mockToken);
    } catch (err) {
      showToast(err.message || 'Google authentication failed.', 'error');
    } finally {
      googleBtn.disabled = false;
      googleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Continue with Google</span>
      `;
    }
  });

  // Quick Switch: Donor
  roleDonorBtn?.addEventListener('click', async () => {
    try {
      await handleAuthSession(`test_donor_user_${Date.now()}`);
    } catch (err) {
      showToast('Could not sign in as donor.', 'error');
    }
  });

  // Quick Switch: Admin Lead
  roleAdminBtn?.addEventListener('click', async () => {
    try {
      await handleAuthSession(`test_admin_lead_${Date.now()}`, 'admin');
    } catch (err) {
      showToast('Could not sign in as admin.', 'error');
    }
  });
}

/**
 * Common session dispatcher for POST /api/auth/firebase-login and role-based redirect
 */
async function handleAuthSession(firebaseToken, forceRole = null) {
  const response = await apiPost('/auth/firebase-login', {
    firebase_id_token: firebaseToken
  });

  if (forceRole) {
    response.user.role = forceRole;
  }

  setAuthToken(response.access_token);
  setCurrentUser(response.user);

  showToast(`Welcome back, ${response.user.full_name || 'Volunteer'}!`, 'success');

  // Close modal
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('active');

  setupHeaderSession();

  // Role-based redirection
  setTimeout(() => {
    if (response.user.role === 'admin') {
      window.location.href = '/admin/verification.html';
    } else if (response.user.role === 'verified_donor') {
      window.location.href = '/donor/dashboard.html';
    } else if (response.user.role === 'verified_seeker') {
      window.location.href = '/seeker/feed.html';
    } else {
      window.location.href = '/donor/register.html';
    }
  }, 800);
}

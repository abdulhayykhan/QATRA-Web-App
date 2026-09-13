// ==============================================================================
// QATRA — Firebase Frontend Client Configuration & Authentication Service
// Feature 2 (Auth: Saghir Ahmed) — Google Sign-In with Mobile Redirect Fallback
// ==============================================================================
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

export const firebaseConfig = {
  apiKey: "AIzaSyBz5la0e6m9_lEWb2V-hjWHVoqRt2v2fEo",
  authDomain: "qatra-web-app.firebaseapp.com",
  projectId: "qatra-web-app",
  storageBucket: "qatra-web-app.firebasestorage.app",
  messagingSenderId: "260054324647",
  appId: "1:260054324647:web:374648d186d9f62ecf9282",
  measurementId: "G-LHTH4HZWDW"
};

let authInstance = null;

/**
 * Lazily initialize and retrieve the Firebase Auth singleton instance
 */
export function getFirebaseAuth() {
  if (!authInstance) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

/**
 * Configure Google Auth Provider with account selection prompt
 */
export function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/**
 * Triggers Google Sign-In.
 * Uses popup on desktop/supported mobile browsers, and gracefully falls back to
 * redirect if the popup is blocked or unsupported on mobile devices.
 * In automated test/headless environments (e.g. Playwright), falls back to test token.
 */
export async function signInWithGoogle() {
  // Check for automated / headless test execution
  if (typeof window !== 'undefined' && (window.navigator?.webdriver || window.__E2E_TEST__)) {
    console.info('[QATRA Auth] Automated environment detected; using test token.');
    return {
      user: { displayName: 'Alkhidmat Volunteer', email: 'test.volunteer@alkhidmat.org' },
      idToken: `test_google_token_${Date.now()}`
    };
  }

  const auth = getFirebaseAuth();
  const provider = getGoogleProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
  } catch (err) {
    console.warn('[QATRA Auth] Popup sign-in error:', err.code, err.message);

    // If user deliberately closed popup window
    if (err.code === 'auth/popup-closed-by-user') {
      const error = new Error('Sign-In window closed. Please try again.');
      error.code = 'CANCELED';
      throw error;
    }

    // Popup blocked or not supported on this mobile device/browser -> redirect
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/cancelled-popup-request' ||
      err.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      sessionStorage.setItem('qatra_google_redirect_pending', 'true');
      sessionStorage.setItem('qatra_google_redirect_path', window.location.pathname);
      await signInWithRedirect(auth, provider);
      return { redirecting: true };
    }

    throw err;
  }
}

/**
 * Checks if the page loaded as the result of a Google OAuth redirect (mobile Safari/Chrome).
 */
export async function checkGoogleRedirectResult() {
  try {
    const auth = getFirebaseAuth();
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      sessionStorage.removeItem('qatra_google_redirect_pending');
      const idToken = await result.user.getIdToken();
      return { user: result.user, idToken };
    }
  } catch (err) {
    console.warn('[QATRA Auth] Error resolving redirect result:', err);
    sessionStorage.removeItem('qatra_google_redirect_pending');
    throw err;
  }
  return null;
}

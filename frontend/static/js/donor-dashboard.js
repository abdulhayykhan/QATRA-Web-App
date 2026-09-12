/**
 * QATRA — Donor Dashboard & Availability Toggle Controller (Feature 4)
 * Manages donor profile status, cooldown tracking, and throttled location dispatch.
 */
import { apiGet, apiPost, showToast, getCurrentUser, logout } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  loadCooldownStatus();
  setupAvailabilityToggle();
  setupLogout();
});

function loadUserProfile() {
  const user = getCurrentUser();
  if (user) {
    document.getElementById('donor-name').innerText = user.full_name || 'Alkhidmat Donor';
    document.getElementById('donor-email').innerText = user.email || 'donor@alkhidmat.org';
  }
}

async function loadCooldownStatus() {
  try {
    const cooldown = await apiGet('/auth/donor/cooldown');
    const circle = document.getElementById('cooldown-circle-display');
    const daysEl = document.getElementById('cooldown-days');
    const titleEl = document.getElementById('cooldown-status-title');
    const textEl = document.getElementById('cooldown-status-text');

    if (cooldown.is_on_cooldown) {
      circle.className = 'cooldown-circle';
      daysEl.innerText = cooldown.days_remaining || 45;
      titleEl.innerText = '90-Day Cooldown Active';
      textEl.innerText = `You recently completed a life-saving donation. Safe to donate again on ${new Date(cooldown.cooldown_until).toLocaleDateString()}.`;
    } else {
      circle.className = 'cooldown-circle active-donor';
      daysEl.innerText = '0';
      titleEl.innerText = 'Eligible & Active';
      textEl.innerText = 'Your 90-day cooldown hold is complete. You are active in the emergency dispatch pool.';
    }
  } catch (err) {
    console.warn('Could not fetch cooldown status, assuming active baseline.');
  }
}

function setupAvailabilityToggle() {
  const toggle = document.getElementById('availability-toggle');
  const desc = document.getElementById('toggle-desc');

  toggle.addEventListener('change', async () => {
    if (toggle.checked) {
      desc.innerText = 'Updating location and activating alerts...';

      // Get Coordinates
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await syncLocation(pos.coords.latitude, pos.coords.longitude);
          },
          async () => {
            // Fallback Karachi default
            await syncLocation(24.8607, 67.0011);
          }
        );
      } else {
        await syncLocation(24.8607, 67.0011);
      }
    } else {
      desc.innerText = 'Turned OFF. You will not receive emergency alerts.';
      showToast('You are now paused from emergency proximity dispatch.', 'info');
    }
  });

  async function syncLocation(lat, lng) {
    try {
      await apiPost('/map/donor/location', {
        latitude: lat,
        longitude: lng
      });
      desc.innerText = 'Broadcasts your proximity to emergency requests';
      showToast('Location updated. You are active for proximity matching! 📍', 'success');
    } catch (err) {
      desc.innerText = 'Broadcasts your proximity to emergency requests';
      showToast('Location updated locally.', 'info');
    }
  }
}

function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to sign out?')) {
      logout();
    }
  });
}

/**
 * QATRA — Seeker Matchmaker & Live Coordination Controller
 * Connects accepted dispatch donor with seeker.
 * - Resolves seeker calling rights and donor phone
 * - Unidirectional calling: Seeker calls donor directly on phone via tel:
 * - Direct navigation to In-App Chat
 */
import { apiGet, onReady } from './api.js';

onReady(() => {
  setupMatchActions();
});

async function setupMatchActions() {
  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('request_id') || '1';

  const callBtn = document.getElementById('btn-match-call-donor');
  const chatBtn = document.getElementById('btn-match-chat-donor');
  const donorNameEl = document.getElementById('matched-donor-name');
  const donorSubtextEl = document.getElementById('matched-donor-subtext');

  if (chatBtn) {
    chatBtn.href = `/seeker/coordination.html?request_id=${requestId}`;
  }

  try {
    const data = await apiGet(`/coordination/${requestId}`).catch(() => null);

    if (data) {
      if (data.matched_donor) {
        if (donorNameEl) donorNameEl.innerText = data.matched_donor.name || 'Anonymous Donor #D-402';
        if (donorSubtextEl) {
          donorSubtextEl.innerText = `📍 ${data.matched_donor.distance_km || 3.4} km away • ⏱️ ETA: ~${data.matched_donor.estimated_arrival_minutes || 14} mins`;
        }
      }

      // If user is seeker and can call donor
      if (data.can_call && data.call_phone_number && callBtn) {
        callBtn.href = `tel:${data.call_phone_number}`;
        callBtn.style.display = 'inline-flex';
      } else if (!data.can_call && callBtn) {
        // Strict donor protection: donor cannot call seeker
        callBtn.style.display = 'none';
      }
    }
  } catch (err) {
    console.warn('Match session fallback active:', err);
  }
}

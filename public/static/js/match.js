/**
 * QATRA — Seeker Matchmaker & Live Coordination Controller
 * Connects accepted dispatch donor with seeker.
 * - Resolves seeker calling rights and donor phone
 * - Unidirectional calling: Seeker calls donor directly on phone via tel: (ONLY after dispatch acceptance)
 * - Direct navigation to In-App Chat
 */
import { apiGet, onReady } from './api.js';

onReady(() => {
  setupMatchActions();
});

async function setupMatchActions() {
  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('request_id');

  const chatBtn = document.getElementById('btn-match-chat-donor');
  if (chatBtn && requestId) {
    chatBtn.href = `/seeker/coordination.html?request_id=${requestId}`;
  }

  const matchedListEl = document.getElementById('matched-donors-list');
  const statAlerted = document.getElementById('stat-alerted');
  const statAccepted = document.getElementById('stat-accepted');

  if (!requestId) return;

  try {
    const statusData = await apiGet(`/map/requests/${requestId}/status`).catch(() => null);
    if (statusData) {
      if (statAlerted) statAlerted.innerText = statusData.donors_alerted_count || 0;
      if (statAccepted) statAccepted.innerText = statusData.donors_accepted_count || 0;
    }

    const data = await apiGet(`/coordination/${requestId}`).catch(() => null);

    if (data && data.matched_donor && matchedListEl) {
      const donor = data.matched_donor;
      const canCall = Boolean(data.can_call && data.call_phone_number);

      matchedListEl.innerHTML = `
        <div class="donor-match-card">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 28px;">🚗</div>
            <div>
              <strong style="font-size: 14px;">${donor.name || 'Volunteer Donor'}</strong>
              <div style="font-size: 12px; color: var(--text-muted);">
                📍 ${donor.distance_km ? donor.distance_km.toFixed(1) : '—'} km away • ⏱️ ETA: ~${donor.estimated_arrival_minutes || 15} mins
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px;">
            ${canCall ? `
              <a id="btn-match-call-donor" href="tel:${data.call_phone_number}" class="btn btn-sm btn-success" style="width: auto; text-decoration: none; font-weight: 600;">
                📞 Call Donor
              </a>
            ` : `
              <button type="button" class="btn btn-sm btn-secondary" disabled style="opacity: 0.6; cursor: not-allowed; font-size: 12px;" title="Direct call unlocks once donor accepts dispatch">
                🔒 Call Locked
              </button>
            `}
            <a id="btn-match-chat-donor" href="/seeker/coordination.html?request_id=${requestId}" class="btn btn-sm btn-primary" style="width: auto; text-decoration: none; font-weight: 600;">
              💬 In-App Chat
            </a>
          </div>
        </div>
      `;
    } else if (matchedListEl) {
      matchedListEl.innerHTML = `
        <div style="text-align: center; padding: 28px 16px; background: #FFFFFF; border-radius: 18px; border: 1.5px dashed rgba(201, 42, 42, 0.25); box-shadow: var(--shadow-sm);">
          <div style="font-size: 32px; margin-bottom: 8px;">📡</div>
          <div style="font-size: 15px; font-weight: 700; color: #111827;">No Donors Available Right Now</div>
          <div style="font-size: 12.5px; color: #6B7280; margin-top: 5px; line-height: 1.45; max-width: 320px; margin-left: auto; margin-right: auto;">
            Radar is actively scanning Karachi for eligible donors. As soon as a donor confirms dispatch, their details and contact options will appear here.
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.warn('Match session lookup:', err);
  }
}

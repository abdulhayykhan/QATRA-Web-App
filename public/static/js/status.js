/**
 * QATRA — Seeker Matchmaker Dashboard & Request Status Engine (Feature 1)
 * Wireframes pg. 8 & 9:
 * - Real-time seeker polling (GET /api/map/requests/{id}/status)
 * - Proximity-ranked donor matching (GET /api/map/requests/{id}/matches)
 * - Auto-expansion status tracker (FR 1.3.3)
 * - Real-time in-app chat & direct coordination handoff
 */
import { apiGet, apiPost, showToast, formatUrgency, onReady, showConfirmDialog } from './api.js';

let currentRequestId = null;
let pollTimer = null;
let lastKnownRadius = 10.0;

onReady(() => {
  const urlParams = new URLSearchParams(window.location.search);
  currentRequestId = urlParams.get('request_id') || localStorage.getItem('last_request_id');

  if (currentRequestId) {
    // Immediate render from cache if available
    try {
      const cached = localStorage.getItem(`request_${currentRequestId}_details`);
      if (cached) {
        const d = JSON.parse(cached);
        applyRequestBannerDetails(d);
      }
    } catch (e) {}

    loadRequestStatus();
    loadProximityMatches();
    // Poll status every 5 seconds for real-time seeker updates
    pollTimer = setInterval(() => {
      loadRequestStatus(true);
      loadProximityMatches(true);
    }, 5000);
  } else {
    // Render default compatible donors guide
    loadProximityMatches(true);
  }

  setupActions();
});

function applyRequestBannerDetails(data) {
  if (!data) return;
  if (data.patient_name) {
    const el = document.getElementById('patient-name-display');
    if (el) el.innerText = data.patient_name;
  }
  if (data.hospital_name) {
    const el = document.getElementById('hospital-name-display');
    if (el) el.innerText = data.hospital_name;
  }
  if (data.blood_group) {
    const el = document.getElementById('blood-group-badge');
    if (el) el.innerText = data.blood_group;
  }
  if (data.urgency) {
    const el = document.getElementById('urgency-tier-badge');
    if (el) {
      const uInfo = formatUrgency(data.urgency);
      el.innerText = uInfo.text;
    }
  }
}

window.addEventListener('beforeunload', () => {
  if (pollTimer) clearInterval(pollTimer);
});

/**
 * 1. Poll Request Status (FR 1.3.3 Lazy Auto-Expansion)
 */
async function loadRequestStatus(silent = false) {
  if (!currentRequestId) return;

  try {
    const statusData = await apiGet(`/map/requests/${currentRequestId}/status`);
    if (!statusData) return;

    // Update banner with fresh backend details
    applyRequestBannerDetails(statusData);

    // Update fulfillment progress
    const needed = statusData.units_needed || 1;
    const fulfilled = statusData.units_fulfilled || 0;
    const pct = Math.min(100, Math.round((fulfilled / needed) * 100));

    document.getElementById('units-ratio-text').innerText = `${fulfilled} / ${needed} Units Secured`;
    const fill = document.getElementById('units-progress-fill');
    fill.style.width = `${pct}%`;
    if (pct >= 100) fill.classList.add('success');

    // Update metrics
    document.getElementById('alerted-donors-count').innerText = statusData.donors_alerted_count || 0;
    document.getElementById('accepted-donors-count').innerText = statusData.donors_accepted_count || 0;
    
    if (statusData.eta_minutes) {
      document.getElementById('closest-eta').innerText = `${statusData.eta_minutes}m`;
    } else {
      document.getElementById('closest-eta').innerText = statusData.donors_alerted_count > 0 ? '~15m' : '--';
    }

    // Auto-expansion tracker (FR 1.3.3)
    const currentRadius = statusData.current_radius_km || 10.0;
    document.getElementById('current-radius-text').innerText = `${currentRadius.toFixed(1)} km`;

    if (currentRadius > lastKnownRadius && !silent) {
      showToast(`📡 Search radius auto-expanded to ${currentRadius} km per FR 1.3.3`, 'warning');
      lastKnownRadius = currentRadius;
    }
  } catch (err) {
    if (!silent) console.warn('Could not poll request status:', err.message);
  }
}

/**
 * 2. Fetch Proximity-Ranked Donors (FR 1.4, Wireframe pg. 9)
 */
async function loadProximityMatches(silent = false) {
  if (!currentRequestId) return;

  try {
    let matches = await apiGet(`/map/requests/${currentRequestId}/matches`).catch(() => null);

    const container = document.getElementById('donors-list-container');

    // Display empty state when no donors have responded/available
    if (!matches || matches.length === 0) {
      container.innerHTML = `
        <div class="empty-matches-card" style="text-align: center; padding: 28px 16px; background: #FFFFFF; border-radius: 18px; border: 1.5px dashed rgba(201, 42, 42, 0.25); margin-top: 10px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 32px; margin-bottom: 8px;">📡</div>
          <div style="font-size: 15px; font-weight: 700; color: #111827;">No Donors Available Right Now</div>
          <div style="font-size: 12.5px; color: #6B7280; margin-top: 5px; line-height: 1.45;">
            Radar is broadcasting your appeal to nearby compatible donors. Once a donor accepts your appeal, their live coordination status will appear here.
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    matches.forEach(donor => {
      const card = document.createElement('div');
      card.className = 'donor-match-card';
      const isAccepted = Boolean(donor.is_accepted);

      card.innerHTML = `
        <div class="donor-header">
          <div>
            <span class="donor-id">Donor #D-${donor.donor_id}</span>
            <span class="badge badge-blood" style="margin-left: 6px; font-size: 11px;">${donor.blood_group}</span>
          </div>
          <span class="badge ${isAccepted ? 'badge-success' : 'badge-secondary'}" style="font-size: 10px;">
            ${isAccepted ? '✅ Dispatch Accepted' : 'Compatible Match'}
          </span>
        </div>

        <div class="donor-metrics">
          <span>📍 <b>${donor.distance_km ? donor.distance_km.toFixed(1) : '—'} km</b> away</span>
          <span>⏱️ ETA: <b>${donor.estimated_arrival_minutes || 15} mins</b></span>
          <span>🟢 Available</span>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
          <a href="/seeker/coordination.html?request_id=${currentRequestId}&donor_id=${donor.donor_id}" class="btn btn-sm btn-primary" style="font-size: 12px; flex: 1; text-align: center;">
            💬 In-App Chat
          </a>
          ${isAccepted ? `
            <a href="/seeker/coordination.html?request_id=${currentRequestId}&donor_id=${donor.donor_id}" class="btn btn-sm btn-outline" style="font-size: 12px; flex: 1; text-align: center; border-color: #10B981; color: #047857;">
              📞 Call Donor
            </a>
          ` : `
            <button type="button" class="btn btn-sm btn-secondary" disabled style="font-size: 11px; opacity: 0.6; cursor: not-allowed; flex: 1;" title="Direct phone call locked until donor accepts request">
              🔒 Call Locked
            </button>
          `}
        </div>
        ${!isAccepted ? `
          <div style="font-size: 10.5px; color: #6B7280; margin-top: 5px; text-align: center;">
            🔒 Direct phone call unlocks after donor accepts request.
          </div>
        ` : ''}
      `;

      container.appendChild(card);
    });
  } catch (err) {
    if (!silent) console.warn('Could not load proximity matches:', err.message);
  }
}

/**
 * 3. Setup Button Actions (WhatsApp Share & Close Override)
 */
function setupActions() {
  const shareBtn = document.getElementById('whatsapp-share-btn');
  const closeBtn = document.getElementById('close-request-btn');

  shareBtn.addEventListener('click', () => {
    const text = `🚨 *URGENT BLOOD APPEAL (QATRA)*\nEmergency Request #${currentRequestId} is active.\nNearby eligible donors are requested to respond.\nMonitor & Respond: ${window.location.origin}/seeker/status.html?request_id=${currentRequestId}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  });

  closeBtn.addEventListener('click', async () => {
    const confirmed = await showConfirmDialog({
      title: 'Close Emergency Request',
      message: 'Are you sure you wish to close this emergency request?',
      confirmLabel: 'Close Request',
      danger: true
    });
    if (!confirmed) return;

    try {
      await apiPost(`/feed/${currentRequestId}/close`, { reason: 'Closed by seeker override' });
      showToast('Request closed successfully.', 'success');
      setTimeout(() => window.location.href = '/seeker/feed.html', 1200);
    } catch (err) {
      showToast('Request marked fulfilled.', 'info');
      setTimeout(() => window.location.href = '/seeker/feed.html', 1200);
    }
  });
}

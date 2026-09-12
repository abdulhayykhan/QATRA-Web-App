/**
 * QATRA — Reusable Post Card Component (Feature 3: Feed & Proximity Matching)
 * Owner: Mahrukh Baig
 *
 * Reusable across:
 * - Feed view (urgent blood requests & blood drives)
 * - Seeker active request dashboard & matched-donor views
 */
import { apiGet, apiPost, showToast, formatUrgency, formatTimeAgo, getCurrentUser } from '../api.js';

const RARE_BLOOD_GROUPS = new Set(['O-', 'AB-', 'B-', 'A-']);

/**
 * Creates and returns an interactive, responsive HTML DOM element representing a blood appeal card.
 *
 * @param {Object} req - Blood request or drive event data
 * @param {Object} options - Configuration options
 * @param {'feed'|'matched'|'manage'} options.mode - Render mode
 * @param {Function} [options.onRespondSuccess] - Optional callback after donor response
 * @param {Function} [options.onCloseClick] - Optional callback for close request
 * @returns {HTMLElement} The card element
 */
export function createPostCard(req, options = {}) {
  const mode = options.mode || 'feed';
  const currentUser = getCurrentUser();

  const card = document.createElement('div');
  card.className = 'card feed-card';
  card.setAttribute('data-request-id', req.request_id || req.id || '');

  // Handle Blood Drive Events in Feed
  if (req.item_type === 'blood_drive') {
    return renderDrivePostCard(req);
  }

  const requestId = req.request_id || req.id;
  const isRare = RARE_BLOOD_GROUPS.has((req.blood_group || '').trim().toUpperCase());
  const urgencyInfo = formatUrgency(req.urgency);
  const unitsNeeded = req.units_needed || 1;
  const unitsFulfilled = req.units_fulfilled || 0;
  const percentFulfilled = Math.min(100, Math.round((unitsFulfilled / unitsNeeded) * 100));
  const isFulfilled = req.status === 'fulfilled' || unitsFulfilled >= unitsNeeded;
  const isOwner = currentUser && (currentUser.id === req.seeker_id || currentUser.role === 'admin');

  // Highlight styling for high urgency or rare blood groups
  if (req.urgency === 'within_2_hours') {
    card.classList.add('card-highlight');
  }

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-sm); margin-bottom: var(--space-xs);">
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 0; color: var(--text-main);">
            ${req.hospital_name || 'Hospital Karachi'}
          </h3>
          ${isRare ? '<span class="badge badge-critical" style="font-size: 10px; padding: 2px 6px;">⚡ RARE GROUP</span>' : ''}
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
          Patient: <strong>${req.patient_name || 'Emergency Patient'}</strong>
          • <span>${formatTimeAgo(req.created_at)}</span>
        </div>
      </div>
      <div style="text-align: right; flex-shrink: 0;">
        <span class="badge badge-blood" style="font-size: 15px; font-weight: 800; padding: 4px 10px;">
          ${req.blood_group || 'O-'}
        </span>
      </div>
    </div>

    <!-- Tags Row -->
    <div style="display: flex; gap: var(--space-xs); align-items: center; flex-wrap: wrap; margin: var(--space-xs) 0 var(--space-sm) 0;">
      <span class="badge ${urgencyInfo.class}">${urgencyInfo.text}</span>
      <span class="badge badge-gray">${req.component_type || 'Whole Blood'}</span>
      ${req.search_radius_km ? `<span style="font-size: 11px; color: var(--text-muted);">Radius: ${req.search_radius_km}km</span>` : ''}
    </div>

    <!-- Fulfillment Progress Bar -->
    <div style="margin: var(--space-sm) 0 var(--space-md) 0;">
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
        <span style="color: var(--text-muted); font-weight: 500;">Units Fulfilled</span>
        <strong style="color: ${isFulfilled ? 'var(--color-success)' : 'var(--text-main)'};">
          ${unitsFulfilled} / ${unitsNeeded} Unit${unitsNeeded > 1 ? 's' : ''}
        </strong>
      </div>
      <div class="progress-bar-container" style="height: 7px;">
        <div class="progress-bar-fill ${isFulfilled ? 'success' : ''}" style="width: ${percentFulfilled}%;"></div>
      </div>
    </div>

    <!-- Action Buttons Row -->
    <div class="card-actions" style="display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap;">
      ${isFulfilled ? `
        <button class="btn btn-secondary btn-sm" disabled style="flex: 1;">
          Fulfilled & Closed ✅
        </button>
      ` : `
        <button type="button" class="btn btn-primary btn-sm btn-respond" style="flex: 1;" data-id="${requestId}">
          I Can Donate ❤️
        </button>
      `}

      <button type="button" class="btn btn-secondary btn-sm btn-share" style="width: auto; padding: 6px 14px;" data-id="${requestId}" title="Share via WhatsApp">
        📤 Share
      </button>

      ${isOwner && !isFulfilled ? `
        <a href="/seeker/closure.html?request_id=${requestId}" class="btn btn-outline btn-sm" style="width: auto; padding: 6px 12px; color: var(--color-danger); border-color: var(--color-danger);" title="Close or Mark Fulfilled">
          Close Request
        </a>
      ` : ''}
    </div>
  `;

  // Attach Event Handlers
  bindCardEvents(card, req, options);

  return card;
}

/**
 * Attaches interactive click handlers for "I Can Donate" and "Share".
 */
function bindCardEvents(card, req, options) {
  const requestId = req.request_id || req.id;
  const respondBtn = card.querySelector('.btn-respond');
  const shareBtn = card.querySelector('.btn-share');

  // One-Tap Respond Handler (FR 3.3)
  if (respondBtn) {
    respondBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const currentUser = getCurrentUser();

      if (!currentUser) {
        showToast('Please sign in as a verified donor to respond.', 'warning');
        setTimeout(() => {
          window.location.href = '/donor/register.html';
        }, 1200);
        return;
      }

      respondBtn.disabled = true;
      const originalText = respondBtn.innerText;
      respondBtn.innerText = 'Connecting... ⏳';

      try {
        const res = await apiPost(`/feed/${requestId}/respond`);
        showToast(res.message || 'Thank you! The seeker has been alerted.', 'success');
        respondBtn.className = 'btn btn-success btn-sm';
        respondBtn.innerText = 'Response Sent ✅';

        if (typeof options.onRespondSuccess === 'function') {
          options.onRespondSuccess(res);
        }
      } catch (err) {
        respondBtn.disabled = false;
        respondBtn.innerText = originalText;
      }
    });
  }

  // Structured Share Handler (FR 3.3)
  if (shareBtn) {
    shareBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const data = await apiGet(`/feed/${requestId}/share`);
        const textToShare = data.whatsapp_text || `🚨 *URGENT BLOOD NEEDED (QATRA)*\nBlood Group: *${req.blood_group}*\nHospital: *${req.hospital_name}*\nVerify: ${data.share_url}`;
        
        // Open WhatsApp Web or Mobile Client
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`;
        window.open(waUrl, '_blank');
      } catch (err) {
        // Fallback WhatsApp message if offline
        const fallbackText = `🚨 Emergency Blood Alert: ${req.blood_group} needed urgently at ${req.hospital_name}. Respond on QATRA: https://qatra.pk/requests/${requestId}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fallbackText)}`, '_blank');
      }
    });
  }
}

/**
 * Formats blood drive event card for the feed stream.
 */
function renderDrivePostCard(drive) {
  const card = document.createElement('div');
  card.className = 'card feed-card card-highlight';
  card.style.borderLeft = '4px solid var(--color-info)';

  const driveDate = drive.date_time ? new Date(drive.date_time).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'Upcoming This Week';

  const booked = drive.slots_booked || 0;
  const total = drive.slots_total || 100;
  const percent = Math.min(100, Math.round((booked / total) * 100));

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-xs);">
      <div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 18px;">🎪</span>
          <h3 style="font-size: 16px; margin-bottom: 0;">${drive.title}</h3>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">
          📍 ${drive.location_name} • <span>${driveDate}</span>
        </div>
      </div>
      <span class="badge badge-success" style="font-size: 11px;">Active Drive</span>
    </div>

    <p style="font-size: 13px; color: var(--text-muted); margin: var(--space-xs) 0 var(--space-sm) 0;">
      Alkhidmat Mobile Donation Bus on-site with verified medical team and refreshments.
    </p>

    <!-- Slot booking progress -->
    <div style="margin-bottom: var(--space-sm);">
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
        <span style="color: var(--text-muted);">Registered Donors</span>
        <strong>${booked} / ${total} slots booked</strong>
      </div>
      <div class="progress-bar-container" style="height: 6px;">
        <div class="progress-bar-fill" style="width: ${percent}%; background-color: var(--color-info);"></div>
      </div>
    </div>

    <div style="display: flex; gap: var(--space-sm);">
      <a href="/donor/awareness.html?event_id=${drive.event_id || drive.id || ''}" class="btn btn-outline btn-sm" style="flex: 1; text-align: center;">
        View Drive & Register
      </a>
    </div>
  `;

  return card;
}

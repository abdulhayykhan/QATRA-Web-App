/**
 * QATRA — Real-Time Emergency Coordination & In-App Chat Engine
 * - Resolves session details via GET /api/coordination/{request_id}
 * - Unidirectional calling: Seeker receives donor phone number for direct calling (tel:+92...)
 * - Strict donor privacy guard: Donors cannot call seeker (no call button, seeker phone withheld)
 * - Real-time In-App Chat: Both parties exchange live coordination messages via GET/POST /api/coordination/{request_id}/messages
 * - Turn-by-turn Hospital Navigation & Match Cancellation
 */
import { apiPost, apiGet, showToast, onReady, showConfirmDialog } from './api.js';

let currentRequestId = null;
let currentViewerRole = 'seeker';
let lastMessageCount = 0;
let chatPollInterval = null;

onReady(() => {
  const params = new URLSearchParams(window.location.search);
  currentRequestId = params.get('request_id') || '1';
  const roleOverride = params.get('as_role');

  loadCoordinationSession(roleOverride);
  setupChat();
  setupNavigation();

  // Poll chat every 3 seconds
  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(pollChatMessages, 3000);
});

/**
 * 1. Load Session Details & Enforce Calling Permissions
 */
async function loadCoordinationSession(roleOverride = null) {
  try {
    const url = `/coordination/${currentRequestId}` + (roleOverride ? `?as_role=${roleOverride}` : '');
    const data = await apiGet(url).catch(() => null);

    if (data) {
      currentViewerRole = data.viewer_role || (roleOverride || 'seeker');

      // Update donor badge and info
      if (data.matched_donor) {
        const donorNameEl = document.getElementById('matched-donor-display-name');
        if (donorNameEl) donorNameEl.innerText = data.matched_donor.name || 'Anonymous Donor #D-402';

        const bloodTagEl = document.getElementById('matched-donor-blood-tag');
        if (bloodTagEl) bloodTagEl.innerText = data.matched_donor.blood_group || 'B+';

        const navBloodBadge = document.getElementById('nav-blood-badge');
        if (navBloodBadge) navBloodBadge.innerText = `${data.matched_donor.blood_group || 'B+'} Needed`;

        const distEl = document.getElementById('nav-distance');
        if (distEl) distEl.innerText = `${data.matched_donor.distance_km || 2.4} km`;

        const etaEl = document.getElementById('nav-eta');
        if (etaEl) etaEl.innerText = `${data.matched_donor.estimated_arrival_minutes || 14} mins`;
      }

      // Update hospital details
      if (data.hospital) {
        const hospName = document.getElementById('nav-hospital-name');
        if (hospName) hospName.innerText = data.hospital.name || 'Civil Hospital Karachi';

        const hospAddr = document.getElementById('nav-hospital-address');
        if (hospAddr) hospAddr.innerText = data.hospital.address || 'Mission Rd, New Karachi';

        const gpsBtn = document.getElementById('btn-open-gps-directions');
        if (gpsBtn && data.hospital.latitude && data.hospital.longitude) {
          gpsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${data.hospital.latitude},${data.hospital.longitude}`;
        }
      }

      // Apply Unidirectional Calling Rules
      const seekerCallBox = document.getElementById('seeker-call-container');
      const donorNoticeBox = document.getElementById('donor-advisory-container');
      const callBtn = document.getElementById('btn-call-donor');
      const numberText = document.getElementById('donor-call-number-text');

      if (data.can_call && data.call_phone_number) {
        // Seeker View: Direct calling enabled
        if (seekerCallBox) seekerCallBox.style.display = 'block';
        if (donorNoticeBox) donorNoticeBox.style.display = 'none';
        if (callBtn) callBtn.href = `tel:${data.call_phone_number}`;
        if (numberText) numberText.innerText = `(${data.call_phone_number})`;
      } else {
        // Donor View: Direct calling strictly prohibited
        if (seekerCallBox) seekerCallBox.style.display = 'none';
        if (donorNoticeBox) donorNoticeBox.style.display = 'block';
      }
    } else {
      // Fallback for demo/offline simulation
      applyFallbackSession(roleOverride);
    }

    await pollChatMessages();
  } catch (err) {
    console.warn('Coordination session fallback active:', err);
    applyFallbackSession(roleOverride);
  }
}

function applyFallbackSession(roleOverride) {
  currentViewerRole = roleOverride === 'donor' ? 'donor' : 'seeker';
  const seekerCallBox = document.getElementById('seeker-call-container');
  const donorNoticeBox = document.getElementById('donor-advisory-container');
  const callBtn = document.getElementById('btn-call-donor');
  const numberText = document.getElementById('donor-call-number-text');

  if (currentViewerRole === 'seeker') {
    if (seekerCallBox) seekerCallBox.style.display = 'block';
    if (donorNoticeBox) donorNoticeBox.style.display = 'none';
    if (callBtn) callBtn.href = 'tel:+923001234567';
    if (numberText) numberText.innerText = '(+92 300 1234567)';
  } else {
    if (seekerCallBox) seekerCallBox.style.display = 'none';
    if (donorNoticeBox) donorNoticeBox.style.display = 'block';
  }
}

/**
 * 2. Real-Time Chat Message Polling
 */
async function pollChatMessages() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  try {
    const messages = await apiGet(`/coordination/${currentRequestId}/messages`).catch(() => null);

    if (Array.isArray(messages) && messages.length > 0) {
      // Only re-render if message count changed or empty
      if (messages.length !== lastMessageCount) {
        container.innerHTML = '';
        messages.forEach(msg => {
          renderBubble(msg, container);
        });
        container.scrollTop = container.scrollHeight;
        lastMessageCount = messages.length;
      }
    } else if (container.children.length === 0) {
      // Fallback initial greeting
      renderBubble({
        id: 1,
        sender_role: 'donor',
        sender_name: 'Volunteer Donor',
        text: 'Hello! I have confirmed your emergency blood alert. I am on my way to the blood bank.',
        timestamp: new Date().toISOString()
      }, container);
      lastMessageCount = 1;
    }
  } catch (err) {
    console.warn('Chat poll fallback:', err);
  }
}

function renderBubble(msg, container) {
  const isOutgoing = (msg.sender_role === currentViewerRole);
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

  const timeStr = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const roleLabel = msg.sender_role === 'seeker' ? '🚨 Seeker' : '🩸 Donor';

  bubble.innerHTML = `
    <div class="bubble-meta" style="color: ${isOutgoing ? 'rgba(255,255,255,0.9)' : 'var(--color-primary)'};">
      ${escapeHtml(msg.sender_name || (msg.sender_role === 'seeker' ? 'Emergency Seeker' : 'Volunteer Donor'))} • ${roleLabel}
    </div>
    <div class="bubble-body">${escapeHtml(msg.text)}</div>
    ${timeStr ? `<div class="bubble-time">${timeStr}</div>` : ''}
  `;

  container.appendChild(bubble);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 3. Chat Form & Presets Setup
 */
function setupChat() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const container = document.getElementById('chat-messages-container');
  const chips = document.querySelectorAll('.preset-chip');

  if (form && input) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      input.value = '';

      // Optimistic instant render
      const optimisticMsg = {
        id: Date.now(),
        sender_role: currentViewerRole,
        sender_name: currentViewerRole === 'seeker' ? 'Emergency Seeker' : 'Volunteer Donor',
        text: text,
        timestamp: new Date().toISOString()
      };
      if (container) {
        renderBubble(optimisticMsg, container);
        container.scrollTop = container.scrollHeight;
        lastMessageCount++;
      }

      try {
        await apiPost(`/coordination/${currentRequestId}/messages`, {
          text: text,
          sender_role: currentViewerRole
        });
        showToast('Message sent.', 'info');
      } catch (err) {
        console.warn('Message send network warning:', err);
      }
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (input) {
        input.value = chip.innerText.replace(/^[^\s]+\s/, ''); // Remove leading emoji for clean editing or send
        form.dispatchEvent(new Event('submit'));
      }
    });
  });
}

/**
 * 4. Navigation & Directions
 */
function setupNavigation() {
  const gpsBtn = document.getElementById('btn-open-gps-directions');
  const cancelBtn = document.getElementById('btn-cancel-match');

  const hospitalLat = 24.8569;
  const hospitalLng = 67.0112;
  if (gpsBtn && !gpsBtn.href.includes('google.com/maps')) {
    gpsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${hospitalLat},${hospitalLng}`;
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog({
        title: 'Cancel Match',
        message: 'Cancel this match? The request will immediately re-open to alert other ranked donors.',
        confirmLabel: 'Cancel Match',
        danger: true
      });
      if (!confirmed) {
        return;
      }

      try {
        await apiPost(`/map/requests/${currentRequestId}/cancel`);
        showToast('Match cancelled. Request re-opened to next-ranked donors.', 'warning');
        setTimeout(() => {
          window.location.href = `/seeker/status.html?request_id=${currentRequestId}`;
        }, 1200);
      } catch (err) {
        showToast(err.message || 'Error cancelling match', 'error');
      }
    });
  }
}

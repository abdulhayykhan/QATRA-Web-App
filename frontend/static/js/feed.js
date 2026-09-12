/**
 * QATRA — Social & Urgent Request Feed Controller (Feature 3)
 * Fetches verified blood appeals, handles "I Can Donate", and generates WhatsApp shares.
 */
import { apiGet, apiPost, showToast, formatUrgency, formatTimeAgo } from './api.js';

let activeBloodFilter = '';
let activeUrgencyFilter = '';
let currentTab = 'requests'; // 'requests' or 'drives'

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupFilterChips();
  loadFeed();
});

function setupTabs() {
  const tabUrgent = document.getElementById('tab-urgent');
  const tabDrives = document.getElementById('tab-drives');

  tabUrgent.addEventListener('click', () => {
    tabUrgent.classList.add('active');
    tabDrives.classList.remove('active');
    currentTab = 'requests';
    loadFeed();
  });

  tabDrives.addEventListener('click', () => {
    tabDrives.classList.add('active');
    tabUrgent.classList.remove('active');
    currentTab = 'drives';
    loadFeed();
  });
}

function setupFilterChips() {
  const chips = document.querySelectorAll('#filter-chips .filter-chip');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      activeBloodFilter = chip.getAttribute('data-filter') || '';
      activeUrgencyFilter = chip.getAttribute('data-urgency') || '';
      loadFeed();
    });
  });
}

async function loadFeed() {
  const container = document.getElementById('feed-stream');
  container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Fetching live appeals...</div>';

  try {
    const params = {
      blood_group: activeBloodFilter || undefined,
      urgency: activeUrgencyFilter || undefined,
      include_drive_events: currentTab === 'drives'
    };

    const response = await apiGet('/feed', params);
    const items = response.items || [];

    const filteredItems = items.filter(item => {
      if (currentTab === 'drives') return item.item_type === 'blood_drive';
      return item.item_type === 'request';
    });

    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 36px; margin-bottom: 8px;">🕊️</div>
          <h3>No active appeals in this category</h3>
          <p>All emergency requests are currently fulfilled or in verification.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    filteredItems.forEach(item => {
      if (item.item_type === 'blood_drive') {
        container.appendChild(renderDriveCard(item));
      } else {
        container.appendChild(renderRequestCard(item));
      }
    });

  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--color-danger);">Could not connect to feed service.</div>';
  }
}

function renderRequestCard(req) {
  const card = document.createElement('div');
  card.className = 'feed-card';

  const urgencyInfo = formatUrgency(req.urgency);
  const percentFulfilled = Math.min(100, Math.round(((req.units_fulfilled || 0) / (req.units_needed || 1)) * 100));
  const isFulfilled = req.status === 'fulfilled' || (req.units_fulfilled >= req.units_needed);

  card.innerHTML = `
    <div class="feed-card-header">
      <div>
        <h3 style="font-size: 16px; margin-bottom: 2px;">${req.hospital_name}</h3>
        <div style="font-size: 12px; color: var(--text-muted);">
          Patient: ${req.patient_name || 'Emergency Patient'} • ${formatTimeAgo(req.created_at)}
        </div>
      </div>
      <span class="badge badge-blood">${req.blood_group}</span>
    </div>

    <div style="display: flex; gap: var(--space-sm); align-items: center; margin: var(--space-xs) 0;">
      <span class="badge ${urgencyInfo.class}">${urgencyInfo.text}</span>
      <span style="font-size: 12px; color: var(--text-muted);">${req.component_type || 'Whole Blood'}</span>
    </div>

    <!-- Fulfillment Progress -->
    <div style="margin-top: var(--space-sm);">
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
        <span>Progress</span>
        <strong>${req.units_fulfilled || 0} / ${req.units_needed} Units</strong>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill ${isFulfilled ? 'success' : ''}" style="width: ${percentFulfilled}%;"></div>
      </div>
    </div>

    <!-- Actions Row -->
    <div class="card-actions-row">
      ${isFulfilled ? `
        <button class="btn btn-secondary btn-sm" disabled style="flex: 1;">Fulfilled & Closed ✅</button>
      ` : `
        <button class="btn btn-primary btn-sm respond-btn" style="flex: 1;" data-id="${req.request_id}">
          I Can Donate ❤️
        </button>
      `}
      <button class="btn btn-secondary btn-sm share-btn" style="width: auto; padding: 6px 14px;" data-id="${req.request_id}">
        📤 Share
      </button>
    </div>
  `;

  // Bind Respond
  const respondBtn = card.querySelector('.respond-btn');
  if (respondBtn) {
    respondBtn.addEventListener('click', async () => {
      respondBtn.disabled = true;
      respondBtn.innerText = 'Registering... ⏳';

      try {
        await apiPost(`/feed/${req.request_id}/respond`);
        showToast('Thank you! Dispatch notification sent to seeker.', 'success');
        respondBtn.innerText = 'Response Sent ✅';
      } catch (err) {
        respondBtn.disabled = false;
        respondBtn.innerText = 'I Can Donate ❤️';
      }
    });
  }

  // Bind Share
  const shareBtn = card.querySelector('.share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      try {
        const shareData = await apiGet(`/feed/${req.request_id}/share`);
        const text = shareData.share_text || `🚨 Emergency Blood Request: ${req.blood_group} required at ${req.hospital_name}.`;
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
      } catch (err) {
        const text = `🚨 Emergency: ${req.blood_group} blood urgently needed at ${req.hospital_name}. Respond on QATRA: ${window.location.origin}/seeker/feed.html`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
      }
    });
  }

  return card;
}

function renderDriveCard(drive) {
  const card = document.createElement('div');
  card.className = 'feed-card card-highlight';

  card.innerHTML = `
    <div class="feed-card-header">
      <div>
        <h3 style="font-size: 16px; margin-bottom: 2px;">🎪 ${drive.title}</h3>
        <div style="font-size: 12px; color: var(--text-muted);">
          📍 ${drive.location_name} • ${new Date(drive.date_time).toLocaleDateString()}
        </div>
      </div>
      <span class="badge badge-success">Drive</span>
    </div>

    <div style="margin: var(--space-sm) 0; font-size: 13px; color: var(--text-muted);">
      Alkhidmat Mobile Donation Bus on-site with certified phlebotomists.
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
      <span>Booked Slots</span>
      <strong>${drive.slots_booked || 0} / ${drive.slots_total || 50}</strong>
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar-fill" style="width: ${Math.round(((drive.slots_booked || 0) / (drive.slots_total || 50)) * 100)}%;"></div>
    </div>

    <div class="card-actions-row">
      <a href="/donor/awareness.html" class="btn btn-outline btn-sm" style="flex: 1; text-align: center;">
        View Details & Register
      </a>
    </div>
  `;

  return card;
}

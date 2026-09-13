/**
 * QATRA — Admin Drive Management Desk Controller
 * Manages campus drive scheduling, donor slot capacity, and attendance checks.
 */
import { apiGet, apiPost, showToast, onReady } from './api.js';

const FALLBACK_DRIVES = [
  {
    id: 1,
    title: "NED University Annual Emergency Blood Drive",
    location_name: "NED University Main Auditorium, Karachi",
    date_time: "2026-09-15T09:00:00Z",
    slots_total: 200,
    slots_booked: 48,
    event_type: "blood_drive"
  },
  {
    id: 2,
    title: "Dawood UET Thalassemia Awareness & Screening Session",
    location_name: "Dawood University Jinnah Campus Seminar Hall",
    date_time: "2026-09-18T11:00:00Z",
    slots_total: 100,
    slots_booked: 24,
    event_type: "awareness_session"
  },
  {
    id: 3,
    title: "Dow University Emergency Mobile Collection Drive",
    location_name: "Ojha Institute of Chest Diseases, Dow University, Karachi",
    date_time: "2026-09-22T10:00:00Z",
    slots_total: 150,
    slots_booked: 35,
    event_type: "blood_drive"
  }
];

onReady(() => {
  loadDrives();
  setupModal();
});

async function loadDrives() {
  const container = document.getElementById('drives-management-list');
  try {
    let drives = [];
    try {
      drives = await apiGet('/awareness/events');
    } catch (apiErr) {
      console.warn('API error fetching drives, using fallback:', apiErr);
    }
    const items = (Array.isArray(drives) && drives.length > 0) ? drives : FALLBACK_DRIVES;

    document.getElementById('total-drives-count').innerText = items.length;
    const totalBooked = items.reduce((acc, d) => acc + (d.slots_booked || 0), 0);
    document.getElementById('total-slots-booked').innerText = totalBooked;

    container.innerHTML = '';
    items.forEach(d => {
      const card = document.createElement('div');
      card.className = 'drive-management-card';

      const dateStr = new Date(d.date_time).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      card.innerHTML = `
        <div style="flex: 1; min-width: 240px;">
          <h3 style="font-size: 16px; margin-bottom: 2px;">🎪 ${d.title}</h3>
          <div style="font-size: 13px; color: var(--text-muted);">📍 ${d.location_name}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">🗓️ ${dateStr}</div>
        </div>

        <div style="min-width: 160px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span>Registered</span>
            <strong>${d.slots_booked || 0} / ${d.slots_total || 50}</strong>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${Math.round(((d.slots_booked || 0) / (d.slots_total || 50)) * 100)}%;"></div>
          </div>
        </div>

        <div>
          <button class="btn btn-sm btn-outline checkin-btn" data-id="${d.id}">QR Check-in 📷</button>
        </div>
      `;

      card.querySelector('.checkin-btn').addEventListener('click', () => {
        showToast(`Check-in terminal activated for ${d.title}`, 'info');
      });

      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--color-danger);">Failed to load drives.</div>';
  }
}

function setupModal() {
  const modal = document.getElementById('create-drive-modal');
  const openBtn = document.getElementById('new-drive-btn');
  const closeBtn = document.getElementById('close-modal-btn');
  const form = document.getElementById('create-drive-form');

  openBtn.addEventListener('click', () => modal.classList.add('active'));
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-drive-btn');
    btn.disabled = true;
    btn.innerText = 'Publishing... ⏳';

    const title = document.getElementById('drive-title').value.trim();
    const locationName = document.getElementById('drive-location').value.trim();
    const dateTime = document.getElementById('drive-date').value;
    const slots = parseInt(document.getElementById('drive-slots').value, 10);

    try {
      await apiPost('/awareness/events', {
        title,
        location_name: locationName,
        date_time: new Date(dateTime).toISOString(),
        slots_total: slots,
        event_type: 'campus_drive'
      });

      showToast('Blood drive scheduled and published to feed! 🎪', 'success');
      modal.classList.remove('active');
      form.reset();
      loadDrives();
    } catch (err) {
      showToast('Could not schedule blood drive.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Publish Blood Drive 🚀';
    }
  });
}

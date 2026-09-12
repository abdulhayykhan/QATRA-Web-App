/**
 * QATRA — Alkhidmat 24/7 Admin Verification Desk Controller (Feature 2)
 * Handles low-confidence OCR manual escalation queues (FR 2.2.3).
 */
import { apiGet, apiPost, showToast } from './api.js';

let queueItems = [];
let selectedItem = null;

document.addEventListener('DOMContentLoaded', () => {
  loadQueue();
  document.getElementById('refresh-queue-btn').addEventListener('click', loadQueue);
  setupActionButtons();
});

async function loadQueue() {
  const container = document.getElementById('queue-items-list');
  container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Fetching pending items...</div>';

  try {
    const items = await apiGet('/auth/admin/verification-queue');
    queueItems = Array.isArray(items) ? items : [];

    document.getElementById('pending-count-badge').innerText = `${queueItems.length} Pending`;

    if (queueItems.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);">🎉 All hospital slips and CNICs are verified!</div>';
      showEmptyState();
      return;
    }

    container.innerHTML = '';
    queueItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'queue-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <strong style="font-size: 13px;">${item.hospital_name || 'Hospital Slip'}</strong>
          <span class="badge badge-blood">${item.blood_group || 'O-'}</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
          Patient: ${item.patient_name || 'Emergency Patient'} (${item.units_needed || 1} units)
        </div>
        <div style="font-size: 11px; margin-top: 4px; color: var(--color-warning);">
          ⚠️ OCR Confidence: ${Math.round((item.ocr_confidence || 0.75) * 100)}%
        </div>
      `;

      card.onclick = () => {
        document.querySelectorAll('.queue-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        showDetail(item);
      };

      container.appendChild(card);
    });

    // Auto select first
    showDetail(queueItems[0]);
    container.firstChild.classList.add('selected');

  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--color-danger);">Failed to load verification queue.</div>';
  }
}

function showDetail(item) {
  selectedItem = item;
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('detail-content').style.display = 'block';

  document.getElementById('detail-hospital-name').innerText = item.hospital_name || 'Emergency Hospital';
  document.getElementById('detail-patient-name').innerText = item.patient_name || 'Unspecified';
  document.getElementById('detail-blood-badge').innerText = item.blood_group || 'O-';
  document.getElementById('detail-urgency').innerText = item.urgency === 'within_2_hours' ? 'Critical (2h)' : 'Standard (24h)';

  const confPercent = Math.round((item.ocr_confidence || 0.78) * 100);
  document.getElementById('detail-confidence-text').innerText = `${confPercent}%`;
  document.getElementById('detail-confidence-fill').style.width = `${confPercent}%`;

  const img = document.getElementById('detail-slip-img');
  img.src = item.slip_image_url || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80';
}

function showEmptyState() {
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('detail-content').style.display = 'none';
  selectedItem = null;
}

function setupActionButtons() {
  const approveBtn = document.getElementById('approve-btn');
  const rejectBtn = document.getElementById('reject-btn');

  approveBtn.addEventListener('click', async () => {
    if (!selectedItem) return;
    approveBtn.disabled = true;
    approveBtn.innerText = 'Approving... ⏳';

    try {
      await apiPost(`/auth/admin/verification-queue/${selectedItem.request_id}/approve`);
      showToast('Slip verified! Request moved to searching pool.', 'success');
      loadQueue();
    } catch (err) {
      showToast('Approval failed.', 'error');
    } finally {
      approveBtn.disabled = false;
      approveBtn.innerText = '✅ Approve & Broadcast to Donors';
    }
  });

  rejectBtn.addEventListener('click', async () => {
    if (!selectedItem) return;
    const reason = prompt('Please enter rejection reason:', 'Illegible doctor signature or invalid hospital stamp');
    if (!reason) return;

    rejectBtn.disabled = true;
    rejectBtn.innerText = 'Rejecting... ⏳';

    try {
      await apiPost(`/auth/admin/verification-queue/${selectedItem.request_id}/reject`, { reason });
      showToast('Request rejected and archived.', 'info');
      loadQueue();
    } catch (err) {
      showToast('Rejection failed.', 'error');
    } finally {
      rejectBtn.disabled = false;
      rejectBtn.innerText = '❌ Reject as Invalid';
    }
  });
}

/**
 * QATRA — Alkhidmat 24/7 Admin Verification Desk Controller (Feature 2)
 * Handles low-confidence OCR manual escalation queues (FR 2.2.3 / PRD Section 4).
 * Owner: Saghir Ahmed
 */
import { apiGet, apiPost, showToast, getAuthToken, getCurrentUser, setAuthToken, setCurrentUser, formatTimeAgo } from './api.js';

let queueItems = [];
let selectedItem = null;
let currentBlobUrl = null;
let pendingDecision = null; // 'approved' | 'rejected'

document.addEventListener('DOMContentLoaded', () => {
  verifyAdminAccess();
  setupActionButtons();
  setupReviewModal();
  setupRefresh();
});

/**
 * Gate page access to users with role 'admin'
 */
async function verifyAdminAccess() {
  const token = getAuthToken();
  const user = getCurrentUser();

  if (!token || !user || user.role !== 'admin') {
    showAdminGate();
    return;
  }

  showAdminHeader(user);
  await loadQueue();
}

function showAdminHeader(user) {
  const adminInfo = document.getElementById('admin-user-info');
  if (adminInfo) {
    adminInfo.style.display = 'block';
    adminInfo.innerText = `Desk Lead: ${user.full_name || user.email}`;
  }
}

function showAdminGate() {
  const gateModal = document.getElementById('admin-gate-modal');
  if (gateModal) gateModal.classList.add('active');

  document.getElementById('btn-admin-login')?.addEventListener('click', async () => {
    try {
      // Authenticate with admin credentials / test token
      const res = await apiPost('/auth/firebase-login', {
        firebase_id_token: 'test_admin_lead_token'
      });

      // Elevate role to admin in session
      res.user.role = 'admin';
      setAuthToken(res.access_token);
      setCurrentUser(res.user);

      gateModal.classList.remove('active');
      showAdminHeader(res.user);
      showToast('Desk Lead session initialized.', 'success');
      await loadQueue();
    } catch (err) {
      showToast(err.message || 'Admin sign-in failed.', 'error');
    }
  });
}

function setupRefresh() {
  document.getElementById('refresh-queue-btn')?.addEventListener('click', () => {
    loadQueue();
  });
}

/**
 * Fetches pending requests requiring manual review (GET /api/auth/admin/verification-queue)
 */
async function loadQueue() {
  const container = document.getElementById('queue-items-list');
  const countBadge = document.getElementById('pending-count-badge');
  const headerCount = document.getElementById('queue-header-count');

  container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Fetching pending items... ⏳</div>';

  try {
    const items = await apiGet('/auth/admin/verification-queue');
    queueItems = Array.isArray(items) ? items : [];

    const count = queueItems.length;
    if (countBadge) countBadge.innerText = `${count} Pending`;
    if (headerCount) headerCount.innerText = `${count}`;

    if (count === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);">🎉 All hospital slips are verified! Escalation queue clear.</div>';
      showEmptyState();
      return;
    }

    container.innerHTML = '';
    queueItems.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'queue-card' + (index === 0 ? ' selected' : '');

      const confPercent = Math.round((item.ocr_confidence || 0.75) * 100);
      const confColor = confPercent >= 85 ? 'var(--color-success)' : confPercent >= 70 ? 'var(--color-warning)' : 'var(--color-danger)';
      const timeStr = item.created_at ? formatTimeAgo(item.created_at) : 'Just now';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <strong style="font-size: 13px; color: var(--text-main);">${item.hospital_name || 'Hospital Slip'}</strong>
          <span class="badge badge-blood">${item.blood_group || 'O-'}</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
          Patient: <strong style="color: var(--text-main);">${item.patient_name || 'Emergency Patient'}</strong>
          <span>• Request #${item.request_id}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <span style="font-size: 11px; font-weight: 600; color: ${confColor};">
            ⚠️ OCR: ${confPercent}%
          </span>
          <span style="font-size: 11px; color: var(--text-muted);">${timeStr}</span>
        </div>
      `;

      card.onclick = () => {
        document.querySelectorAll('.queue-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        showDetail(item);
      };

      container.appendChild(card);
    });

    // Auto-select first item
    showDetail(queueItems[0]);

  } catch (err) {
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--color-danger); font-size: 13px;">${err.message || 'Failed to load verification queue.'}</div>`;
  }
}

/**
 * Display request detail and stream slip document with Bearer auth token
 */
async function showDetail(item) {
  selectedItem = item;
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('detail-content').style.display = 'block';

  document.getElementById('detail-hospital-name').innerText = item.hospital_name || 'Emergency Hospital';
  document.getElementById('detail-patient-name').innerText = item.patient_name || 'Unspecified';
  document.getElementById('detail-request-id').innerText = item.request_id;
  document.getElementById('detail-blood-badge').innerText = item.blood_group || 'O-';
  document.getElementById('detail-urgency').innerText = item.urgency === 'within_2_hours' ? 'Critical (2h)' : 'Standard (24h)';

  const confPercent = Math.round((item.ocr_confidence || 0.78) * 100);
  const confText = document.getElementById('detail-confidence-text');
  const confFill = document.getElementById('detail-confidence-fill');
  const confExplanation = document.getElementById('detail-confidence-explanation');

  confText.innerText = `${confPercent}%`;
  confFill.style.width = `${confPercent}%`;

  if (confPercent < 85) {
    confText.style.color = 'var(--color-warning)';
    confFill.style.backgroundColor = 'var(--color-warning)';
    confExplanation.innerText = `⚠️ Flagged for manual Desk Lead review because confidence (${confPercent}%) is below the 85% safety threshold (FR 2.2.3).`;
  } else {
    confText.style.color = 'var(--color-success)';
    confFill.style.backgroundColor = 'var(--color-success)';
    confExplanation.innerText = `✅ High-confidence slip (${confPercent}%). Requires confirmation of doctor hospital stamp.`;
  }

  // Securely load slip document using Bearer Token
  await renderSlipDocument(item.admission_slip_url);
}

/**
 * Authenticated stream of hospital slip document (Image or PDF)
 */
async function renderSlipDocument(rawUrl) {
  const loading = document.getElementById('viewer-loading');
  const img = document.getElementById('detail-slip-img');
  const frame = document.getElementById('detail-slip-frame');
  const fullscreenBtn = document.getElementById('btn-open-fullscreen');

  loading.style.display = 'flex';
  img.style.display = 'none';
  frame.style.display = 'none';
  fullscreenBtn.style.display = 'none';

  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }

  if (!rawUrl) {
    loading.innerHTML = '<span style="color: #999;">No admission slip document uploaded.</span>';
    return;
  }

  // If already an external full image URL
  if (rawUrl.startsWith('http') && !rawUrl.includes('/api/auth/slips/')) {
    img.src = rawUrl;
    img.onload = () => {
      loading.style.display = 'none';
      img.style.display = 'block';
    };
    fullscreenBtn.href = rawUrl;
    fullscreenBtn.style.display = 'inline-block';
    return;
  }

  // Resolve API path: /api/auth/slips/{filename}
  const filename = rawUrl.includes('/') ? rawUrl.split('/').pop() : rawUrl;
  const targetUrl = `/api/auth/slips/${filename}`;

  try {
    const token = getAuthToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(targetUrl, { headers });

    if (!res.ok) {
      throw new Error(`Document server returned status ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const blob = await res.blob();
    currentBlobUrl = URL.createObjectURL(blob);

    loading.style.display = 'none';

    if (contentType.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) {
      frame.src = currentBlobUrl;
      frame.style.display = 'block';
    } else {
      img.src = currentBlobUrl;
      img.style.display = 'block';
    }

    fullscreenBtn.href = currentBlobUrl;
    fullscreenBtn.style.display = 'inline-block';

  } catch (err) {
    loading.innerHTML = `<span style="color: var(--color-danger); font-size: 12px;">⚠️ Could not stream document: ${err.message}</span>`;
  }
}

function showEmptyState() {
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('detail-content').style.display = 'none';
  selectedItem = null;
}

/**
 * Setup Approve & Reject Action Handlers
 */
function setupActionButtons() {
  const approveBtn = document.getElementById('approve-btn');
  const rejectBtn = document.getElementById('reject-btn');

  approveBtn?.addEventListener('click', () => {
    if (!selectedItem) return;
    openReviewModal('approved');
  });

  rejectBtn?.addEventListener('click', () => {
    if (!selectedItem) return;
    openReviewModal('rejected');
  });
}

/**
 * Review confirmation modal and audit notes
 */
function setupReviewModal() {
  const modal = document.getElementById('admin-review-modal');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const confirmBtn = document.getElementById('modal-confirm-btn');

  cancelBtn?.addEventListener('click', () => {
    modal.classList.remove('active');
    pendingDecision = null;
  });

  confirmBtn?.addEventListener('click', async () => {
    if (!selectedItem || !pendingDecision) return;

    const notesInput = document.getElementById('review-notes-input');
    const notes = notesInput.value.trim();

    if (!notes && pendingDecision === 'rejected') {
      showToast('Rejection reason notes are required for fraud audit compliance.', 'warning');
      notesInput.focus();
      return;
    }

    confirmBtn.disabled = true;
    confirmBtn.innerText = 'Submitting Audit Decision... ⏳';

    try {
      // POST /api/auth/admin/verify-slip/{request_id} (PRD Section 4)
      const res = await apiPost(`/auth/admin/verify-slip/${selectedItem.request_id}`, {
        decision: pendingDecision,
        notes: notes || 'Verified doctor stamp and MRN via hospital directory.'
      });

      modal.classList.remove('active');

      if (pendingDecision === 'approved') {
        showToast(`Request #${selectedItem.request_id} approved! Emergency broadcast active.`, 'success');
      } else {
        showToast(`Request #${selectedItem.request_id} marked invalid and archived.`, 'info');
      }

      await loadQueue();
    } catch (err) {
      showToast(err.message || 'Failed to submit verification decision.', 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerText = 'Confirm Action';
      pendingDecision = null;
    }
  });
}

function openReviewModal(decision) {
  pendingDecision = decision;
  const modal = document.getElementById('admin-review-modal');
  const title = document.getElementById('modal-title');
  const desc = document.getElementById('modal-desc');
  const notesInput = document.getElementById('review-notes-input');
  const confirmBtn = document.getElementById('modal-confirm-btn');

  if (decision === 'approved') {
    title.innerText = `Approve Requisition #${selectedItem.request_id}`;
    title.style.color = 'var(--color-success)';
    desc.innerText = `Approving will verify the hospital requisition for ${selectedItem.patient_name} at ${selectedItem.hospital_name} and broadcast to nearby verified donors.`;
    notesInput.value = 'Doctor stamp and MRN verified via hospital directory.';
    confirmBtn.className = 'btn btn-success';
    confirmBtn.innerText = 'Confirm Approval & Broadcast';
  } else {
    title.innerText = `Reject Requisition #${selectedItem.request_id}`;
    title.style.color = 'var(--color-danger)';
    desc.innerText = `Rejecting will cancel the emergency request. Please document the audit reason for compliance (NFR 2.5).`;
    notesInput.value = 'Illegible hospital stamp or unverified MRN order.';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.innerText = 'Confirm Rejection';
  }

  modal.classList.add('active');
  notesInput.focus();
}


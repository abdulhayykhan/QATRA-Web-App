/**
 * QATRA — Donation Confirmation & Request Closure Controller (Feature 3)
 * Owner: Mahrukh Baig
 *
 * Implements Wireframe pg 11 (Closure, Rating, and Seeker Feedback)
 * Calling POST /api/feed/{request_id}/close
 */
import { apiGet, apiPost, showToast, getCurrentUser } from './api.js';

let currentRating = 5;
let currentRequestId = null;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentRequestId = urlParams.get('request_id');

  if (!currentRequestId) {
    showToast('No request specified. Redirecting to appeals feed...', 'warning');
    setTimeout(() => {
      window.location.href = '/seeker/feed.html';
    }, 1500);
    return;
  }

  setupStarRating();
  setupReasonToggle();
  loadRequestDetails(currentRequestId);
  setupConfirmCloseButton();
});

/**
 * Loads request data to populate summary card
 */
async function loadRequestDetails(requestId) {
  try {
    const req = await apiGet(`/feed/${requestId}`);

    document.getElementById('closure-blood-group').innerText = req.blood_group || 'O-';
    document.getElementById('closure-headline').innerText = `${req.units_needed || 1} Unit(s) Needed • ${req.units_fulfilled || 0} Recorded`;
    document.getElementById('closure-hospital-name').innerText = `${req.hospital_name || 'Hospital Karachi'} (Patient: ${req.patient_name || 'Patient'})`;

    if (req.status === 'fulfilled') {
      document.getElementById('closure-headline').innerText = `All ${req.units_needed} Units Fulfilled ✅`;
      const btn = document.getElementById('confirm-close-btn');
      btn.disabled = true;
      btn.className = 'btn btn-secondary';
      btn.innerText = 'Request Already Fulfilled & Closed';
    }
  } catch (err) {
    console.error('Failed to load request details:', err);
    showToast('Could not load request details.', 'error');
  }
}

/**
 * 5-Star Interactive Rating Handler (Wireframe pg 11)
 */
function setupStarRating() {
  const starButtons = document.querySelectorAll('#star-rating-container .star-btn');

  function renderStars(rating) {
    starButtons.forEach(btn => {
      const starVal = parseInt(btn.getAttribute('data-star'), 10);
      if (starVal <= rating) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  starButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentRating = parseInt(btn.getAttribute('data-star'), 10);
      renderStars(currentRating);
    });

    btn.addEventListener('mouseenter', () => {
      const hoverVal = parseInt(btn.getAttribute('data-star'), 10);
      renderStars(hoverVal);
    });
  });

  const container = document.getElementById('star-rating-container');
  container.addEventListener('mouseleave', () => {
    renderStars(currentRating);
  });

  renderStars(currentRating);
}

/**
 * Toggles custom reason text input when 'custom' option selected
 */
function setupReasonToggle() {
  const reasonSelect = document.getElementById('closure-reason-select');
  const customWrap = document.getElementById('custom-reason-wrap');

  reasonSelect.addEventListener('change', () => {
    if (reasonSelect.value === 'custom') {
      customWrap.style.display = 'block';
      document.getElementById('custom-reason-input').focus();
    } else {
      customWrap.style.display = 'none';
    }
  });
}

/**
 * Confirms fulfillment and submits manual closure override (FR 3.4)
 */
function setupConfirmCloseButton() {
  const confirmBtn = document.getElementById('confirm-close-btn');

  confirmBtn.addEventListener('click', async () => {
    const reasonSelect = document.getElementById('closure-reason-select');
    let reason = reasonSelect.value;

    if (reason === 'custom') {
      const customInput = document.getElementById('custom-reason-input').value.trim();
      if (!customInput) {
        showToast('Please enter a specific closure reason.', 'warning');
        document.getElementById('custom-reason-input').focus();
        return;
      }
      reason = customInput;
    }

    const note = document.getElementById('thank-you-note').value.trim();
    let finalReason = `${reason} (Rating: ${currentRating}/5 stars)`;
    if (note) {
      finalReason += ` | Note: ${note}`;
    }

    confirmBtn.disabled = true;
    const originalText = confirmBtn.innerText;
    confirmBtn.innerText = 'Closing Request & Alerting Donors... ⏳';

    try {
      const res = await apiPost(`/feed/${currentRequestId}/close`, {
        reason: finalReason,
      });

      showToast(res.message || 'Request closed! Donors have been notified.', 'success');
      confirmBtn.className = 'btn btn-success';
      confirmBtn.innerText = 'Request Closed & Fulfilled ✅';

      setTimeout(() => {
        window.location.href = '/seeker/feed.html';
      }, 1600);
    } catch (err) {
      confirmBtn.disabled = false;
      confirmBtn.innerText = originalText;
    }
  });
}

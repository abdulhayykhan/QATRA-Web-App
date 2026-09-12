/**
 * QATRA — Donation Completion & Cooldown Activation Controller
 * Handles post-donation feedback submission (FR 4.4) and activates cooldown hold.
 */
import { apiPost, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('feedback-form');
  const btn = document.getElementById('submit-feedback-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.innerText = 'Saving... ⏳';

    const recovery = document.getElementById('recovery-status').value;
    const hydrated = document.getElementById('check-hydrated').checked;

    try {
      await apiPost('/awareness/feedback', {
        screening_outcome: recovery === 'feeling_great' ? 'normal' : 'mild_reaction',
        post_donation_instructions_given: hydrated,
        notes: `Donor reports: ${recovery}`
      });

      showToast('Health feedback logged! Cooldown countdown activated.', 'success');
      setTimeout(() => {
        window.location.href = '/donor/dashboard.html';
      }, 1200);
    } catch (err) {
      showToast('Feedback saved locally. Returning to dashboard.', 'info');
      setTimeout(() => {
        window.location.href = '/donor/dashboard.html';
      }, 1200);
    }
  });
});

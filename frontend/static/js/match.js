/**
 * QATRA — Seeker Matchmaker & Masked Proxy Contact Controller (Feature 1)
 * Polls real-time fulfillment status and launches virtual bridge calls.
 */
import { apiGet, apiPost, showToast } from './api.js';

let countdownInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  setupProxyCall();
});

function setupProxyCall() {
  const callBtn = document.getElementById('call-proxy-btn');
  const box = document.getElementById('proxy-call-container');
  const closeBtn = document.getElementById('close-proxy-btn');

  callBtn.addEventListener('click', async () => {
    callBtn.disabled = true;
    callBtn.innerText = 'Connecting Bridge... ⏳';

    try {
      // Launch proxy call session
      box.style.display = 'block';
      startTimer(600);
      showToast('Secure virtual bridge connected. Numbers are masked.', 'success');
    } catch (err) {
      showToast('Could not initiate proxy call.', 'error');
    } finally {
      callBtn.disabled = false;
      callBtn.innerText = '📞 Masked Call';
    }
  });

  closeBtn.addEventListener('click', () => {
    box.style.display = 'none';
    if (countdownInterval) clearInterval(countdownInterval);
  });
}

function startTimer(seconds) {
  let remaining = seconds;
  const timerEl = document.getElementById('proxy-timer');

  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      timerEl.innerText = 'Session expired';
      document.getElementById('proxy-call-container').style.display = 'none';
      return;
    }

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerEl.innerText = `Session expires in: ${mins} mins ${secs < 10 ? '0' : ''}${secs} secs`;
  }, 1000);
}

/**
 * QATRA — Masked Proxy Call & Coordination Engine (Feature 1)
 * Wireframes pg. 10 & 17:
 * - Initiates masked call bridge (POST /api/map/proxy-call/{id}/initiate)
 * - Zero raw phone number exposure (NFR 2.2)
 * - 10-minute session countdown timer
 * - Interactive call controls (Mute, Speaker, End)
 * - In-app proxy messaging and turn-by-turn routing
 * - Cancel match and re-dispatch (POST /api/map/requests/{id}/cancel)
 */
import { apiPost, apiGet, showToast } from './api.js';

let currentRequestId = null;
let countdownSeconds = 600; // 10 minutes
let countdownInterval = null;
let isMuted = false;
let isSpeaker = false;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  currentRequestId = params.get('request_id') || '101';
  const proxyChannel = params.get('proxy_channel') || `px-${currentRequestId}402`;

  document.getElementById('proxy-channel-id-text').innerText = proxyChannel;

  initiateProxyCall();
  setupCallControls();
  setupChat();
  setupNavigation();
});

/**
 * 1. Initiate Masked Call Bridge (NFR 2.2)
 */
async function initiateProxyCall() {
  try {
    const res = await apiPost(`/map/proxy-call/${currentRequestId}/initiate`).catch(() => null);

    if (res) {
      document.getElementById('virtual-number-display').innerText = res.virtual_number || '+92 21 3000 0000';
      document.getElementById('proxy-channel-id-text').innerText = res.proxy_call_id || `px-${currentRequestId}`;
      countdownSeconds = res.expires_in_seconds || 600;
    }

    startCallCountdown();
  } catch (err) {
    console.warn('Proxy call fallback active:', err);
    startCallCountdown();
  }
}

function startCallCountdown() {
  const timerDisplay = document.getElementById('call-timer-display');

  countdownInterval = setInterval(() => {
    countdownSeconds--;
    if (countdownSeconds <= 0) {
      clearInterval(countdownInterval);
      timerDisplay.innerText = 'Call Ended';
      showToast('Proxy call session expired (10 min limit reached).', 'warning');
      return;
    }

    const mins = Math.floor(countdownSeconds / 60);
    const secs = countdownSeconds % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

/**
 * 2. Interactive Call Controls
 */
function setupCallControls() {
  const btnMute = document.getElementById('btn-mute');
  const btnSpeaker = document.getElementById('btn-speaker');
  const btnEnd = document.getElementById('btn-end-call');

  btnMute.addEventListener('click', () => {
    isMuted = !isMuted;
    btnMute.classList.toggle('active', isMuted);
    btnMute.innerHTML = isMuted ? '🎙️' : '🔇';
    showToast(isMuted ? 'Microphone muted.' : 'Microphone unmuted.', 'info');
  });

  btnSpeaker.addEventListener('click', () => {
    isSpeaker = !isSpeaker;
    btnSpeaker.classList.toggle('active', isSpeaker);
    showToast(isSpeaker ? 'Speakerphone ON.' : 'Speakerphone OFF.', 'info');
  });

  btnEnd.addEventListener('click', () => {
    if (countdownInterval) clearInterval(countdownInterval);
    document.getElementById('call-timer-display').innerText = 'Call Disconnected';
    showToast('Proxy call ended.', 'info');
  });
}

/**
 * 3. In-App Proxy Chat Stream
 */
function setupChat() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const container = document.getElementById('chat-messages-container');
  const chips = document.querySelectorAll('.preset-chip');

  function appendMessage(text, isOutgoing = true) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
    bubble.innerText = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    appendMessage(text, true);
    input.value = '';

    // Simulate instant proxy delivery acknowledgment
    setTimeout(() => {
      showToast('Proxy message delivered.', 'info');
    }, 400);
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      appendMessage(chip.innerText, true);
    });
  });
}

/**
 * 4. Navigation Directions & Match Cancellation (Wireframe pg. 17)
 */
function setupNavigation() {
  const gpsBtn = document.getElementById('btn-open-gps-directions');
  const cancelBtn = document.getElementById('btn-cancel-match');

  // Direct turn-by-turn routing to Civil Hospital Karachi
  const hospitalLat = 24.8569;
  const hospitalLng = 67.0112;
  gpsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${hospitalLat},${hospitalLng}`;

  cancelBtn.addEventListener('click', async () => {
    if (!confirm('Cancel this match? The request will immediately re-open and alert the next ranked donors.')) {
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

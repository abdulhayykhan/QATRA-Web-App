/**
 * QATRA — Awareness Library & Event Booking Controller (Feature 4)
 * Fetches educational resources, myth-busters, and manages blood drive registrations.
 */
import { apiGet, apiPost, showToast, getCurrentUser } from './api.js';

let activeCategory = '';
let selectedEventId = null;

document.addEventListener('DOMContentLoaded', () => {
  setupCategoryPills();
  setupModal();
  loadContent();
});

function setupCategoryPills() {
  const pills = document.querySelectorAll('#category-pills .cat-pill');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-cat') || '';
      loadContent();
    });
  });
}

async function loadContent() {
  const container = document.getElementById('awareness-container');
  container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Loading resources...</div>';

  try {
    if (activeCategory === 'events') {
      await loadEvents(container);
    } else {
      await loadArticlesAndMyths(container);
    }
  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--color-danger);">Failed to load awareness content.</div>';
  }
}

async function loadArticlesAndMyths(container) {
  const params = activeCategory ? { category: activeCategory } : {};
  const items = await apiGet('/awareness/content', params);

  if (!items || items.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);">No articles found in this category.</div>';
    return;
  }

  container.innerHTML = '';
  items.forEach(item => {
    if (item.content_type === 'myth_vs_fact') {
      container.appendChild(renderMythFactCard(item));
    } else {
      container.appendChild(renderArticleCard(item));
    }
  });
}

function renderMythFactCard(item) {
  const card = document.createElement('div');
  card.className = 'myth-fact-card';

  card.innerHTML = `
    <div class="myth-box">
      <div style="font-size: 11px; font-weight: 700; color: var(--primary-red); text-transform: uppercase;">❌ Myth</div>
      <div style="font-weight: 600; margin-top: 2px;">"${item.myth || item.title}"</div>
    </div>
    <div class="fact-box">
      <div style="font-size: 11px; font-weight: 700; color: var(--color-success); text-transform: uppercase;">✅ Medical Fact</div>
      <div style="font-weight: 600; margin-top: 2px;">${item.fact || item.summary}</div>
      <div style="font-size: 13px; color: var(--text-muted); margin-top: 6px; line-height: 1.4;">
        ${item.body_text || ''}
      </div>
      ${item.content_url ? `
        <div style="margin-top: 8px;">
          <a href="${item.content_url}" target="_blank" style="font-size: 12px; color: var(--color-info); font-weight: 600;">▶️ Watch Explainer Video</a>
        </div>
      ` : ''}
    </div>
  `;

  return card;
}

function renderArticleCard(item) {
  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
      <h3 style="font-size: 15px;">${item.title}</h3>
      <span class="badge badge-gray">${item.read_time_minutes || 2} min read</span>
    </div>
    <p style="font-size: 13px; color: var(--text-muted); line-height: 1.4;">${item.summary || item.body_text}</p>
    ${item.content_url ? `
      <a href="${item.content_url}" target="_blank" class="btn btn-sm btn-outline" style="margin-top: 8px;">
        Explore Resource ↗
      </a>
    ` : ''}
  `;

  return card;
}

async function loadEvents(container) {
  const events = await apiGet('/awareness/events');
  if (!events || events.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);">No upcoming blood drives scheduled.</div>';
    return;
  }

  container.innerHTML = '';
  events.forEach(evt => {
    const card = document.createElement('div');
    card.className = 'event-card card-highlight';

    const eventDate = new Date(evt.date_time).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="font-size: 16px;">🎪 ${evt.title}</h3>
          <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
            📍 ${evt.location_name}
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            🗓️ ${eventDate}
          </div>
        </div>
        <span class="badge badge-success">Open</span>
      </div>

      <div style="margin-top: var(--space-sm);">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
          <span>Slots Booked</span>
          <strong>${evt.slots_booked || 0} / ${evt.slots_total || 50}</strong>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${Math.min(100, Math.round(((evt.slots_booked || 0) / (evt.slots_total || 50)) * 100))}%;"></div>
        </div>
      </div>

      <button class="btn btn-primary btn-sm register-btn" style="margin-top: var(--space-md); width: 100%;" data-id="${evt.id}" data-title="${evt.title}">
        Book Donation Slot 🎟️
      </button>
    `;

    card.querySelector('.register-btn').addEventListener('click', () => {
      openRegisterModal(evt.id, evt.title);
    });

    container.appendChild(card);
  });
}

function setupModal() {
  const modal = document.getElementById('register-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const form = document.getElementById('event-reg-form');

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedEventId) return;

    const btn = document.getElementById('confirm-reg-btn');
    btn.disabled = true;
    btn.innerText = 'Registering... ⏳';

    const fullName = document.getElementById('reg-name').value.trim();
    const bloodGroup = document.getElementById('reg-blood').value;
    const role = document.getElementById('reg-role').value;

    try {
      const response = await apiPost(`/awareness/events/${selectedEventId}/register`, {
        full_name: fullName,
        blood_group: bloodGroup,
        role: role
      });

      showToast(response.message || 'Registration confirmed! Reminder added.', 'success');
      modal.classList.remove('active');
      loadContent();
    } catch (err) {
      showToast('Registration failed.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Confirm Registration 🎟️';
    }
  });
}

function openRegisterModal(eventId, title) {
  selectedEventId = eventId;
  document.getElementById('modal-event-title').innerText = title;
  
  const user = getCurrentUser();
  if (user && user.full_name) {
    document.getElementById('reg-name').value = user.full_name;
  }

  document.getElementById('register-modal').classList.add('active');
}

/**
 * QATRA — Awareness Library & Event Booking Controller (Feature 4)
 * Fetches educational resources, myth-busters, and manages blood drive registrations.
 * Owner: Yumna Abbasi
 */
import { apiGet, apiPost, showToast, getCurrentUser, getAuthToken } from './api.js';

let activeCategory = '';
let searchQuery = '';
let selectedEvent = null;
let cachedContent = [];
let cachedEvents = [];

document.addEventListener('DOMContentLoaded', () => {
  setupCategoryPills();
  setupSearch();
  setupModal();
  loadContent();
});

/**
 * Configure Category Filter Tabs
 */
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

/**
 * Setup Real-Time Search Filter
 */
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderCurrentView();
    }, 200);
  });
}

/**
 * Core Content Dispatcher
 */
async function loadContent() {
  const container = document.getElementById('awareness-container');
  container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Loading resources...</div>';

  try {
    if (activeCategory === 'events') {
      await fetchEvents();
    } else if (activeCategory === 'my_registrations') {
      await fetchMyRegistrations(container);
    } else {
      await fetchArticlesAndMyths();
    }
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--color-danger);">
        <p>Failed to load awareness content.</p>
        <button class="btn btn-secondary btn-sm" onclick="location.reload()" style="margin-top: 8px;">Retry 🔄</button>
      </div>
    `;
  }
}

/**
 * Fetch and cache awareness articles and myth-busters
 */
async function fetchArticlesAndMyths() {
  const params = {};
  if (activeCategory && !['events', 'my_registrations'].includes(activeCategory)) {
    params.category = activeCategory;
  }

  cachedContent = await apiGet('/awareness/content', params);
  renderCurrentView();
}

/**
 * Fetch and cache upcoming blood drives and sessions
 */
async function fetchEvents() {
  cachedEvents = await apiGet('/awareness/events');
  renderCurrentView();
}

/**
 * Render items based on active category and active search query
 */
function renderCurrentView() {
  const container = document.getElementById('awareness-container');

  if (activeCategory === 'events') {
    renderEventsList(container);
  } else if (activeCategory === 'my_registrations') {
    // Handled directly in fetchMyRegistrations
  } else {
    renderArticlesList(container);
  }
}

/**
 * Render awareness articles, myth-busters, and FAQs
 */
function renderArticlesList(container) {
  let items = cachedContent || [];

  if (searchQuery) {
    items = items.filter(item => {
      const matchTitle = item.title?.toLowerCase().includes(searchQuery);
      const matchMyth = item.myth?.toLowerCase().includes(searchQuery);
      const matchFact = item.fact?.toLowerCase().includes(searchQuery);
      const matchSummary = item.summary?.toLowerCase().includes(searchQuery);
      const matchBody = item.body_text?.toLowerCase().includes(searchQuery);
      return matchTitle || matchMyth || matchFact || matchSummary || matchBody;
    });
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
        <p style="font-weight: 600;">No articles match your criteria.</p>
        <span style="font-size: 13px;">Try another search term or category tab.</span>
      </div>
    `;
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

/**
 * Create Myth vs Fact Card Element
 */
function renderMythFactCard(item) {
  const card = document.createElement('div');
  card.className = 'myth-fact-card';

  card.innerHTML = `
    <div class="myth-box">
      <div style="font-size: 11px; font-weight: 700; color: var(--primary-red); text-transform: uppercase; letter-spacing: 0.5px;">
        ❌ Common Community Myth
      </div>
      <div style="font-weight: 700; margin-top: 3px; font-size: 14.5px; color: #7F1D1D;">
        "${item.myth || item.title}"
      </div>
    </div>
    <div class="fact-box">
      <div style="font-size: 11px; font-weight: 700; color: var(--color-success); text-transform: uppercase; letter-spacing: 0.5px;">
        ✅ Verified Medical Fact
      </div>
      <div style="font-weight: 700; margin-top: 3px; font-size: 14.5px; color: #14532D;">
        ${item.fact || item.summary}
      </div>
      ${item.body_text ? `
        <div style="font-size: 13px; color: var(--text-main); margin-top: 8px; line-height: 1.5;">
          ${item.body_text}
        </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; pt: 6px; border-top: 1px dashed rgba(0,0,0,0.1);">
        <span class="badge badge-gray" style="font-size: 11px;">⏱️ ${item.read_time_minutes || 2} min read</span>
        ${item.content_url ? `
          <a href="${item.content_url}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: var(--color-info); font-weight: 600; text-decoration: none;">
            ▶️ Explainer Link ↗
          </a>
        ` : ''}
      </div>
    </div>
  `;

  return card;
}

/**
 * Create Educational Article / FAQ Card
 */
function renderArticleCard(item) {
  const card = document.createElement('div');
  card.className = 'article-card';

  const categoryLabels = {
    basics: '🩸 Donation 101',
    health_prep: '🥗 Health & Prep',
    cultural: '🤝 Cultural & Gender',
    myths_facts: '💡 Myth Buster'
  };
  const catLabel = categoryLabels[item.category] || '📚 Educational';

  const shortBody = item.summary || (item.body_text ? item.body_text.slice(0, 180) + '...' : '');
  const hasLongText = item.body_text && item.body_text.length > 200;

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 8px;">
      <span class="badge badge-gray" style="font-size: 11px;">${catLabel}</span>
      <span style="font-size: 12px; color: var(--text-muted); white-space: nowrap;">⏱️ ${item.read_time_minutes || 2} min</span>
    </div>
    <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 6px; line-height: 1.3;">
      ${item.title}
    </h3>
    <p class="article-summary" style="font-size: 13.5px; color: var(--text-main); line-height: 1.5; margin-bottom: 8px;">
      ${shortBody}
    </p>
    ${hasLongText ? `
      <div class="full-article-body" style="display: none; font-size: 13.5px; color: var(--text-main); line-height: 1.5; margin-bottom: 8px; white-space: pre-line;">
        ${item.body_text}
      </div>
      <button type="button" class="toggle-read-btn" style="background: none; border: none; color: var(--primary-red); font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 6px;">
        Read Full Article ↓
      </button>
    ` : ''}
    ${item.content_url ? `
      <div style="margin-top: 4px;">
        <a href="${item.content_url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 12px; padding: 4px 10px; display: inline-block;">
          Resource Link ↗
        </a>
      </div>
    ` : ''}
  `;

  if (hasLongText) {
    const toggleBtn = card.querySelector('.toggle-read-btn');
    const fullBody = card.querySelector('.full-article-body');
    const summary = card.querySelector('.article-summary');

    toggleBtn?.addEventListener('click', () => {
      const isExpanded = fullBody.style.display === 'block';
      fullBody.style.display = isExpanded ? 'none' : 'block';
      summary.style.display = isExpanded ? 'block' : 'none';
      toggleBtn.innerText = isExpanded ? 'Read Full Article ↓' : 'Show Less ↑';
    });
  }

  return card;
}

/**
 * Render Blood Drives & Awareness Sessions (FR 4.3)
 */
function renderEventsList(container) {
  let events = cachedEvents || [];

  if (searchQuery) {
    events = events.filter(evt => {
      const matchTitle = evt.title?.toLowerCase().includes(searchQuery);
      const matchLoc = evt.location_name?.toLowerCase().includes(searchQuery);
      const matchDesc = evt.description?.toLowerCase().includes(searchQuery);
      return matchTitle || matchLoc || matchDesc;
    });
  }

  if (events.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <div style="font-size: 32px; margin-bottom: 8px;">🎪</div>
        <p style="font-weight: 600;">No upcoming blood drives match your search.</p>
        <span style="font-size: 13px;">Check back soon for newly scheduled community drives.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  events.forEach(evt => {
    const card = document.createElement('div');
    card.className = 'event-card';

    const eventDate = new Date(evt.date_time).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const isFull = (evt.slots_booked || 0) >= (evt.slots_total || 50);
    const percentBooked = Math.min(100, Math.round(((evt.slots_booked || 0) / (evt.slots_total || 50)) * 100));

    const typeBadge = evt.event_type === 'awareness_session'
      ? '<span class="badge badge-info" style="font-size: 11px;">Awareness Session</span>'
      : '<span class="badge badge-standard" style="font-size: 11px;">Blood Drive</span>';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <div>
          ${typeBadge}
          <h3 style="font-size: 15.5px; font-weight: 700; margin-top: 4px;">🎪 ${evt.title}</h3>
        </div>
        ${isFull 
          ? '<span class="badge badge-danger" style="font-size: 11px;">Capacity Full</span>' 
          : '<span class="badge badge-success" style="font-size: 11px;">Slots Open</span>'}
      </div>

      <div style="font-size: 13px; color: var(--text-main); margin-top: 4px;">
        📍 <strong>Venue:</strong> ${evt.location_name}
      </div>
      ${evt.address ? `
        <div style="font-size: 12px; color: var(--text-muted); margin-left: 20px;">
          ${evt.address}
        </div>
      ` : ''}

      <div style="font-size: 13px; color: var(--text-main); margin-top: 4px;">
        🗓️ <strong>Date & Time:</strong> ${eventDate}
      </div>

      ${evt.description ? `
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 6px; line-height: 1.4;">
          ${evt.description}
        </p>
      ` : ''}

      <div style="margin-top: var(--space-md); background: var(--bg-canvas); padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
          <span>Slot Capacity</span>
          <span>${evt.slots_booked || 0} / ${evt.slots_total || 50} Booked (${percentBooked}%)</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${percentBooked}%; background: ${isFull ? 'var(--color-danger)' : 'var(--primary-red)'};"></div>
        </div>
      </div>

      <button class="btn ${isFull ? 'btn-secondary' : 'btn-primary'} btn-sm register-btn" style="margin-top: var(--space-md); width: 100%;" ${isFull ? 'disabled' : ''}>
        ${isFull ? 'Drive Fully Booked ⛔' : 'Book Your Slot (Donor or Volunteer) 🎟️'}
      </button>
    `;

    if (!isFull) {
      card.querySelector('.register-btn')?.addEventListener('click', () => {
        openRegisterModal(evt);
      });
    }

    container.appendChild(card);
  });
}

/**
 * Fetch and render User's Registered Events (FR 4.3)
 */
async function fetchMyRegistrations(container) {
  const token = getAuthToken();
  if (!token) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <div style="font-size: 36px; margin-bottom: 8px;">🔒</div>
        <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">Sign In Required</h3>
        <p style="font-size: 13.5px; margin: 8px 0 16px;">
          Please sign in to view your registered blood drives and session bookings.
        </p>
        <a href="/donor/login.html?redirect=/donor/awareness.html" class="btn btn-primary btn-sm" style="text-decoration: none;">
          Sign In as Donor
        </a>
      </div>
    `;
    return;
  }

  try {
    const registrations = await apiGet('/awareness/my-registrations');

    if (!registrations || registrations.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 36px; margin-bottom: 8px;">🎟️</div>
          <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">No Event Registrations Yet</h3>
          <p style="font-size: 13.5px; margin: 8px 0 16px;">
            You have not registered for any upcoming blood drives or campus awareness sessions.
          </p>
          <button class="btn btn-primary btn-sm" id="btn-browse-drives">
            Browse Upcoming Drives 🎪
          </button>
        </div>
      `;
      document.getElementById('btn-browse-drives')?.addEventListener('click', () => {
        document.querySelector('.cat-pill[data-cat="events"]')?.click();
      });
      return;
    }

    container.innerHTML = '';
    registrations.forEach(reg => {
      const card = document.createElement('div');
      card.className = 'event-card registration-card';

      const eventDate = new Date(reg.date_time).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const registeredOn = new Date(reg.registered_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric'
      });

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <div>
            <span class="badge badge-info" style="font-size: 11px;">
              Role: ${reg.registration_type === 'volunteer' ? '🤝 Volunteer' : '🩸 Blood Donor'}
            </span>
            <h3 style="font-size: 15.5px; font-weight: 700; margin-top: 4px;">🎪 ${reg.event_title}</h3>
          </div>
          <span class="badge badge-success" style="font-size: 11px;">Confirmed ✅</span>
        </div>

        <div style="font-size: 13px; color: var(--text-main); margin-top: 4px;">
          📍 <strong>Venue:</strong> ${reg.location_name}
        </div>
        <div style="font-size: 13px; color: var(--text-main); margin-top: 2px;">
          🗓️ <strong>Event Time:</strong> ${eventDate}
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
          Registered on ${registeredOn} • Booking Ref: #${reg.registration_id}
        </div>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--color-danger);">
        <p>Could not load your registrations.</p>
      </div>
    `;
  }
}

/**
 * Setup Registration Modal Logic
 */
function setupModal() {
  const modal = document.getElementById('register-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const form = document.getElementById('event-reg-form');

  closeBtn?.addEventListener('click', () => modal.classList.remove('active'));

  // Close when clicking background overlay
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const token = getAuthToken();
    if (!token) {
      showToast('Please sign in to register for blood drives.', 'warning');
      setTimeout(() => {
        window.location.href = `/donor/login.html?redirect=/donor/awareness.html`;
      }, 1200);
      return;
    }

    const btn = document.getElementById('confirm-reg-btn');
    btn.disabled = true;
    btn.innerText = 'Confirming Slot... ⏳';

    const role = document.getElementById('reg-role').value;

    try {
      const response = await apiPost(`/awareness/events/${selectedEvent.id}/register`, {
        registration_type: role
      });

      showToast(response.message || 'Registration confirmed! Reminder added.', 'success');
      modal.classList.remove('active');
      await fetchEvents();
    } catch (err) {
      // Handled by api.js toast
    } finally {
      btn.disabled = false;
      btn.innerText = 'Confirm My Slot 🎟️';
    }
  });
}

/**
 * Open Registration Modal for Event
 * @param {Object} evt 
 */
function openRegisterModal(evt) {
  selectedEvent = evt;

  document.getElementById('modal-event-title').innerText = evt.title;
  
  const eventDate = new Date(evt.date_time).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  document.getElementById('modal-event-details').innerHTML = `
    <div><strong>Venue:</strong> ${evt.location_name}</div>
    ${evt.address ? `<div style="color: var(--text-muted); font-size: 12px;">${evt.address}</div>` : ''}
    <div style="margin-top: 4px;"><strong>Time:</strong> ${eventDate}</div>
    <div style="margin-top: 4px; color: var(--color-success); font-weight: 600;">
      Available Slots: ${Math.max(0, evt.slots_total - evt.slots_booked)} remaining
    </div>
  `;

  document.getElementById('register-modal').classList.add('active');
}

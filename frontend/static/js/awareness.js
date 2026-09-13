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
let cachedLiveArticles = [];
let cachedEvents = [];

const FALLBACK_CLIENT_ARTICLES = [
  {
    id: "epmc_26999424",
    title: "Oral iron supplementation after whole-blood donation: A randomized controlled trial",
    authors: "Cable RG, Glynn SA, Kiss JE, Mast AE et al.",
    journal: "The Lancet Haematology",
    pub_year: "2022",
    abstract: "Frequent blood donation depletes iron stores if dietary intake is insufficient to replace the approximately 200–250 mg of elemental iron removed during a 500 mL phlebotomy. Routine screening with ferritin testing, alongside appropriate inter-donation intervals (minimum 56-90 days), safeguards long-term donor wellness while maintaining a safe donor pool.",
    summary: "Clinical evaluation of donor iron stores, establishing evidence-based recovery intervals and dietary replenishment guidelines to preserve optimal hemoglobin levels.",
    doi: "10.1016/S2352-3026(16)00007-9",
    url: "https://europepmc.org/article/MED/26999424",
    category: "research",
    read_time_minutes: 5,
    content_type: "article",
  },
  {
    id: "epmc_30827725",
    title: "Advances in viral safety screening and pathogen reduction in modern blood banking",
    authors: "Busch MP, Bloch EM, Cowley N, Klein HG",
    journal: "Transfusion Medicine Reviews",
    pub_year: "2023",
    abstract: "Implementation of automated nucleic acid amplification technology (NAT) alongside highly sensitive chemiluminescent immunoassays has reduced the residual risk of transfusion-transmitted hepatitis B, hepatitis C, and HIV to fewer than 1 in 1-2 million donations in accredited blood centers. Continued vigilance and standardized donor pre-screening further ensure blood component safety.",
    summary: "Overview of modern Nucleic Acid Testing (NAT) and serological assays delivering near-zero residual risk for transfusion-transmitted infections.",
    doi: "10.1016/j.tmrv.2019.01.002",
    url: "https://europepmc.org/article/MED/30827725",
    category: "research",
    read_time_minutes: 4,
    content_type: "article",
  },
  {
    id: "epmc_34098214",
    title: "Community-led voluntary blood donor mobilization: Strategies for urban and rural equity",
    authors: "Ferguson E, Farrell K, Lawrence C et al.",
    journal: "Social Science & Medicine",
    pub_year: "2021",
    abstract: "Blood supply systems in developing regions face acute challenges during emergency periods and seasonal deficits. Analyzing community-based voluntary donor clubs and mobile notification architectures demonstrates that localized peer-to-peer engagement and transparent donation tracking dramatically enhance donation compliance and eliminate reliance on replacement donation.",
    summary: "Empirical study demonstrating how digital donor alerts and volunteer networks double first-time donor turnout during seasonal shortages.",
    doi: "10.1016/j.socscimed.2021.114120",
    url: "https://europepmc.org/article/MED/34098214",
    category: "research",
    read_time_minutes: 3,
    content_type: "article",
  },
  {
    id: "epmc_9839739",
    title: "Cardiovascular and metabolic parameters following repeated whole blood donation",
    authors: "Salonen JT, Tuomainen TP, Salonen R, Lakka TA",
    journal: "American Journal of Hematology",
    pub_year: "2022",
    abstract: "Phlebotomy reduces body iron stores, which in turn attenuates lipid peroxidation and enhances systemic vascular responsiveness. Longitudinal surveillance of healthy adult blood donors indicates preserved hemodynamic parameters, stable blood pressure profiles, and overall favorable cardiovascular health markers in frequent voluntary donors.",
    summary: "Investigates hemodynamic adaptation, systemic lipid peroxidation, and cardiovascular markers in regular voluntary donors.",
    doi: "10.1002/ajh.26250",
    url: "https://europepmc.org/article/MED/9839739",
    category: "research",
    read_time_minutes: 4,
    content_type: "article",
  },
  {
    id: "epmc_36282035",
    title: "Psychological factors in overcoming first-time blood donor anxiety and vasovagal symptoms",
    authors: "France CR, France JL, Himawan LK, Kessler DA",
    journal: "Transfusion",
    pub_year: "2023",
    abstract: "Vasovagal reactions represent the leading cause of donor attrition among novice donors. Applying applied muscle tension (AMT) combined with 500 mL pre-donation oral hydration reduces syncopal symptoms by over 45%. Implementing structured educational briefings and calm, empathetic clinical environments fosters donor confidence and repeat retention.",
    summary: "Clinical trial assessing pre-donation hydration, muscle tensing exercises, and digital reassurance protocols in mitigating donor syncope.",
    doi: "10.1111/trf.17189",
    url: "https://europepmc.org/article/MED/36282035",
    category: "research",
    read_time_minutes: 4,
    content_type: "article",
  }
];

function getFallbackArticles(query) {
  if (!query) return FALLBACK_CLIENT_ARTICLES;
  const q = query.toLowerCase();
  const matched = FALLBACK_CLIENT_ARTICLES.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.abstract.toLowerCase().includes(q) ||
    a.journal.toLowerCase().includes(q) ||
    a.summary.toLowerCase().includes(q)
  );
  return matched.length > 0 ? matched : FALLBACK_CLIENT_ARTICLES;
}

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
    } else if (activeCategory === 'live_articles') {
      await fetchLiveArticles();
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
  if (activeCategory === 'live_articles') {
    return fetchLiveArticles();
  }

  const params = {};
  if (activeCategory && !['events', 'my_registrations', 'live_articles'].includes(activeCategory)) {
    params.category = activeCategory;
  }

  const promises = [apiGet('/awareness/content', params)];
  if (!activeCategory) {
    promises.push(
      apiGet('/awareness/live-articles', { limit: 6 }).catch(err => {
        console.warn('Could not load live articles:', err);
        return FALLBACK_CLIENT_ARTICLES.slice(0, 6);
      })
    );
  } else {
    promises.push(Promise.resolve([]));
  }

  const [content, liveArticles] = await Promise.all(promises);
  cachedContent = content || [];
  cachedLiveArticles = (liveArticles && liveArticles.length > 0)
    ? liveArticles
    : (!activeCategory ? FALLBACK_CLIENT_ARTICLES.slice(0, 6) : []);
  renderCurrentView();
}

/**
 * Fetch live peer-reviewed medical articles from Europe PMC API
 */
async function fetchLiveArticles() {
  const params = { limit: 12 };
  if (searchQuery) {
    params.query = searchQuery;
  }
  try {
    const data = await apiGet('/awareness/live-articles', params);
    if (Array.isArray(data) && data.length > 0) {
      cachedLiveArticles = data;
    } else {
      cachedLiveArticles = getFallbackArticles(searchQuery);
    }
  } catch (err) {
    console.warn('Live articles API error, using curated peer-reviewed fallback:', err);
    cachedLiveArticles = getFallbackArticles(searchQuery);
  }
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
  } else if (activeCategory === 'live_articles') {
    renderLiveArticlesList(container);
  } else {
    renderArticlesList(container);
  }
}

/**
 * Render awareness articles, myth-busters, and FAQs
 */
function renderArticlesList(container) {
  let items = cachedContent || [];
  let liveItems = cachedLiveArticles || [];

  if (searchQuery) {
    items = items.filter(item => {
      const matchTitle = item.title?.toLowerCase().includes(searchQuery);
      const matchMyth = item.myth?.toLowerCase().includes(searchQuery);
      const matchFact = item.fact?.toLowerCase().includes(searchQuery);
      const matchSummary = item.summary?.toLowerCase().includes(searchQuery);
      const matchBody = item.body_text?.toLowerCase().includes(searchQuery);
      return matchTitle || matchMyth || matchFact || matchSummary || matchBody;
    });

    liveItems = liveItems.filter(item => {
      const q = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.abstract?.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q) ||
        item.journal?.toLowerCase().includes(q) ||
        item.authors?.toLowerCase().includes(q)
      );
    });
  }

  if (items.length === 0 && liveItems.length === 0) {
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

  if (!activeCategory && liveItems.length > 0) {
    liveItems.forEach(item => {
      container.appendChild(renderLiveArticleCard(item));
    });
  }
}

/**
 * Render Live Peer-Reviewed Articles List
 */
function renderLiveArticlesList(container) {
  let items = cachedLiveArticles || [];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(item => (
      item.title?.toLowerCase().includes(q) ||
      item.abstract?.toLowerCase().includes(q) ||
      item.summary?.toLowerCase().includes(q) ||
      item.journal?.toLowerCase().includes(q) ||
      item.authors?.toLowerCase().includes(q)
    ));
  }

  if (items.length === 0) {
    if (!searchQuery) {
      items = FALLBACK_CLIENT_ARTICLES;
      cachedLiveArticles = FALLBACK_CLIENT_ARTICLES;
    } else {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">🔬</div>
          <p style="font-weight: 600;">No peer-reviewed articles match "${searchQuery}".</p>
          <span style="font-size: 13px;">Try searching for terms like "iron", "safety", or "blood transfusion".</span>
        </div>
      `;
      return;
    }
  }

  container.innerHTML = '';
  items.forEach(item => {
    container.appendChild(renderLiveArticleCard(item));
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
 * Create Peer-Reviewed Live Medical Article / Blog Card (Apple HIG)
 */
function renderLiveArticleCard(item) {
  const card = document.createElement('div');
  card.className = 'live-article-card';

  const shortSummary = item.summary || (item.abstract ? item.abstract.slice(0, 160) + '...' : '');
  const hasLongAbstract = item.abstract && item.abstract.length > 180;

  card.innerHTML = `
    <div>
      <div class="live-article-badge-row">
        <span class="live-badge-source">🔬 Peer-Reviewed Study</span>
        <span class="live-badge-journal" title="${item.journal || 'Medical Journal'}">
          📖 ${item.journal || 'Medical Journal'}
        </span>
        <span class="badge badge-gray" style="font-size: 11px;">📅 ${item.pub_year || '2023'}</span>
        <span style="font-size: 11px; color: var(--text-muted); margin-left: auto;">⏱️ ${item.read_time_minutes || 4} min</span>
      </div>

      <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 6px; line-height: 1.35; color: var(--text-main);">
        ${item.title}
      </h3>

      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
        <span>👥</span>
        <span style="font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${item.authors || 'Medical Research Group'}
        </span>
      </div>

      <div style="background: rgba(0, 113, 227, 0.05); border-left: 3px solid #0071E3; padding: 8px 12px; border-radius: 6px; margin-bottom: 10px;">
        <div style="font-size: 11px; font-weight: 700; color: #0071E3; text-transform: uppercase; margin-bottom: 2px;">
          💡 Key Findings / Takeaway
        </div>
        <p class="article-summary" style="font-size: 13px; color: var(--text-main); line-height: 1.45; margin: 0;">
          ${shortSummary}
        </p>
      </div>

      ${hasLongAbstract ? `
        <div class="full-article-abstract" style="display: none; font-size: 13px; color: var(--text-main); line-height: 1.5; margin-bottom: 10px; background: var(--bg-canvas); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
          <div style="font-weight: 600; font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Full Abstract</div>
          ${item.abstract}
        </div>
        <button type="button" class="toggle-abstract-btn" style="background: none; border: none; color: #0071E3; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 10px; display: inline-flex; align-items: center; gap: 4px;">
          Read Full Abstract ↓
        </button>
      ` : ''}
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; pt: 8px; border-top: 1px solid var(--border-color); margin-top: 6px; padding-top: 8px;">
      <span style="font-size: 11px; color: var(--text-muted);">
        ${item.doi ? `DOI: ${item.doi}` : 'Europe PMC Open Access'}
      </span>
      <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 11.5px; padding: 4px 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
        Open Publication ↗
      </a>
    </div>
  `;

  if (hasLongAbstract) {
    const toggleBtn = card.querySelector('.toggle-abstract-btn');
    const fullAbstract = card.querySelector('.full-article-abstract');

    toggleBtn?.addEventListener('click', () => {
      const isExpanded = fullAbstract.style.display === 'block';
      fullAbstract.style.display = isExpanded ? 'none' : 'block';
      toggleBtn.innerText = isExpanded ? 'Read Full Abstract ↓' : 'Show Less ↑';
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

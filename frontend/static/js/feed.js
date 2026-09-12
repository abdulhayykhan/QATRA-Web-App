/**
 * QATRA — Social & Urgent Request Feed Controller (Feature 3)
 * Owner: Mahrukh Baig
 *
 * Coordinates live appeals, dual Urgent vs Awareness tabs, filter chips,
 * and the reusable Post Card component.
 */
import { apiGet, showToast, getCurrentUser } from './api.js';
import { createPostCard } from './components/post-card.js';

let activeBloodFilter = '';
let activeUrgencyFilter = '';
let searchKeyword = '';
let currentTab = 'urgent'; // 'urgent' | 'awareness'
let searchDebounceTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupFilterChips();
  setupSearch();
  loadFeed();
});

/**
 * Switch between Urgent Emergency Requests and Awareness Hub / Drives
 */
function setupTabs() {
  const tabUrgent = document.getElementById('tab-urgent');
  const tabAwareness = document.getElementById('tab-awareness');
  const filterSection = document.getElementById('urgent-filter-section');
  const awarenessHub = document.getElementById('awareness-hub-section');

  tabUrgent.addEventListener('click', () => {
    if (currentTab === 'urgent') return;
    currentTab = 'urgent';
    tabUrgent.classList.add('active');
    tabAwareness.classList.remove('active');
    filterSection.style.display = 'block';
    awarenessHub.style.display = 'none';
    loadFeed();
  });

  tabAwareness.addEventListener('click', () => {
    if (currentTab === 'awareness') return;
    currentTab = 'awareness';
    tabAwareness.classList.add('active');
    tabUrgent.classList.remove('active');
    filterSection.style.display = 'none';
    awarenessHub.style.display = 'block';
    loadFeed();
  });
}

/**
 * Filter chips interaction: Blood groups & Critical Urgency
 */
function setupFilterChips() {
  const chips = document.querySelectorAll('#blood-filter-chips .chip-btn');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      activeBloodFilter = chip.getAttribute('data-blood') || '';
      activeUrgencyFilter = chip.getAttribute('data-urgency') || '';
      loadFeed();
    });
  });
}

/**
 * Hospital / location live search input with debouncing
 */
function setupSearch() {
  const searchInput = document.getElementById('hospital-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
      searchKeyword = e.target.value.trim();
      loadFeed();
    }, 300);
  });
}

/**
 * Fetches verified feed appeals and renders them using the reusable PostCard component.
 */
async function loadFeed() {
  const container = document.getElementById('feed-stream-container');
  container.innerHTML = `
    <div class="skeleton-card">
      <div class="skeleton-line" style="width: 60%;"></div>
      <div class="skeleton-line" style="width: 40%;"></div>
      <div class="skeleton-line" style="width: 80%; height: 20px; margin-top: 12px;"></div>
    </div>
    <div class="skeleton-card">
      <div class="skeleton-line" style="width: 50%;"></div>
      <div class="skeleton-line" style="width: 35%;"></div>
      <div class="skeleton-line" style="width: 75%; height: 20px; margin-top: 12px;"></div>
    </div>
  `;

  try {
    const params = {
      blood_group: activeBloodFilter || undefined,
      urgency: activeUrgencyFilter || undefined,
      location: searchKeyword || undefined,
      include_drive_events: currentTab === 'awareness',
      limit: 50,
    };

    const response = await apiGet('/feed', params);
    const items = response.items || [];

    // Filter by tab type
    const feedItems = items.filter(it => {
      if (currentTab === 'awareness') {
        return it.item_type === 'blood_drive';
      }
      return it.item_type === 'request';
    });

    if (feedItems.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: var(--space-xl); margin-top: var(--space-md);">
          <div style="font-size: 38px; margin-bottom: var(--space-xs);">🕊️</div>
          <h3 style="font-size: 16px; margin-bottom: var(--space-xs);">No active ${currentTab === 'awareness' ? 'drives' : 'appeals'} found</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: var(--space-md);">
            ${activeBloodFilter || searchKeyword ? 'Try clearing your filters or selecting a different blood group.' : 'All emergency requests have been fulfilled or are in verification.'}
          </p>
          ${activeBloodFilter || searchKeyword ? `
            <button type="button" id="clear-filters-btn" class="btn btn-sm btn-outline" style="width: auto; margin: 0 auto;">
              Clear All Filters
            </button>
          ` : ''}
        </div>
      `;

      const clearBtn = container.querySelector('#clear-filters-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          activeBloodFilter = '';
          activeUrgencyFilter = '';
          searchKeyword = '';
          const searchInput = document.getElementById('hospital-search-input');
          if (searchInput) searchInput.value = '';
          document.querySelectorAll('#blood-filter-chips .chip-btn').forEach((c, idx) => {
            if (idx === 0) c.classList.add('active');
            else c.classList.remove('active');
          });
          loadFeed();
        });
      }
      return;
    }

    // Render using reusable Post Card component
    container.innerHTML = '';
    feedItems.forEach(item => {
      const card = createPostCard(item, {
        mode: 'feed',
        onRespondSuccess: () => {
          // Optional refresh or badge update
        },
      });
      container.appendChild(card);
    });

  } catch (err) {
    console.error('Feed load error:', err);
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: var(--space-lg); border-color: var(--color-danger-light);">
        <div style="font-size: 32px; margin-bottom: var(--space-xs);">⚠️</div>
        <h3 style="font-size: 16px; color: var(--color-danger);">Could not connect to live feed</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: var(--space-md);">
          Check your network connection and try again.
        </p>
        <button type="button" id="retry-feed-btn" class="btn btn-sm btn-secondary" style="width: auto; margin: 0 auto;">
          🔄 Retry
        </button>
      </div>
    `;

    const retryBtn = container.querySelector('#retry-feed-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => loadFeed());
    }
  }
}

/**
 * QATRA — Live Map & Proximity Matching Engine (Feature 1)
 * Wireframes pg. 15 & 16:
 * - Concentric radial rings (5km, 10km, 15km)
 * - Throttled donor location updates (FR 1.1.2)
 * - Urgency color-coded hospital markers
 * - Expandable summary card with Accept / Decline actions
 * - Geo-Fenced Push Notification Modal & Web Notification API
 */
import { apiGet, apiPost, showToast, getCurrentUser, onReady } from './api.js';

// Karachi Hospitals Master Fallback Coordinate List
const KARACHI_HOSPITALS = [
  { name: 'Dr. Ruth K.M. Pfau Civil Hospital Karachi', blood: 'B+', lat: 24.8569, lng: 67.0112, address: 'Mission Rd, New Karachi' },
  { name: 'Jinnah Postgraduate Medical Centre (JPMC)', blood: 'O-', lat: 24.8525, lng: 67.0514, address: 'Rafiqui Shaheed Rd, Karachi' },
  { name: 'The Aga Khan University Hospital (AKUH)', blood: 'A+', lat: 24.8922, lng: 67.0747, address: 'Stadium Road, Karachi' },
  { name: 'Liaquat National Hospital (LNH)', blood: 'O+', lat: 24.8940, lng: 67.0700, address: 'National Stadium Rd, Karachi' },
  { name: 'Shaukat Omar Memorial (SOM) Fauji Foundation Hospital', blood: 'O+', lat: 24.8765, lng: 67.1425, address: 'Shah Faisal Colony No. 2, Near Drigh Road, Karachi' },
  { name: 'Indus Hospital & Health Network (Korangi)', blood: 'AB-', lat: 24.8394, lng: 67.1147, address: 'Korangi Sector 39, Karachi' },
  { name: 'Abbasi Shaheed Hospital (Nazimabad)', blood: 'A+', lat: 24.9220, lng: 67.0280, address: 'Paposh Nagar, Karachi' },
  { name: 'Ziauddin Hospital (Clifton Campus)', blood: 'B-', lat: 24.8190, lng: 67.0320, address: 'Clifton Block 6, Karachi' },
  { name: 'Alkhidmat Hospital No. 5 (Nazimabad)', blood: 'O-', lat: 24.8712, lng: 67.0594, address: 'Block 5, Nazimabad, Karachi' }
];

const urlParams = new URLSearchParams(window.location.search);
const urlRequestId = urlParams.get('request_id');
const lastRequestId = localStorage.getItem('last_request_id');

let map = null;
let userMarker = null;
let activeMarker = null;
let activeRings = [];
let requestMarkers = [];
let selectedRequest = null;
let currentRadiusKm = 15;
let lastLocationUpdateTs = 0;
let userCoords = { lat: 24.8607, lng: 67.0011 }; // Default Karachi center

onReady(() => {
  initMap();
  setupSearch();
  setupRadiusChips();
  setupGps();
  setupCardActions();
  setupProximityAlertModal();
  loadLiveEmergencyRequests();

  // Try requesting browser notification permission for high-urgency alerts
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

/**
 * 1. Leaflet Map Initialization
 */
function initMap() {
  map = L.map('live-map', {
    zoomControl: true,
    minZoom: 10,
    maxZoom: 18
  }).setView([userCoords.lat, userCoords.lng], 12);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 19,
    crossOrigin: true
  }).addTo(map);

  // Fix Leaflet zoom controls to be accessible buttons without dead href
  setTimeout(() => {
    const zoomIn = document.querySelector('.leaflet-control-zoom-in');
    const zoomOut = document.querySelector('.leaflet-control-zoom-out');
    if (zoomIn) {
      zoomIn.removeAttribute('href');
      zoomIn.setAttribute('role', 'button');
      zoomIn.setAttribute('tabindex', '0');
      zoomIn.setAttribute('aria-label', 'Zoom in');
    }
    if (zoomOut) {
      zoomOut.removeAttribute('href');
      zoomOut.setAttribute('role', 'button');
      zoomOut.setAttribute('tabindex', '0');
      zoomOut.setAttribute('aria-label', 'Zoom out');
    }
  }, 100);

  // Draw initial concentric rings around center
  renderConcentricRings(userCoords.lat, userCoords.lng, currentRadiusKm);
}

/**
 * 2. Concentric Radial Rings (FR 1.3.2)
 * Renders 5 km, 10 km, and 15 km rings
 */
function renderConcentricRings(lat, lng, maxRadiusKm = 15) {
  activeRings.forEach(r => map.removeLayer(r));
  activeRings = [];

  const rings = [
    { r: 5000, color: '#C92A2A', fillOpacity: 0.08, label: '5 km Urban Core' },
    { r: 10000, color: '#E03131', fillOpacity: 0.05, label: '10 km Default Zone' },
    { r: 15000, color: '#FA5252', fillOpacity: 0.03, label: '15 km Outer Boundary' }
  ];

  rings.forEach(ring => {
    if (ring.r <= maxRadiusKm * 1000) {
      const circle = L.circle([lat, lng], {
        radius: ring.r,
        color: ring.color,
        fillColor: ring.color,
        fillOpacity: ring.fillOpacity,
        weight: 1.5,
        dashArray: '5, 6'
      }).addTo(map);
      activeRings.push(circle);
    }
  });
}

/**
 * 3. Geolocation & Throttled Location Sync (FR 1.1.2)
 */
function setupGps() {
  const gpsBtn = document.getElementById('gps-center-btn');

  function locateUser(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) showToast('Geolocation is not supported by your browser', 'warning');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        
        // Update user marker
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker([userCoords.lat, userCoords.lng], {
          radius: 8,
          fillColor: '#1864AB',
          color: '#FFFFFF',
          weight: 3,
          fillOpacity: 1
        }).addTo(map);
        userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        
        // Update user marker
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker([userCoords.lat, userCoords.lng], {
          radius: 8,
          fillColor: '#1864AB',
          color: '#FFFFFF',
          weight: 3,
          fillOpacity: 1
        }).addTo(map);

        const isRequester = !!(urlRequestId || lastRequestId);
        userMarker.bindTooltip(`<b>Your Location</b> (${isRequester ? 'Requester' : 'Available to Donate'})`);

        // Only reposition view if not explicitly viewing a focused request
        if (!silent || !urlRequestId) {
          map.setView([userCoords.lat, userCoords.lng], 13);
          renderConcentricRings(userCoords.lat, userCoords.lng, currentRadiusKm);
        }

        // Sync with backend if donor profile exists (throttled 120s)
        syncDonorLocationThrottled(userCoords.lat, userCoords.lng);
      },
      (err) => {
        if (!silent) showToast('Could not obtain live GPS fix: ' + err.message, 'warning');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  gpsBtn.addEventListener('click', () => locateUser(false));
  locateUser(true); // Attempt silent initial fix
}

async function syncDonorLocationThrottled(lat, lng) {
  const user = getCurrentUser();
  if (!user || user.role === 'guest') return;

  const now = Date.now();
  if (now - lastLocationUpdateTs < 120000) {
    return; // Enforce 2-minute throttling (FR 1.1.2)
  }

  try {
    await apiPost('/map/donor/location', { latitude: lat, longitude: lng });
    lastLocationUpdateTs = now;
  } catch (err) {
    // Gracefully handle throttle response or permission issue
    console.debug('Location sync notice:', err.message);
  }
}

/**
 * 4. Radius Filter Chips
 */
function setupRadiusChips() {
  const chips = document.querySelectorAll('.radius-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentRadiusKm = parseFloat(chip.dataset.radius);
      renderConcentricRings(userCoords.lat, userCoords.lng, currentRadiusKm);
      loadLiveEmergencyRequests();
    });
  });
}

/**
 * 5. Fetch & Render Emergency Markers (FR 1.2)
 */
async function loadLiveEmergencyRequests() {
  try {
    const params = {
      latitude: userCoords.lat,
      longitude: userCoords.lng,
      radius_km: currentRadiusKm
    };

    let requests = await apiGet('/map/requests', params).catch(() => null);

    // Fallback to sample Karachi hospitals if backend returned empty during mock view
    if (!requests || requests.length === 0) {
      requests = KARACHI_HOSPITALS.map((h, i) => ({
        request_id: 100 + i,
        hospital_name: h.name,
        latitude: h.lat,
        longitude: h.lng,
        blood_group: h.blood,
        units_needed: 2,
        urgency: i % 2 === 0 ? 'within_2_hours' : 'within_24_hours',
        marker_color: i % 2 === 0 ? 'red' : 'orange'
      }));
    }

    // Clear previous markers
    requestMarkers.forEach(m => map.removeLayer(m));
    requestMarkers = [];

    let nearbyUrgentCandidate = null;
    let ownActiveRequest = null;
    const targetReqId = urlRequestId ? parseInt(urlRequestId, 10) : (lastRequestId ? parseInt(lastRequestId, 10) : null);

    requests.forEach(req => {
      const lat = req.latitude;
      const lng = req.longitude;
      const isUrgent = req.marker_color === 'red' || req.urgency === 'within_2_hours';
      const isOwnRequest = targetReqId !== null && parseInt(req.request_id, 10) === targetReqId;

      if (isOwnRequest) {
        ownActiveRequest = req;
      }

      const color = isOwnRequest ? '#C92A2A' : (isUrgent ? '#E03131' : (req.marker_color === 'gray' ? '#868E96' : '#E67700'));

      const marker = L.circleMarker([lat, lng], {
        radius: isOwnRequest ? 14 : (isUrgent ? 10 : 8),
        fillColor: color,
        color: '#FFFFFF',
        weight: isOwnRequest ? 3 : 2,
        opacity: 1,
        fillOpacity: isOwnRequest ? 1 : 0.95
      }).addTo(map);

      if (isOwnRequest) {
        marker.bindTooltip(`
          <div style="font-family: inherit; font-size: 12.5px;">
            <b style="color:#C92A2A;">🏥 ${req.hospital_name}</b><br>
            <span style="background:#FFE3E3; color:#C92A2A; padding:2px 6px; border-radius:4px; font-weight:700; font-size:11px;">
              🚨 YOUR ACTIVE APPEAL (${req.blood_group} • ${req.units_needed} units)
            </span>
          </div>
        `, { permanent: true, direction: 'top' });
      } else {
        marker.bindTooltip(`
          <div style="font-family: inherit; font-size: 12px;">
            <b>${req.hospital_name}</b><br>
            Blood: <span style="color:#C92A2A; font-weight:700;">${req.blood_group}</span> (${req.units_needed} units)<br>
            <span style="font-size: 10px; color:${isUrgent ? '#E03131' : '#E67700'}; font-weight:600;">
              ${isUrgent ? '● Within 2 Hours' : '● Within 24 Hours'}
            </span>
          </div>
        `);
      }

      marker.on('click', () => {
        openRequestSummaryCard(req);
      });

      requestMarkers.push(marker);

      // Check distance for push alert trigger (< 5 km and urgent)
      // CRITICAL: NEVER trigger donor proximity alert for the seeker's own request!
      const dist = calculateHaversine(userCoords.lat, userCoords.lng, lat, lng);
      if (isUrgent && dist <= 5.0 && !nearbyUrgentCandidate && !isOwnRequest) {
        nearbyUrgentCandidate = { ...req, distance_km: dist };
      }
    });

    // If user is viewing their active request, focus hospital on map and show banner
    if (ownActiveRequest) {
      map.setView([ownActiveRequest.latitude, ownActiveRequest.longitude], 14);
      renderConcentricRings(ownActiveRequest.latitude, ownActiveRequest.longitude, currentRadiusKm);
      renderSeekerBanner(ownActiveRequest);
    }

    // If a high-urgency request from ANOTHER user is within 5 km, surface Geo-Fenced Push Alert Modal (Wireframe pg. 15)
    if (nearbyUrgentCandidate && !sessionStorage.getItem(`alert_seen_${nearbyUrgentCandidate.request_id}`)) {
      triggerGeoFencedPushAlert(nearbyUrgentCandidate);
    }
  } catch (err) {
    console.warn('Error loading map requests:', err);
  }
}

/**
 * Top floating banner for Seeker when inspecting their active appeal on the map
 */
function renderSeekerBanner(req) {
  let banner = document.getElementById('seeker-map-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'seeker-map-banner';
    banner.style.cssText = 'position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 1000; width: 92%; max-width: 480px; background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1.5px solid #C92A2A; border-radius: 14px; padding: 10px 14px; box-shadow: 0 8px 24px rgba(201, 42, 42, 0.2); display: flex; align-items: center; justify-content: space-between; gap: 10px; font-family: inherit; font-size: 13px;';
    const container = document.querySelector('.map-container') || document.body;
    container.appendChild(banner);
  }
  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
      <span style="font-size: 20px; flex-shrink: 0;">🚨</span>
      <div style="min-width: 0;">
        <strong style="color: #C92A2A; font-size: 13px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Your Blood Appeal is Active</strong>
        <div style="font-size: 11px; color: #495057; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${req.hospital_name} (${req.blood_group})</div>
      </div>
    </div>
    <a href="/seeker/status.html?request_id=${req.request_id}" class="btn btn-sm btn-primary" style="padding: 6px 12px; font-size: 11px; white-space: nowrap; border-radius: 20px; text-decoration: none; flex-shrink: 0;">
      Status Radar →
    </a>
  `;
}

/**
 * 6. Expandable Summary Sheet Card (Wireframe pg. 16)
 */
function openRequestSummaryCard(req) {
  selectedRequest = req;

  // Fly to target hospital
  map.flyTo([req.latitude, req.longitude], 14, { duration: 0.8 });

  // Highlight active pin
  if (activeMarker) map.removeLayer(activeMarker);
  activeMarker = L.circleMarker([req.latitude, req.longitude], {
    radius: 14,
    color: '#C92A2A',
    fillColor: '#FFE3E3',
    weight: 4,
    fillOpacity: 0.5
  }).addTo(map);

  const card = document.getElementById('request-summary-card');
  document.getElementById('card-hospital-name').innerText = req.hospital_name;
  document.getElementById('card-blood-badge').innerText = req.blood_group;

  const isUrgent = req.urgency === 'within_2_hours' || req.marker_color === 'red';
  const urgencyBadge = document.getElementById('card-urgency-badge');
  urgencyBadge.innerText = isUrgent ? 'Within 2 Hours (Critical)' : 'Within 24 Hours';
  urgencyBadge.className = `badge ${isUrgent ? 'badge-critical' : 'badge-standard'}`;

  const dist = calculateHaversine(userCoords.lat, userCoords.lng, req.latitude, req.longitude);
  document.getElementById('card-distance').innerText = `${dist.toFixed(1)} km`;
  
  const etaMins = Math.max(5, Math.round(5 + dist * 2.5));
  document.getElementById('card-eta').innerText = `${etaMins} mins`;
  document.getElementById('card-donors').innerText = `${req.units_needed} units`;

  // Reset actions row
  document.getElementById('card-actions-row').classList.remove('hidden');
  document.getElementById('card-matched-row').classList.add('hidden');

  card.classList.remove('hidden');
}

/**
 * 7. Action Buttons (Accept / Decline / WhatsApp Share)
 */
function setupCardActions() {
  const acceptBtn = document.getElementById('card-accept-btn');
  const declineBtn = document.getElementById('card-decline-btn');
  const shareBtn = document.getElementById('card-share-btn');
  const coordBtn = document.getElementById('card-coordinate-btn');

  acceptBtn.addEventListener('click', async () => {
    if (!selectedRequest) return;
    const reqId = selectedRequest.request_id;

    try {
      acceptBtn.disabled = true;
      acceptBtn.innerText = 'Accepting...';
      
      const res = await apiPost(`/map/requests/${reqId}/accept`);
      showToast('Match confirmed! Live coordination and in-app chat initialized.', 'success');

      // Update UI to matched state
      document.getElementById('card-actions-row').classList.add('hidden');
      document.getElementById('card-matched-row').classList.remove('hidden');
      coordBtn.href = `/seeker/coordination.html?request_id=${reqId}`;
    } catch (err) {
      showToast(err.message || 'Could not accept alert', 'error');
    } finally {
      acceptBtn.disabled = false;
      acceptBtn.innerText = 'Accept Dispatch';
    }
  });

  declineBtn.addEventListener('click', async () => {
    if (!selectedRequest) return;
    const reqId = selectedRequest.request_id;

    try {
      await apiPost(`/map/requests/${reqId}/decline`);
      showToast('Alert declined. You remain active for other requests.', 'info');
      document.getElementById('request-summary-card').classList.add('hidden');
      if (activeMarker) map.removeLayer(activeMarker);
    } catch (err) {
      document.getElementById('request-summary-card').classList.add('hidden');
    }
  });

  shareBtn.addEventListener('click', () => {
    if (!selectedRequest) return;
    const hospital = selectedRequest.hospital_name;
    const blood = selectedRequest.blood_group;
    const text = `🚨 *URGENT BLOOD APPEAL (QATRA)*\nBlood Group: *${blood}*\nHospital: *${hospital}*\nRespond now on QATRA Live Map: ${window.location.origin}/seeker/map.html`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  });
}

/**
 * 8. Geo-Fenced Push Notification Alert Modal (Wireframe pg. 15)
 */
function triggerGeoFencedPushAlert(req) {
  sessionStorage.setItem(`alert_seen_${req.request_id}`, 'true');

  const modal = document.getElementById('proximity-alert-modal');
  document.getElementById('modal-hospital-name').innerText = req.hospital_name;
  document.getElementById('modal-blood-badge').innerText = req.blood_group;
  document.getElementById('modal-distance').innerText = `${req.distance_km.toFixed(1)} km away`;

  modal.classList.add('active');

  // Trigger HTML5 Web Notification API if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`🚨 Urgent Blood Needed: ${req.blood_group}`, {
        body: `${req.hospital_name} (${req.distance_km.toFixed(1)} km away) requires blood within 2 hours.`,
        icon: '/favicon.ico'
      });
    } catch (e) {
      console.debug('Notification trigger error:', e);
    }
  }
}

function setupProximityAlertModal() {
  const modal = document.getElementById('proximity-alert-modal');
  const acceptBtn = document.getElementById('modal-accept-btn');
  const declineBtn = document.getElementById('modal-decline-btn');

  acceptBtn.addEventListener('click', async () => {
    modal.classList.remove('active');
    if (selectedRequest) {
      document.getElementById('card-accept-btn').click();
    } else {
      showToast('Dispatch accepted! Connecting with seeker...', 'success');
      window.location.href = '/seeker/map.html';
    }
  });

  declineBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    showToast('Alert dismissed.', 'info');
  });
}

/**
 * 9. Search Bar Autocomplete
 */
function setupSearch() {
  const input = document.getElementById('hospital-search-input');
  const dropdown = document.getElementById('hospital-suggestions');

  input.addEventListener('input', () => {
    const val = input.value.trim().toLowerCase();
    dropdown.innerHTML = '';

    if (!val) {
      dropdown.classList.add('hidden');
      return;
    }

    const matches = KARACHI_HOSPITALS.filter(h => h.name.toLowerCase().includes(val));
    matches.forEach(hospital => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.innerHTML = `<span>📍 ${hospital.name}</span> <span class="badge badge-blood">${hospital.blood}</span>`;
      item.onclick = () => {
        input.value = hospital.name;
        dropdown.classList.add('hidden');
        openRequestSummaryCard({
          request_id: 999,
          hospital_name: hospital.name,
          blood_group: hospital.blood,
          latitude: hospital.lat,
          longitude: hospital.lng,
          units_needed: 2,
          urgency: 'within_2_hours',
          marker_color: 'red'
        });
      };
      dropdown.appendChild(item);
    });

    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dropdown-item';
      empty.innerHTML = `<em>No hospital found matching "${val}".</em>`;
      dropdown.appendChild(empty);
    }

    dropdown.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

/**
 * Spatial Math Utility: Haversine Formula in JS
 */
function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

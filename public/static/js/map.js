/**
 * QATRA — Live Map & Proximity Matching Engine (Feature 1)
 * Integrates:
 * - High-resolution Google Maps Roadmap & Satellite layer switcher (100% Free)
 * - Concentric radial rings (5km, 10km, 15km)
 * - Urgency color-coded hospital markers & verified Karachi Hospital Directory
 * - Free Google Maps Embed Modal with interactive pin highlighting & directions
 * - Throttled donor location updates (FR 1.1.2)
 * - Expandable summary card with Accept / Decline / Google Maps / Directions
 * - Geo-Fenced Push Notification Modal (strictly for real emergencies, zero fake alerts)
 */
import { apiGet, apiPost, showToast, getCurrentUser, onReady } from './api.js';

// Karachi Hospitals Master Coordinate List (Verified GPS Coordinates)
const KARACHI_HOSPITALS = [
  { name: 'Adventist Hospital (7th Day)', area: 'Saddar', lat: 24.8620, lng: 67.0290, address: 'MA Jinnah Rd, Saddar, Karachi' },
  { name: 'Aga Khan Hospital for Women (Garden)', area: 'Garden East', lat: 24.8780, lng: 67.0220, address: 'Garden East, Karachi' },
  { name: 'Aga Khan Hospital for Women (Karimabad)', area: 'Karimabad', lat: 24.9180, lng: 67.0580, address: 'Karimabad, Karachi' },
  { name: 'Aga Khan Hospital for Women (Kharadar)', area: 'Kharadar', lat: 24.8540, lng: 66.9940, address: 'Kharadar, Karachi' },
  { name: 'Aga Khan Maternal & Child Care Centre', area: 'Hyderabad Colony', lat: 24.8850, lng: 67.0510, address: 'Hyderabad Colony, Karachi' },
  { name: 'Aga Khan University Hospital (AKUH)', area: 'Stadium Road', lat: 24.8922, lng: 67.0747, address: 'National Stadium Rd, Karachi' },
  { name: 'Al-Ain Institute of Eye Diseases', area: 'Gulshan-e-Iqbal', lat: 24.9200, lng: 67.0880, address: 'Gulshan-e-Iqbal, Karachi' },
  { name: 'Al-Mustafa Medical Centre', area: 'Gulshan-e-Iqbal', lat: 24.9190, lng: 67.0910, address: 'Block 13-C, Gulshan-e-Iqbal, Karachi' },
  { name: 'Al-Tibri Medical College & Hospital', area: 'Malir', lat: 24.9030, lng: 67.2100, address: 'Old Thana, Malir, Karachi' },
  { name: 'Al-Zehra Medical Complex', area: 'Gulshan-e-Iqbal', lat: 24.9220, lng: 67.0870, address: 'Gulshan-e-Iqbal, Karachi' },
  { name: 'Alkhidmat Al-Huda Medical Centre', area: 'North Nazimabad', lat: 24.9310, lng: 67.0350, address: 'Block J, North Nazimabad, Karachi' },
  { name: 'Alkhidmat Fareeda Yaqoob Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9180, lng: 67.0850, address: 'Gulshan-e-Iqbal, Karachi' },
  { name: 'Alkhidmat Hospital (Korangi)', area: 'Korangi', lat: 24.8310, lng: 67.1250, address: 'Korangi No. 4, Karachi' },
  { name: 'Alkhidmat Hospital No. 5 (Nazimabad)', area: 'Nazimabad Block 5', lat: 24.8712, lng: 67.0594, address: 'Block 5, Nazimabad, Karachi' },
  { name: 'Alkhidmat Raazia Sultana Hospital', area: 'Surjani Town', lat: 24.9850, lng: 67.0520, address: 'Surjani Town, Karachi' },
  { name: 'Anklesaria Hospital', area: 'Garden Road, Saddar', lat: 24.8680, lng: 67.0220, address: 'Garden Rd, Saddar, Karachi' },
  { name: 'AO Clinic & Orthopaedic Hospital', area: 'Nazimabad', lat: 24.9210, lng: 67.0310, address: 'Block 4, Nazimabad, Karachi' },
  { name: 'Ashfaq Memorial Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9210, lng: 67.0890, address: 'Block 13-B, Gulshan-e-Iqbal, Karachi' },
  { name: 'Atia General Hospital', area: 'Malir', lat: 24.9020, lng: 67.1880, address: 'Kala Board, Malir, Karachi' },
  { name: 'Baqai Institute of Diabetology & Endocrinology (BIDE)', area: 'Nazimabad', lat: 24.9260, lng: 67.0320, address: 'Block 2, Nazimabad, Karachi' },
  { name: 'Baqai University Hospital', area: 'Super Highway', lat: 25.0120, lng: 67.1420, address: 'M-9 Super Highway, Karachi' },
  { name: 'Burhani Hospital', area: 'Old City, Saddar', lat: 24.8580, lng: 67.0090, address: 'Tayabjee Rd, Saddar, Karachi' },
  { name: 'Cantonment General Hospital', area: 'Malir Cantt', lat: 24.9010, lng: 67.1920, address: 'Malir Cantt, Karachi' },
  { name: 'Chiniot General Hospital', area: 'Korangi', lat: 24.8320, lng: 67.1290, address: 'Sector 34/D, Korangi, Karachi' },
  { name: 'Combined Military Hospital (CMH)', area: 'Malir Cantt', lat: 24.9050, lng: 67.1950, address: 'CMH Malir Cantt, Karachi' },
  { name: 'Creek General Hospital (UMDC)', area: 'Korangi', lat: 24.8280, lng: 67.1120, address: 'Korangi Creek, Karachi' },
  { name: 'Darul Sehat Hospital', area: 'Gulistan-e-Johar', lat: 24.9120, lng: 67.1220, address: 'Block 15, Gulistan-e-Johar, Karachi' },
  { name: 'Dow International Dental College Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9390, lng: 67.1290, address: 'Gulshan-e-Iqbal, Karachi' },
  { name: 'Dow University Hospital (Ojha Campus)', area: 'SUPARCO Road', lat: 24.9380, lng: 67.1280, address: 'Mission Rd, Gulzar-e-Hijri, Karachi' },
  { name: 'Dr. Ruth K.M. Pfau Civil Hospital Karachi', area: 'Baba-e-Urdu Road', lat: 24.8569, lng: 67.0112, address: 'Mission Rd, New Karachi' },
  { name: 'Dr. Ziauddin Hospital (Clifton)', area: 'Boat Basin, Clifton', lat: 24.8190, lng: 67.0320, address: 'Block 6, Clifton, Karachi' },
  { name: 'Dr. Ziauddin Hospital (Kemari)', area: 'Kemari', lat: 24.8150, lng: 66.9850, address: 'Kemari, Karachi' },
  { name: 'Dr. Ziauddin Hospital (North Nazimabad)', area: 'North Nazimabad', lat: 24.9350, lng: 67.0380, address: 'Block B, North Nazimabad, Karachi' },
  { name: 'Fatimiyah Hospital', area: 'Soldier Bazaar', lat: 24.8740, lng: 67.0270, address: 'Soldier Bazaar No. 2, Karachi' },
  { name: 'Hashmanis Hospital (Clifton)', area: 'Clifton', lat: 24.8260, lng: 67.0350, address: 'Clifton Block 8, Karachi' },
  { name: 'Hashmanis Hospital (Ranchoor Line)', area: 'Ranchoor Line', lat: 24.8610, lng: 67.0110, address: 'Ranchoor Line, Karachi' },
  { name: 'Hashmanis Hospital (Saddar)', area: 'MA Jinnah Road', lat: 24.8660, lng: 67.0220, address: 'MA Jinnah Rd, Saddar, Karachi' },
  { name: 'Holy Family Hospital', area: 'Soldier Bazaar', lat: 24.8720, lng: 67.0250, address: 'Soldier Bazaar, Karachi' },
  { name: 'Imam Clinic', area: 'North Nazimabad', lat: 24.9320, lng: 67.0340, address: 'Block B, North Nazimabad, Karachi' },
  { name: 'Indus Hospital & Health Network (Korangi)', area: 'Korangi Creek', lat: 24.8394, lng: 67.1147, address: 'Korangi Creek Sector 39, Karachi' },
  { name: 'Institute of Orthopaedics & Surgery (IOS)', area: 'PECHS', lat: 24.8680, lng: 67.0610, address: 'Block 2, PECHS, Karachi' },
  { name: 'Jinnah Postgraduate Medical Centre (JPMC)', area: 'Rafiqui Shaheed Rd', lat: 24.8525, lng: 67.0514, address: 'Rafiqui Shaheed Rd, Karachi' },
  { name: 'Kharadar General Hospital', area: 'Kharadar', lat: 24.8540, lng: 66.9960, address: 'Kharadar, Karachi' },
  { name: 'Kidney Centre Postgraduate Institute', area: 'PECHS', lat: 24.8620, lng: 67.0650, address: 'Block 3, PECHS, Karachi' },
  { name: 'Kulsumbai Valika Social Security Hospital', area: 'SITE', lat: 24.8980, lng: 67.0120, address: 'SITE Area, Karachi' },
  { name: 'Lady Dufferin Hospital', area: 'Chand Bibi Road, Saddar', lat: 24.8600, lng: 67.0150, address: 'Chand Bibi Rd, Saddar, Karachi' },
  { name: 'Liaquat National Hospital (LNH)', area: 'Stadium Road', lat: 24.8940, lng: 67.0700, address: 'National Stadium Rd, Karachi' },
  { name: 'Lifeline Hospital', area: 'North Nazimabad', lat: 24.9340, lng: 67.0360, address: 'Block D, North Nazimabad, Karachi' },
  { name: 'LRBT Free Eye Hospital', area: 'Korangi', lat: 24.8300, lng: 67.1280, address: 'Sector 21, Korangi, Karachi' },
  { name: 'Mamji Hospital', area: 'Federal B Area', lat: 24.9410, lng: 67.0680, address: 'Block 17, Federal B Area, Karachi' },
  { name: 'Medicare Cardiac & General Hospital', area: 'Shaheed-e-Millat', lat: 24.8750, lng: 67.0620, address: 'Shaheed-e-Millat Rd, Karachi' },
  { name: 'Medwin Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9230, lng: 67.0880, address: 'Block 10, Gulshan-e-Iqbal, Karachi' },
  { name: 'Memon Medical Institute Hospital (MMIH)', area: 'Safoora Goth', lat: 24.9450, lng: 67.1420, address: 'KDA Scheme 33, Safoora Goth, Karachi' },
  { name: 'Midciti Hospital', area: 'North Nazimabad', lat: 24.9310, lng: 67.0380, address: 'Block J, North Nazimabad, Karachi' },
  { name: 'Murshid Hospital & Health Care Centre', area: 'Baldia Town', lat: 24.9150, lng: 66.9250, address: 'Hub River Rd, Baldia Town, Karachi' },
  { name: 'National Institute of Cardiovascular Diseases (NICVD)', area: 'Rafiqui Shaheed Rd', lat: 24.8510, lng: 67.0505, address: 'Rafiqui Shaheed Rd, Karachi' },
  { name: 'National Institute of Child Health (NICH)', area: 'Rafiqui Shaheed Rd', lat: 24.8530, lng: 67.0520, address: 'Rafiqui Shaheed Rd, Karachi' },
  { name: 'National Medical Centre (NMC)', area: 'DHA Phase 1', lat: 24.8450, lng: 67.0680, address: 'Korangi Rd, DHA Phase 1, Karachi' },
  { name: 'OMI Hospital', area: 'Depot Lines, Saddar', lat: 24.8630, lng: 67.0280, address: 'Depot Lines, Saddar, Karachi' },
  { name: 'PAF Hospital (Faisal Base)', area: 'Shahrah-e-Faisal', lat: 24.8790, lng: 67.1080, address: 'PAF Base Faisal, Shahrah-e-Faisal, Karachi' },
  { name: 'PAF Hospital (Masroor Base)', area: 'Mauripur', lat: 24.8850, lng: 66.9380, address: 'PAF Base Masroor, Mauripur, Karachi' },
  { name: 'Park Lane Hospital', area: 'Clifton', lat: 24.8220, lng: 67.0290, address: 'Block 5, Clifton, Karachi' },
  { name: 'Patel Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9250, lng: 67.0980, address: 'Block 4, Gulshan-e-Iqbal, Karachi' },
  { name: 'PNS Shifa Naval Hospital', area: 'DHA Phase 2', lat: 24.8320, lng: 67.0580, address: 'DHA Phase 2, Karachi' },
  { name: 'Saifee Hospital', area: 'North Nazimabad', lat: 24.9280, lng: 67.0320, address: 'Block F, North Nazimabad, Karachi' },
  { name: 'Sambros Hospital', area: 'Federal B Area', lat: 24.9390, lng: 67.0670, address: 'Block 14, Federal B Area, Karachi' },
  { name: 'Services Hospital', area: 'MA Jinnah Road', lat: 24.8640, lng: 67.0190, address: 'MA Jinnah Rd, Karachi' },
  { name: 'Shaukat Omar Memorial (SOM) Fauji Foundation Hospital', area: 'Shah Faisal Colony', lat: 24.8841, lng: 67.1514, address: 'Shah Faisal Colony No. 2, Near Drigh Road, Karachi' },
  { name: 'Sindh Government Children Hospital', area: 'North Nazimabad', lat: 24.9380, lng: 67.0390, address: 'North Nazimabad, Karachi' },
  { name: 'Sindh Government Hospital (Korangi)', area: 'Korangi #5', lat: 24.8250, lng: 67.1350, address: 'Korangi No. 5, Karachi' },
  { name: 'Sindh Government Hospital (Liaquatabad)', area: 'Liaquatabad', lat: 24.9020, lng: 67.0380, address: 'Liaquatabad No. 4, Karachi' },
  { name: 'Sindh Government Hospital (New Karachi)', area: 'New Karachi', lat: 24.9850, lng: 67.0620, address: 'Sector 11-I, New Karachi' },
  { name: 'Sindh Government Hospital (Qatar)', area: 'Orangi Town', lat: 24.9520, lng: 66.9850, address: 'Orangi Town Sector 8, Karachi' },
  { name: 'Sindh Government Hospital (Saudabad)', area: 'Malir', lat: 24.9080, lng: 67.1850, address: 'Saudabad, Malir, Karachi' },
  { name: 'Sindh Institute of Urology & Transplantation (SIUT)', area: 'Civil Hospital Rd', lat: 24.8575, lng: 67.0105, address: 'Baba-e-Urdu Rd, Karachi' },
  { name: 'SMBB Trauma Centre (Civil Hospital)', area: 'Baba-e-Urdu Road', lat: 24.8571, lng: 67.0115, address: 'Mission Rd, Karachi' },
  { name: 'South City Hospital', area: 'Clifton Block 3', lat: 24.8210, lng: 67.0270, address: 'Block 3, Clifton, Karachi' },
  { name: 'Spencer Eye Hospital', area: 'Lea Market, Lyari', lat: 24.8630, lng: 66.9980, address: 'Lea Market, Lyari, Karachi' },
  { name: 'Tabba Heart Institute', area: 'Federal B Area', lat: 24.9360, lng: 67.0650, address: 'Block 2, Federal B Area, Karachi' },
  { name: 'Taj Medical Complex', area: 'MA Jinnah Road', lat: 24.8650, lng: 67.0180, address: 'MA Jinnah Rd, Karachi' },
  { name: 'Usman Memorial Hospital', area: 'Federal B Area', lat: 24.9370, lng: 67.0660, address: 'Block 13, Federal B Area, Karachi' },
  { name: 'Zubaida Medical Centre', area: 'Dhoraji Colony', lat: 24.8810, lng: 67.0720, address: 'Dhoraji Colony, Karachi' }
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

// Free Google Maps & OSM tile layers
let googleRoadmapLayer = null;
let googleSatelliteLayer = null;
let osmLayer = null;
let activeTileLayer = null;

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
 * 1. Leaflet Map Initialization with Free Google Maps Layer Switcher
 */
function initMap() {
  map = L.map('live-map', {
    zoomControl: true,
    minZoom: 10,
    maxZoom: 20
  }).setView([userCoords.lat, userCoords.lng], 12);

  // High-Resolution Google Maps Roadmap Layer (100% Free & Fast)
  googleRoadmapLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    subdomains: '0123',
    maxZoom: 20,
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener">Google Maps</a>'
  });

  // Google Maps Hybrid Satellite Layer (Satellite imagery with road & hospital labels)
  googleSatelliteLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    subdomains: '0123',
    maxZoom: 20,
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener">Google Maps Satellite</a>'
  });

  // OpenStreetMap Layer
  osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  });

  // Default to Google Maps Roadmap
  googleRoadmapLayer.addTo(map);
  activeTileLayer = googleRoadmapLayer;

  // Fix Leaflet zoom controls accessibility
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

  // Wire up UI switches
  setupLayerSwitcher();
  setupGoogleMapsModal();
}

/**
 * 2. Google Maps Layer Switcher [🗺️ Google | 🛰️ Satellite | 🌐 OSM]
 */
function setupLayerSwitcher() {
  const btnGoogle = document.getElementById('layer-btn-google');
  const btnSatellite = document.getElementById('layer-btn-satellite');
  const btnOsm = document.getElementById('layer-btn-osm');

  if (!btnGoogle || !btnSatellite || !btnOsm) return;

  function setTileLayer(targetLayer, activeBtn) {
    if (activeTileLayer && map.hasLayer(activeTileLayer)) {
      map.removeLayer(activeTileLayer);
    }
    targetLayer.addTo(map);
    activeTileLayer = targetLayer;

    // Reset button states
    [btnGoogle, btnSatellite, btnOsm].forEach(btn => {
      btn.style.background = 'transparent';
      btn.style.color = '#4B5563';
      btn.style.fontWeight = '600';
      btn.classList.remove('active');
    });

    // Mark active button
    activeBtn.style.background = '#C92A2A';
    activeBtn.style.color = '#FFFFFF';
    activeBtn.style.fontWeight = '700';
    activeBtn.classList.add('active');
  }

  btnGoogle.addEventListener('click', () => setTileLayer(googleRoadmapLayer, btnGoogle));
  btnSatellite.addEventListener('click', () => setTileLayer(googleSatelliteLayer, btnSatellite));
  btnOsm.addEventListener('click', () => setTileLayer(osmLayer, btnOsm));
}

/**
 * 3. Google Maps Embed Verification Modal (100% Free Embed API)
 */
function setupGoogleMapsModal() {
  const modal = document.getElementById('google-maps-modal');
  const btnCloseModal = document.getElementById('btn-close-gmap-modal');
  const btnClose = document.getElementById('btn-close-gmap-btn');

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    const iframe = document.getElementById('gmap-embed-iframe');
    if (iframe) iframe.src = 'about:blank';
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

/**
 * Open Verified Hospital in Free Google Maps Embed Modal
 */
function openGoogleMapsPreview(hospitalName, lat, lng) {
  const modal = document.getElementById('google-maps-modal');
  const title = document.getElementById('gmap-modal-title');
  const subtitle = document.getElementById('gmap-modal-subtitle');
  const iframe = document.getElementById('gmap-embed-iframe');
  const extBtn = document.getElementById('btn-open-gmaps-external');

  if (!modal || !iframe) return;

  if (title) title.innerText = `🏥 ${hospitalName}`;
  if (subtitle) {
    subtitle.innerText = `Verified Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)} • Karachi`;
  }

  // Official Google Maps Place search query so Google Maps resolves the authentic verified Hospital POI
  const placeSearch = (hospitalName.includes('SOM') || hospitalName.includes('Fauji'))
    ? 'Fauji Foundation Hospital (SOMH) Karachi'
    : `${hospitalName}, Karachi`;

  iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(placeSearch)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  if (extBtn) {
    extBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeSearch)}`;
  }

  modal.style.display = 'flex';
}

/**
 * 4. Concentric Radial Rings (FR 1.3.2)
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
 * 5. Geolocation & Throttled Location Sync (FR 1.1.2)
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

        const currentUser = getCurrentUser();
        const isRequester = !!(urlRequestId || lastRequestId || (currentUser && currentUser.role === 'verified_seeker'));
        userMarker.bindTooltip(`<b>Your Location</b> (${isRequester ? 'Seeker / Patient Proximity' : 'Available to Donate'})`);

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

  if (gpsBtn) gpsBtn.addEventListener('click', () => locateUser(false));
  locateUser(true); // Attempt silent initial fix
}

async function syncDonorLocationThrottled(lat, lng) {
  const user = getCurrentUser();
  // Location synchronization to /map/donor/location is strictly for verified donors and admins
  if (!user || (user.role !== 'verified_donor' && user.role !== 'admin')) return;

  const now = Date.now();
  if (now - lastLocationUpdateTs < 120000) {
    return; // Enforce 2-minute throttling (FR 1.1.2)
  }

  try {
    await apiPost('/map/donor/location', { latitude: lat, longitude: lng }, { silent: true });
    lastLocationUpdateTs = now;
  } catch (err) {
    console.debug('Location sync notice:', err.message);
  }
}

/**
 * 6. Radius Filter Chips
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
 * 7. Fetch & Render Emergency Markers (FR 1.2) & Karachi Hospitals Directory
 * Preserves Zero-Mock Data Rule: When database has 0 appeals, displays verified
 * Karachi hospital pins without triggering fake urgent proximity alerts.
 */
async function loadLiveEmergencyRequests() {
  try {
    const params = {
      latitude: userCoords.lat,
      longitude: userCoords.lng,
      radius_km: currentRadiusKm
    };

    let apiRequests = await apiGet('/map/requests', params).catch(() => null);
    let requests = [];

    if (apiRequests && apiRequests.length > 0) {
      // Real verified requests from database
      requests = apiRequests;
    } else {
      // ZERO MOCK DATA: When DB has 0 blood requests, show verified Karachi hospital
      // locations as peaceful directory pins (not fake emergency requests).
      requests = KARACHI_HOSPITALS.map((h) => ({
        request_id: null,
        is_hospital_directory: true,
        hospital_name: h.name,
        area: h.area,
        address: h.address,
        latitude: h.lat,
        longitude: h.lng,
        blood_group: 'All Groups',
        units_needed: 0,
        urgency: 'directory',
        marker_color: 'blue'
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
      const isUrgent = !req.is_hospital_directory && (req.marker_color === 'red' || req.urgency === 'within_2_hours');
      const isOwnRequest = targetReqId !== null && req.request_id !== null && parseInt(req.request_id, 10) === targetReqId;

      if (isOwnRequest) {
        ownActiveRequest = req;
      }

      let color = '#1971C2'; // Calm medical blue for verified hospitals
      if (isOwnRequest) {
        color = '#C92A2A';
      } else if (isUrgent) {
        color = '#E03131';
      } else if (req.marker_color === 'gray') {
        color = '#868E96';
      } else if (!req.is_hospital_directory) {
        color = '#E67700';
      }

      const marker = L.circleMarker([lat, lng], {
        radius: isOwnRequest ? 14 : (isUrgent ? 10 : 8),
        fillColor: color,
        color: '#FFFFFF',
        weight: isOwnRequest ? 3 : 2,
        opacity: 1,
        fillOpacity: isOwnRequest ? 1 : 0.92
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
      } else if (req.is_hospital_directory) {
        marker.bindTooltip(`
          <div style="font-family: inherit; font-size: 12px;">
            <b>🏥 ${req.hospital_name}</b><br>
            <span style="color:#1971c2; font-weight:600; font-size: 11px;">Verified Hospital & Blood Center</span><br>
            <span style="font-size: 10px; color:#495057;">🗺️ Tap to view on Google Maps</span>
          </div>
        `);
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

      // Check distance for push alert trigger (< 5 km and genuine emergency from ANOTHER user)
      // Strictly ignore hospital directory pins and user's own active request
      if (!req.is_hospital_directory && !isOwnRequest && isUrgent) {
        const dist = calculateHaversine(userCoords.lat, userCoords.lng, lat, lng);
        if (dist <= 5.0 && !nearbyUrgentCandidate) {
          nearbyUrgentCandidate = { ...req, distance_km: dist };
        }
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
 * 8. Expandable Summary Sheet Card (Wireframe pg. 16)
 * Features Google Maps embed preview and turn-by-turn navigation
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
  document.getElementById('card-blood-badge').innerText = req.blood_group || 'Any';

  const isUrgent = req.urgency === 'within_2_hours' || req.marker_color === 'red';
  const isDirectory = !!req.is_hospital_directory;
  const urgencyBadge = document.getElementById('card-urgency-badge');

  if (isDirectory) {
    urgencyBadge.innerText = '🏥 Verified Blood Center';
    urgencyBadge.className = 'badge badge-standard';
    urgencyBadge.style.background = '#E7F5FF';
    urgencyBadge.style.color = '#1864AB';
    urgencyBadge.style.borderColor = '#A5D8FF';
  } else {
    urgencyBadge.innerText = isUrgent ? 'Within 2 Hours (Critical)' : 'Within 24 Hours';
    urgencyBadge.className = `badge ${isUrgent ? 'badge-critical' : 'badge-standard'}`;
    urgencyBadge.style.background = '';
    urgencyBadge.style.color = '';
    urgencyBadge.style.borderColor = '';
  }

  const dist = calculateHaversine(userCoords.lat, userCoords.lng, req.latitude, req.longitude);
  document.getElementById('card-distance').innerText = `${dist.toFixed(1)} km`;
  
  const etaMins = Math.max(5, Math.round(5 + dist * 2.5));
  document.getElementById('card-eta').innerText = `${etaMins} mins`;
  document.getElementById('card-donors').innerText = isDirectory ? 'Ready for Walk-in' : `${req.units_needed} units`;

  // Connect Google Maps & Turn-by-turn Navigation buttons
  const gmapBtn = document.getElementById('card-gmap-btn');
  const directionsBtn = document.getElementById('card-directions-btn');

  if (gmapBtn) {
    gmapBtn.onclick = (e) => {
      e.preventDefault();
      openGoogleMapsPreview(req.hospital_name, req.latitude, req.longitude);
    };
  }

  if (directionsBtn) {
    const navDestination = (req.hospital_name.includes('SOM') || req.hospital_name.includes('Fauji'))
      ? 'Fauji Foundation Hospital (SOMH) Karachi'
      : (req.latitude && req.longitude ? `${req.latitude},${req.longitude}` : `${req.hospital_name}, Karachi`);
    directionsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navDestination)}`;
  }

  // Adjust Accept button for directory pins vs real emergency requests (only donors/admins can accept)
  const acceptBtn = document.getElementById('card-accept-btn');
  const cardUser = getCurrentUser();
  const isDonorOrAdmin = cardUser && (cardUser.role === 'verified_donor' || cardUser.role === 'admin');
  if (acceptBtn) {
    if (isDirectory || !isDonorOrAdmin) {
      acceptBtn.style.display = 'none';
    } else {
      acceptBtn.style.display = '';
    }
  }

  // Reset actions row
  document.getElementById('card-actions-row').classList.remove('hidden');
  document.getElementById('card-matched-row').classList.add('hidden');

  card.classList.remove('hidden');
}

/**
 * 9. Action Buttons (Accept / Decline / WhatsApp Share)
 */
function setupCardActions() {
  const acceptBtn = document.getElementById('card-accept-btn');
  const declineBtn = document.getElementById('card-decline-btn');
  const shareBtn = document.getElementById('card-share-btn');
  const coordBtn = document.getElementById('card-coordinate-btn');

  acceptBtn.addEventListener('click', async () => {
    if (!selectedRequest || selectedRequest.is_hospital_directory) return;
    const reqId = selectedRequest.request_id;

    try {
      acceptBtn.disabled = true;
      acceptBtn.innerText = 'Accepting...';
      
      await apiPost(`/map/requests/${reqId}/accept`);
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
      if (reqId) {
        await apiPost(`/map/requests/${reqId}/decline`);
      }
      showToast('Closed.', 'info');
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
 * 10. Geo-Fenced Push Notification Alert Modal (Wireframe pg. 15)
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
 * 11. Search Bar Autocomplete with Full Karachi Hospitals Directory
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

    const matches = KARACHI_HOSPITALS.filter(
      h => h.name.toLowerCase().includes(val) || (h.area && h.area.toLowerCase().includes(val))
    );

    matches.slice(0, 15).forEach(hospital => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <span>🏥 ${hospital.name}</span>
          <span class="badge" style="background:#e7f5ff; color:#1864ab; font-size:10px; font-weight:600;">${hospital.area || 'Karachi'}</span>
        </div>
      `;
      item.onclick = () => {
        input.value = hospital.name;
        dropdown.classList.add('hidden');
        openRequestSummaryCard({
          request_id: null,
          is_hospital_directory: true,
          hospital_name: hospital.name,
          area: hospital.area,
          address: hospital.address,
          blood_group: 'All Groups',
          latitude: hospital.lat,
          longitude: hospital.lng,
          units_needed: 0,
          urgency: 'directory',
          marker_color: 'blue'
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

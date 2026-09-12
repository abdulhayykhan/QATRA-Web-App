const map = L.map('live-map', {
    zoomControl: false 
}).setView([24.8607, 67.0011], 12);

L.tileLayer('https://{s}://{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

L.control.zoom({ position: 'topright' }).addTo(map);

const karachiDonorsDatabase = [
    { id: "Donor #D-104", name: "Ahmed Raza", bloodType: "O-", lat: 24.8560, lng: 67.0420, inActiveCooldown: false, passedHealthCheck: true, distText: "1.2 km", etaText: "10 mins" },
    { id: "Donor #D-208", name: "Fatima Bibi", bloodType: "O-", lat: 24.8690, lng: 67.0580, inActiveCooldown: false, passedHealthCheck: true, distText: "2.3 km", etaText: "12 mins" },
    { id: "Donor #D-112", name: "Bilal Khan", bloodType: "O-", lat: 24.8510, lng: 67.0210, inActiveCooldown: true,  passedHealthCheck: true }, 
    { id: "Donor #D-305", name: "Zainab Ahmed", bloodType: "B+", lat: 24.8850, lng: 67.0210, inActiveCooldown: false, passedHealthCheck: true, distText: "5.1 km", etaText: "22 mins" },
    { id: "Donor #D-402", name: "Hamza Shafi", bloodType: "B+", lat: 24.8910, lng: 67.0150, inActiveCooldown: false, passedHealthCheck: true, distText: "5.8 km", etaText: "25 mins" },
    { id: "Donor #D-501", name: "Sana Malik", bloodType: "B+", lat: 24.8410, lng: 67.0650, inActiveCooldown: false, passedHealthCheck: false }  
];

const karachiHospitalsMasterList = [
    { name: "Jinnah Postgraduate Medical Centre (JPMC)", blood: "O-", lat: 24.8532, lng: 67.0343 },
    { name: "Dr. Ruth K.M. Pfau Civil Hospital Karachi", blood: "B+", lat: 24.8598, lng: 67.0112 },
    { name: "Indus Hospital & Health Network (Korangi)", blood: "A+", lat: 24.8394, lng: 67.1147 },
    { name: "The Aga Khan University Hospital (AKUH)", blood: "O-", lat: 24.8922, lng: 67.0747 },
    { name: "Liaquat National Hospital (LNH)", blood: "B+", lat: 24.8940, lng: 67.0700 },
    { name: "Abbasi Shaheed Hospital (Nazimabad)", blood: "A+", lat: 24.9220, lng: 67.0280 },
    { name: "Ziauddin Hospital (Clifton Campus)", blood: "AB-", lat: 24.8190, lng: 67.0320 },
    { name: "Patel Hospital (Gulshan-e-Iqbal)", blood: "O+", lat: 24.9230, lng: 67.1140 },
    { name: "Memon Medical Institute Hospital", blood: "B-", lat: 24.9380, lng: 67.1510 },
    { name: "Alkhidmat Hospital No. 5", blood: "O-", lat: 24.8712, lng: 67.0594 }
];

function calculateHaversineKM(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function filterHospitalSuggestions() {
    const input = document.getElementById('hospital-input').value.trim().toLowerCase();
    const dropdown = document.getElementById('suggestions-list');
    dropdown.innerHTML = "";

    if (!input) {
        dropdown.classList.add('hidden-element');
        return;
    }

    const filtered = karachiHospitalsMasterList.filter(h => h.name.toLowerCase().includes(input));

    filtered.forEach(hospital => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerText = hospital.name;
        item.onclick = () => runProximityDispatchPipeline(hospital);
        dropdown.appendChild(item);
    });

    if (filtered.length === 0) {
        const fallbackItem = document.createElement('div');
        fallbackItem.className = 'suggestion-item';
        fallbackItem.innerHTML = `📍 <em>No match found. Click to plot custom point on map...</em>`;
        fallbackItem.onclick = () => enableCrosshairCoordinatesPicker(document.getElementById('hospital-input').value);
        dropdown.appendChild(fallbackItem);
    }

    dropdown.classList.remove('hidden-element');
}

let currentActiveMarker = null;
let currentActiveRings = [];

function runProximityDispatchPipeline(hospital) {
    document.getElementById('hospital-input').value = hospital.name;
    document.getElementById('suggestions-list').classList.add('hidden-element');

    if (currentActiveMarker) map.removeLayer(currentActiveMarker);
    currentActiveRings.forEach(ring => map.removeLayer(ring));
    currentActiveRings = [];

    const targetBlood = hospital.blood || "O-";
    const rareBloodGroups = ['O-', 'AB-', 'A-', 'B-'];
    const isRareType = rareBloodGroups.includes(targetBlood);

    let currentRadius = 5; 
    const maxRadiusLimit = 15; 
    let finalMatchedDonorsList = [];

    const cleanAvailablePool = karachiDonorsDatabase.filter(donor => {
        return donor.bloodType === targetBlood && !donor.inActiveCooldown && donor.passedHealthCheck;
    });

    while (currentRadius <= maxRadiusLimit) {
        finalMatchedDonorsList = cleanAvailablePool.map(donor => {
            const distance = calculateHaversineKM(hospital.lat, hospital.lng, donor.lat, donor.lng);
            return { ...donor, distanceCalculated: parseFloat(distance.toFixed(1)) };
        })
        .filter(donor => donor.distanceCalculated <= currentRadius)
        .sort((a, b) => a.distanceCalculated - b.distanceCalculated);

        if (isRareType && currentRadius < maxRadiusLimit) {
            currentRadius = maxRadiusLimit;
            continue;
        }

        if (finalMatchedDonorsList.length >= 5 || currentRadius === maxRadiusLimit) {
            break; 
        }
        currentRadius += 5; 
    }

    map.flyTo([hospital.lat, hospital.lng], 14, { animate: true, duration: 1.5 });

    currentActiveMarker = L.circleMarker([hospital.lat, hospital.lng], {
        radius: 12,
        fillColor: '#D32F2F',
        color: '#FFFFFF',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.95
    }).addTo(map);

    const radialZones = [5000, 10000, 15000];
    const ringColors = ['#FFCDD2', '#EF9A9A', '#E57373'];

    radialZones.forEach((radius, index) => {
        const circle = L.circle([hospital.lat, hospital.lng], {
            color: '#D32F2F',
            fillColor: ringColors[index],
            fillOpacity: 0.04,
            radius: radius,
            weight: 1.5,
            dashArray: '6, 6'
        }).addTo(map);
        currentActiveRings.push(circle);
    });

    document.getElementById('card-blood').innerText = targetBlood;
    document.getElementById('hospital-name').innerText = hospital.name;
    
    const countValue = finalMatchedDonorsList.length;
    const distanceValue = countValue > 0 ? finalMatchedDonorsList[0].distanceCalculated + " km" : "1.8 km";
    const etaValue = countValue > 0 ? finalMatchedDonorsList[0].etaText : "14 mins";

    document.getElementById('geo-distance').innerText = distanceValue;
    document.getElementById('geo-eta').innerText = etaValue;
    document.getElementById('donor-count').innerText = countValue > 0 ? countValue : "2";

    const urgencyTag = document.getElementById('card-urgency');
    urgencyTag.innerText = isRareType ? "High Priority (Within 2 Hours)" : "Standard (Within 24 Hours)";
    urgencyTag.className = isRareType ? "urgency-tag high-urgency" : "urgency-tag standard-urgency";

    document.getElementById('request-card').classList.remove('hidden-element');
}

function enableCrosshairCoordinatesPicker(customName) {
    document.getElementById('suggestions-list').classList.add('hidden-element');
    alert("📍 Click directly on the map location below to drop your custom request marker pin precisely.");

    map.once('click', function(e) {
        const clickedCoordinatesHospital = {
            name: customName || "Custom Emergency Location",
            blood: "O-", 
            lat: e.latlng.lat,
            lng: e.latlng.lng
        };
        runProximityDispatchPipeline(clickedCoordinatesHospital);
    });
}

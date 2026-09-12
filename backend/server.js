/**
 * QATRA - Feature 1: Complete Unified Live Map Backend Server Module
 * Combines Routing, Mock Databases, and the Proximity Math Loop
 */

const express = require('express');
const cors = require('cors'); // Essential to let your Frontend talk to the Backend safely
const app = express();
const PORT = 5000;

// 1. Enable Global Server Middleware Configurations
app.use(cors());
app.use(express.json());

// 2. EMBEDDED MASTER DATABASE: Live Coordinates Across Major Karachi Neighborhoods
const karachiDonorsDatabase = [
    // --- Gulshan-e-Iqbal Area ---
    { id: "D-101", name: "Ahmed Raza", bloodType: "O-", lat: 24.9181, lng: 67.0972, inActiveCooldown: false, passedHealthCheck: true },
    { id: "D-102", name: "Zainab Bibi", bloodType: "O-", lat: 24.9220, lng: 67.0890, inActiveCooldown: false, passedHealthCheck: true },
    { id: "D-103", name: "Mustafa Kamal", bloodType: "O-", lat: 24.9110, lng: 67.0920, inActiveCooldown: true,  passedHealthCheck: true }, // Excluded (Cooldown)
    
    // --- Clifton / DHA Area ---
    { id: "D-201", name: "Bilal Khan", bloodType: "B+", lat: 24.8138, lng: 67.0312, inActiveCooldown: false, passedHealthCheck: true },
    { id: "D-202", name: "Sana Malik", bloodType: "B+", lat: 24.8250, lng: 67.0450, inActiveCooldown: false, passedHealthCheck: true },
    { id: "D-203", name: "Hamza Shafi", bloodType: "B+", lat: 24.8050, lng: 67.0210, inActiveCooldown: false, passedHealthCheck: false }, // Excluded (Health)

    // --- North Nazimabad Area ---
    { id: "D-301", name: "Asad Siddiqui", bloodType: "A+", lat: 24.9392, lng: 67.0425, inActiveCooldown: false, passedHealthCheck: true },
    { id: "D-302", name: "Mariam Khan", bloodType: "A+", lat: 24.9450, lng: 67.0510, inActiveCooldown: false, passedHealthCheck: true },
    
    // --- Korangi / Landhi Area ---
    { id: "D-401", name: "Usman Ghani", bloodType: "O-", lat: 24.8310, lng: 67.1230, inActiveCooldown: false, passedHealthCheck: true },
    { id: "D-402", name: "Faiza Rasheed", bloodType: "O-", lat: 24.8420, lng: 67.1350, inActiveCooldown: false, passedHealthCheck: true },
    { id: "D-403", name: "Yaseen Ali", bloodType: "O-", lat: 24.8290, lng: 67.1110, inActiveCooldown: false, passedHealthCheck: true }
];

// 3. CORE PROXIMITY MATHEMATICS: The Haversine Formula Algorithm Engine
function calculateHaversineKM(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 4. API SERVER ENDPOINT ROUTING: Handles Live Search Dispatches Instantly
app.post('/api/proximity-match', (req, res) => {
    const { hospitalName, lat, lng, bloodType } = req.body;

    if (!hospitalName || !lat || !lng || !bloodType) {
        return res.status(400).json({ error: "Missing required layout attributes configuration inputs." });
    }

    const rareBloodGroups = ['O-', 'AB-', 'A-', 'B-'];
    const isRareType = rareBloodGroups.includes(bloodType);
    
    let currentRadius = 10; // Default starts at 10km radius block parameters
    const maxRadiusLimit = 15; // Hard limits cap set by the PRD
    let eligibleMatches = [];

    // Filter step: Apply safety permissions, cooldown clocks, and checker variables
    const activeValidPool = karachiDonorsDatabase.filter(donor => {
        return donor.bloodType === bloodType && !donor.inActiveCooldown && donor.passedHealthCheck;
    });

    // Algorithmic expansion engine execution loop
    while (currentRadius <= maxRadiusLimit) {
        eligibleMatches = activeValidPool.map(donor => {
            const distance = calculateHaversineKM(lat, lng, donor.lat, donor.lng);
            return { id: donor.id, name: donor.name, distance: parseFloat(distance.toFixed(2)) };
        })
        .filter(donor => donor.distance <= currentRadius)
        .sort((a, b) => a.distance - b.distance);

        // Escalation Rules Check
        if (isRareType) {
            currentRadius = maxRadiusLimit; // Force instant maximum circle check parameters instantly
            continue;
        }

        if (eligibleMatches.length >= 5 || currentRadius === maxRadiusLimit) {
            break; 
        }
        
        currentRadius += 5; // Auto-escalate tracking metrics by 5km increment blocks
    }

    // Server Response Package Output Layout
    res.json({
        hospital: hospitalName,
        radiusScanned: `${currentRadius} km`,
        totalMatchedDonors: eligibleMatches.length,
        donors: eligibleMatches
    });
});

// 5. Fire up the Live Local Web Server Listener Engine Channel
app.listen(PORT, () => {
    console.log(`\n🚀 QATRA Proximity Server Online & Live!`);
    console.log(`📡 Access Endpoint Network Live via: http://localhost:${PORT}/api/proximity-match`);
});

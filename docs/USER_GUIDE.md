# 📖 QATRA (قطرہ) — Comprehensive Role-Based User Guide

### *Every Drop Connects. Every Second Counts.*

Welcome to the official operational user guide for **QATRA**, Pakistan’s premier emergency blood response Progressive Web Application. Whether you are an emergency seeker navigating a critical medical urgency, a volunteer donor ready to save a life, a hospital desk reviewer, or a community volunteer, this guide provides complete, step-by-step instructions.

---

## 📑 Table of Contents

- [1. Getting Started & Supported Platforms](#1-getting-started--supported-platforms)
- [2. Mobile Installation Guide (PWA)](#2-mobile-installation-guide-pwa)
  - [Android (Google Chrome / Edge / Samsung Internet)](#android-google-chrome--edge--samsung-internet)
  - [iOS (Apple Safari)](#ios-apple-safari)
  - [Desktop (Chrome / Edge / Safari / Brave)](#desktop-chrome--edge--safari--brave)
- [3. Emergency Blood Seeker Guide](#3-emergency-blood-seeker-guide)
  - [Step 1: Accessing the Emergency Portal](#step-1-accessing-the-emergency-portal)
  - [Step 2: Entering Patient & Hospital Requirements](#step-2-entering-patient--hospital-requirements)
  - [Step 3: Uploading the Hospital Admission Slip](#step-3-uploading-the-hospital-admission-slip)
  - [Step 4: Automated OCR & 24/7 Desk Verification](#step-4-automated-ocr--247-desk-verification)
  - [Step 5: Live Geospatial Radar & Concentric Radius Expansion](#step-5-live-geospatial-radar--concentric-radius-expansion)
  - [Step 6: Communicating with Matched Donors (Masked Calling)](#step-6-communicating-with-matched-donors-masked-calling)
  - [Step 7: Fulfilling & Closing the Emergency Request](#step-7-fulfilling--closing-the-emergency-request)
- [4. Voluntary Blood Donor Guide](#4-voluntary-blood-donor-guide)
  - [Step 1: Quick Onboarding with Google Sign-In](#step-1-quick-onboarding-with-google-sign-in)
  - [Step 2: 13-Digit Pakistani CNIC Verification](#step-2-13-digit-pakistani-cnic-verification)
  - [Step 3: Medical Pre-Screening Questionnaire](#step-3-medical-pre-screening-questionnaire)
  - [Step 4: Managing Donor Hub & Live Availability Toggle](#step-4-managing-donor-hub--live-availability-toggle)
  - [Step 5: Receiving & Responding to Hyper-Local Proximity Alerts](#step-5-receiving--responding-to-hyper-local-proximity-alerts)
  - [Step 6: Transit, Hospital Donation & Receiving Your Certificate](#step-6-transit-hospital-donation--receiving-your-certificate)
  - [Step 7: 90-Day Physiological Cooldown Tracker](#step-7-90-day-physiological-cooldown-tracker)
- [5. Public Appeals Feed & Community WhatsApp Sharer Guide](#5-public-appeals-feed--community-whatsapp-sharer-guide)
  - [Browsing the Urgent Appeals Feed](#browsing-the-urgent-appeals-feed)
  - [One-Tap "I Can Donate" Action](#one-tap-i-can-donate-action)
  - [One-Tap Clean WhatsApp Link Sharing](#one-tap-clean-whatsapp-link-sharing)
  - [Automatic Request Auto-Close Feature](#automatic-request-auto-close-feature)
- [6. 24/7 Verification Desk & Hospital Administrator Guide](#6-247-verification-desk--hospital-administrator-guide)
  - [Accessing the Split-Screen Verification Queue](#accessing-the-split-screen-verification-queue)
  - [Evaluating Flagged Admission Slips](#evaluating-flagged-admission-slips)
  - [Approving or Rejecting Slips with Medical Notes](#approving-or-rejecting-slips-with-medical-notes)
  - [Managing Campus Blood Drives & Community Sessions](#managing-campus-blood-drives--community-sessions)
  - [Auditing Tamper-Evident Security Logs](#auditing-tamper-evident-security-logs)
- [7. Public Awareness & Eligibility Quiz Guide](#7-public-awareness--eligibility-quiz-guide)
  - [Taking the 4-Step Preliminary Eligibility Quiz](#taking-the-4-step-preliminary-eligibility-quiz)
  - [Browsing the Educational Content Library](#browsing-the-educational-content-library)
  - [Registering for Campus Blood Drives](#registering-for-campus-blood-drives)
- [8. Security, Privacy & Data Protection](#8-security-privacy--data-protection)
- [9. Frequently Asked Questions (FAQ)](#9-frequently-asked-questions-faq)

---

## 1. Getting Started & Supported Platforms

QATRA is architected as an ultra-fast Progressive Web App. It requires no app store downloads and works seamlessly on modern web browsers across smartphones, tablets, laptops, and workstations.

- **Production URL**: [https://qatra-web-app.vercel.app](https://qatra-web-app.vercel.app)
- **Supported Mobile Browsers**: Google Chrome (Android 8+), Safari (iOS 14+), Samsung Internet, Microsoft Edge, Brave.
- **Supported Desktop Browsers**: Chrome, Edge, Safari, Firefox, Opera.
- **Internet Requirements**: Built with offline app shell caching. Can operate even on intermittent 3G/4G connections.

---

## 2. Mobile Installation Guide (PWA)

Installing QATRA to your home screen gives you full-screen standalone execution, faster load times, and instantaneous access during medical emergencies.

### Android (Google Chrome / Edge / Samsung Internet)
1. Open Chrome and navigate to [https://qatra-web-app.vercel.app](https://qatra-web-app.vercel.app).
2. Within 1.2 seconds, an **Apple-styled slide-up bottom sheet** will appear from the bottom of your screen.
3. Tap the bright red **"Install QATRA App"** button.
4. When Chrome prompts: *"Install app — QATRA Emergency Blood Response"*, tap **Install**.
5. The QATRA icon will appear on your home screen and app drawer.
6. *Alternative Manual Method*: If you previously dismissed the sheet, tap the three dots (**⋮**) in the top right of Chrome and select **"Install app"** or **"Add to Home screen"**.

### iOS (Apple Safari)
1. Launch Safari and navigate to [https://qatra-web-app.vercel.app](https://qatra-web-app.vercel.app).
2. An informative bottom sheet will appear illustrating the two-step installation gesture.
3. Tap the **Share button** (the square icon with an upward arrow: ⎋) at the bottom toolbar of Safari.
4. Scroll down the share sheet and tap **"Add to Home Screen"** (⊞).
5. In the top right corner, tap **Add**.
6. QATRA will now launch full-screen from your iPhone or iPad home screen without any Safari address bar.

### Desktop (Chrome / Edge / Safari / Brave)
1. In Google Chrome or Microsoft Edge, look at the right edge of the URL address bar.
2. Click the **Install icon** (a desktop monitor with a small down arrow).
3. Click **Install**. QATRA will open in an independent, distraction-free desktop window.

---

## 3. Emergency Blood Seeker Guide

When a family member or patient requires urgent blood, follow these steps to mobilize verified nearby donors:

### Step 1: Accessing the Emergency Portal
1. Open QATRA on your smartphone or computer.
2. On the home landing screen, tap the prominent primary button: **"Need Blood Urgently"** or navigate directly to `/seeker/request.html`.

### Step 2: Entering Patient & Hospital Requirements
Complete the emergency request form:
- **Patient Full Name**: Legal name of the patient as recorded on the hospital chart.
- **Patient Hospital MRN**: Medical Record Number or Admission Number (e.g., `MRN-99201`).
- **Hospital Selection**: Start typing your hospital name (e.g., *Civil Hospital Karachi*, *JPMC*, *Aga Khan University Hospital*, *Indus Hospital*). The system provides automatic autocomplete suggestions with verified coordinates.
- **Blood Group & Component**: Select the required blood group (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`) and component type (*Whole Blood*, *Packed Red Blood Cells*, *Platelets / Mega-units*, *Fresh Frozen Plasma*).
- **Units Needed**: Number of blood pints requested (1 to 6 units).
- **Urgency Level**:
  - *Emergency (Within 2 Hours)*: Dispatches immediate high-priority proximity alerts.
  - *Urgent (Within 24 Hours)*: For scheduled morning surgeries and planned transfusions.

### Step 3: Uploading the Hospital Admission Slip
> [!IMPORTANT]
> To eliminate fraudulent solicitations and commercial blood dealers, every request **must** be substantiated with an official hospital admission slip or doctor's requisition form.
1. Tap the **Drag & Drop Slip Area** or tap **"Browse File"**.
2. Capture a photo using your camera or upload an existing PDF, PNG, or JPG document.
3. **Tips for Instant Approval**:
   - Ensure adequate lighting with all 4 corners of the paper visible.
   - Make sure the **hospital header**, **doctor's stamp/signature**, and **patient name** are sharp and legible.
   - File size must be under 10 MB.

### Step 4: Automated OCR & 24/7 Desk Verification
1. Once uploaded, QATRA’s machine vision OCR engine scans the slip in $< 3$ seconds:
   - **Confidence $\ge 85\%$**: Status updates immediately to `verified`. Proximity matching starts instantly.
   - **Confidence $< 85\%$**: The slip is seamlessly routed to the **24/7 Human Verification Desk** staffed by Alkhidmat Foundation operators. Average verification takes under 4 minutes.

### Step 5: Live Geospatial Radar & Concentric Radius Expansion
Once verified, you will be redirected to the **Live Status Radar** (`/seeker/status.html`):
- **Phase 1 (0 to 15 minutes)**: Alerts donors within a **5 km** radius.
- **Phase 2 (15 to 30 minutes)**: If units remain unfulfilled, the radius automatically expands to **10 km**.
- **Phase 3 (30+ minutes)**: Automatic expansion to **15 km** across the metropolitan area.
- Watch live indicators for **Donors Alerted**, **Donors Accepted**, and **Estimated Arrival Times (ETA)**.

### Step 6: Communicating with Matched Donors (Masked Calling)
When a nearby donor accepts your appeal:
1. Tap **"Coordinate with Donor"** or open `/seeker/match.html`.
2. View the donor’s distance (e.g., `3.2 km away`) and arrival ETA (e.g., `12 minutes`).
3. Tap the green **"Call Donor"** button.
4. **Zero Exposure Privacy**: The call bridges automatically through QATRA’s virtual proxy line (`+92-21-3000-0000`). Neither party sees the other’s personal mobile number.

### Step 7: Fulfilling & Closing the Emergency Request
1. Once the required units have been donated and handed over to the hospital blood bank:
   - The request automatically closes when all units are fulfilled.
   - Or you can tap **"Close Request"** on `/seeker/closure.html`, selecting *"Fulfilled by matched donor"*, *"Fulfilled on-site"*, or *"Patient discharged"*.
2. Closing the request prevents unnecessary donor travel and re-opens donor availability.

---

## 4. Voluntary Blood Donor Guide

As a voluntary donor, your participation saves lives every day. Here is how to register, maintain your profile, and respond to emergency calls:

### Step 1: Quick Onboarding with Google Sign-In
1. Go to `/donor/register.html` and tap **"Continue with Google"**.
2. Sign in with your standard Google account. Your email and full name will be authenticated securely via Firebase.

### Step 2: 13-Digit Pakistani CNIC Verification
1. Enter your 13-digit National Identity Card number formatted as `XXXXX-XXXXXXX-X` (e.g., `42101-1234567-1`).
2. The platform performs an instant Mod-10 mathematical checksum to verify formatting integrity.
3. *Privacy Guarantee*: Your CNIC number is encrypted at rest with military-grade **AES-256-GCM** encryption. It is never displayed publicly or shared with seekers.

### Step 3: Medical Pre-Screening Questionnaire
Complete the brief pre-screening checklist:
- Age: Must be between **18 and 65 years old**.
- Weight: Minimum **50 kg** (110 lbs).
- General Health: Confirm absence of recent fever, antibiotic usage, active viral infections, or major dental surgery in the past 14 days.
- Piercings/Tattoos: Must be older than 6 months.

### Step 4: Managing Donor Hub & Live Availability Toggle
Navigate to your **Donor Hub** (`/donor/dashboard.html`):
1. **"Available to Donate" Toggle**:
   - Turn **ON** when you are healthy, in the city, and willing to receive proximity notifications.
   - Turn **OFF** when you are traveling, at work, asleep, or feeling unwell.
2. **Location Sharing**: When the toggle is ON, the app requests coarse browser geolocation to calculate travel distance to nearby hospital emergencies.

### Step 5: Receiving & Responding to Hyper-Local Proximity Alerts
When an emergency occurs at a hospital near your location:
1. You will receive an immediate push alert / banner notification displaying:
   - Blood Group Required (e.g., `O- Needed urgently`)
   - Hospital Name & Distance (e.g., `Indus Hospital — 4.1 km away`)
   - Urgency Tier (e.g., `Within 2 Hours`)
2. Tap **"I Can Donate"** to accept the alert.
3. If you cannot attend, tap **"Decline"**. Declining carries **no penalty** and immediately allows the platform to alert the next ranked candidate donor.

### Step 6: Transit, Hospital Donation & Receiving Your Certificate
1. Follow the route directions to the hospital blood bank.
2. Present your digital donor pass from `/donor/confirm.html` to the hospital transfusion desk.
3. After donation, hospital staff verify completion.
4. Tap **"Confirm Donation Completed"** to receive your **Life-Saver Digital Certificate** celebrating your heroic deed.

### Step 7: 90-Day Physiological Cooldown Tracker
1. Immediately upon donation confirmation, QATRA activates a **90-Day Medical Cooldown Safeguard**.
2. Red blood cells and iron stores require approximately 12 weeks to safely replenish.
3. Your Donor Hub displays a visual countdown ring showing days remaining until full eligibility.
4. During cooldown, the matching engine automatically excludes your profile from proximity alerts.

---

## 5. Public Appeals Feed & Community WhatsApp Sharer Guide

For social advocates, community volunteers, and family members wishing to amplify emergency requests:

### Browsing the Urgent Appeals Feed
1. Open `/seeker/feed.html`.
2. Filter appeals using the **Blood Group Chips** (`All`, `O-`, `A+`, `B+`, etc.) and **Urgency Filters** (`Critical (<2h)`, `Urgent (<24h)`).
3. Each appeal card displays the hospital name, units needed vs. units fulfilled, and elapsed time since verification.

### One-Tap "I Can Donate" Action
- If you are an eligible donor browsing the feed, tap the red **"I Can Donate"** button on any appeal card to immediately commit and notify the family.

### One-Tap Clean WhatsApp Link Sharing
- In Pakistan, WhatsApp forwarding often introduces typos, outdated dates, and expired requests.
- Tap **"Share via WhatsApp"** on any card. QATRA automatically compiles a structured, verified WhatsApp message:
  ```text
  🚨 *URGENT BLOOD NEEDED (QATRA VERIFIED)*
  Patient: Ali Khan (Civil Hospital Karachi)
  Blood Group: *B+* (2 Units Needed)
  Urgency: *Within 2 Hours*
  Verify & Respond: https://qatra-web-app.vercel.app/seeker/feed.html?req=101
  ```
- Tap Send in WhatsApp to post directly to your statuses and community groups.

### Automatic Request Auto-Close Feature
- When donors fulfill the required pints, the appeal card automatically transitions from *"Verified Active"* to *"Fulfilled"*. Anyone opening the WhatsApp link will see:
  `✅ This request has been successfully fulfilled. Thank you to our heroic donors!`
- This prevents unnecessary calls and distress to patient families days after discharge.

---

## 6. 24/7 Verification Desk & Hospital Administrator Guide

For Alkhidmat Foundation desk leads and hospital laboratory personnel:

### Accessing the Split-Screen Verification Queue
1. Log in with an administrator credential and open `/admin/verification.html`.
2. The desk presents a dual-pane layout:
   - **Left Pane**: Queue of unverified or low-confidence requests sorted by urgency.
   - **Right Pane**: High-resolution zoomable viewer for the uploaded admission slip.

### Evaluating Flagged Admission Slips
Inspect the document for mandatory compliance points:
1. **Hospital Identity**: Printed header or official letterhead of the hospital.
2. **Attending Physician Stamp**: Legible doctor's stamp and medical registration number.
3. **Blood Group & Component**: Explicitly stated requirement matching the user's form input.
4. **Recent Date**: Slip must be dated within the last 48 hours.

### Approving or Rejecting Slips with Medical Notes
- **To Approve**: Tap **"Approve & Dispatch"**. The request is instantaneously marked as `verified` and dispatched to surrounding donors.
- **To Reject**: Tap **"Reject Request"**, selecting a standardized reason:
  - *Illegible document / blur*
  - *Expired slip date*
  - *Missing doctor stamp*
  - *Mismatch with form details*
- The seeker is instantly notified with instructions to re-upload a clean photograph.

### Managing Campus Blood Drives & Community Sessions
1. Navigate to `/admin/drives.html`.
2. View upcoming blood drive drives scheduled at universities, corporate offices, and community centers.
3. Schedule new drives:
   - Set venue name (e.g., *Dawood University Main Lawn*), date, start/end times, and available donor slots.
4. Monitor live slot bookings and donor turnout in real time.

### Auditing Tamper-Evident Security Logs
1. Navigate to `/admin/audit.html`.
2. Review all access to sensitive records (CNIC decryptions, slip reviews, admin status overrides).
3. Every log record includes operator ID, target resource, cryptographic action, and UTC timestamp (NFR 2.5).

---

## 7. Public Awareness & Eligibility Quiz Guide

For students, first-time donors, and community members:

### Taking the 4-Step Preliminary Eligibility Quiz
1. Navigate to `/donor/eligibility.html`.
2. Answer 4 quick questions regarding:
   - *Step 1*: Age and weight
   - *Step 2*: Recent illnesses or fever
   - *Step 3*: Recent surgeries, dental work, or tattoos
   - *Step 4*: Prior donation date
3. Receive an instant color-coded verdict:
   - **Eligible**: Green badge encouraging registration.
   - **May Need Confirmation**: Yellow badge advising a check with laboratory staff.
   - **Temporarily Deferred**: Red badge detailing the safe waiting period.

### Browsing the Educational Content Library
1. Navigate to `/donor/awareness.html`.
2. Filter by topics:
   - **Basics**: How blood donation works, what happens to your pint.
   - **Myths vs. Facts**: Scientific explanations debunking cultural misconceptions (e.g., *"Does donating blood cause permanent weakness?"*).
   - **Health Preparation**: What to eat and drink before and after donating.

### Registering for Campus Blood Drives
1. Browse upcoming community drives on the Awareness page.
2. Tap **"Book Donor Slot"** to register your attendance in advance and receive an appointment reminder.

---

## 8. Security, Privacy & Data Protection

QATRA has been engineered from the ground up with a privacy-first posture:
- **AES-256-GCM Encryption**: All sensitive identity documents and National Identity Card (CNIC) numbers are encrypted using authenticated symmetric ciphers before writing to disk or database.
- **Strict Role-Based Access Control (RBAC)**: Only verified administrators with signed JWT tokens can access backend verification queues.
- **Zero Raw Phone Exposure**: Seekers and donors never receive each other’s personal cellular numbers. All communications occur via virtual proxy lines.
- **No Commercial Monetization**: QATRA is strictly non-profit and humanitarian. Data is never sold, traded, or shared with commercial entities.

---

## 9. Frequently Asked Questions (FAQ)

#### Q: How much does QATRA cost to use?
**A**: QATRA is **100% free** for seekers, donors, and hospitals. Selling or purchasing human blood is strictly illegal under national law.

#### Q: Can I donate blood if I have a tattoo or piercing?
**A**: Yes, provided the tattoo or piercing was done more than **6 months ago** using sterile, single-use equipment.

#### Q: How often can a healthy adult donate blood?
**A**: Healthy adult males can safely donate whole blood every **90 days (3 months)**; females can safely donate every **120 days (4 months)**.

#### Q: Why do I need to upload a hospital admission slip?
**A**: Requiring a verified slip ensures that requests correspond to genuine patients in medical facilities, preventing hoaxes and commercial exploitation.

#### Q: What if I don’t have internet access during a power outage?
**A**: QATRA’s Service Worker keeps the application interface and emergency contact numbers cached on your smartphone for offline viewing.

---

<div align="center">
  <b>QATRA Emergency Blood Response Platform</b><br>
  <i>For medical inquiries or platform support, contact your nearest Alkhidmat Blood Center.</i>
</div>

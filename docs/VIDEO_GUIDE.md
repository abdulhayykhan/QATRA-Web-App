# 🎬 QATRA (قطرہ) — Complete Video Recording & Demonstration Script

### *Every Drop Connects. Every Second Counts.*

A comprehensive, second-by-second video production blueprint for recording a complete, professional demonstration of **QATRA** (Progressive Web Application). 

This guide provides exact timestamps, camera/screen focus, on-screen actions, and dual-language voiceover scripts (**English** and **Roman Urdu**) showcasing every production flow end-to-end without any mock/demo data.

---

## 🎥 Official Demonstration Video & UI/UX Design

- 📺 **Official YouTube Demonstration**: [https://youtu.be/CXsLxy56ghA](https://youtu.be/CXsLxy56ghA)
- 🎨 **Official Figma UI/UX Design System**: [https://www.figma.com/design/XEFLbC0zv3ZM8NPRF53oHm/QATRA](https://www.figma.com/design/XEFLbC0zv3ZM8NPRF53oHm/QATRA)
- 🚀 **Live Production Deployment**: [https://qatra-web-app.vercel.app](https://qatra-web-app.vercel.app)

---

## 🎬 Published Video Structure (5 Core Production Scenes)

The published YouTube demonstration ([https://youtu.be/CXsLxy56ghA](https://youtu.be/CXsLxy56ghA)) condenses QATRA into 5 high-impact, verified production flows with 100% zero-mock data integrity:

| Scene | Duration | Module / Persona | Production Flow Showcased |
| :---: | :---: | :--- | :--- |
| **Scene 1** | ~1.5 min | **Platform & PWA Shell** | Apple HIG slide-up bottom sheet, 1-tap mobile installation prompt, standalone PWA execution, pure white design system. |
| **Scene 2** | ~2.5 min | **Emergency Seeker** | Seeker Google Auth Gate, 28+ Karachi hospital directory, real GPS pinning, admission slip upload & automated OCR analysis. |
| **Scene 3** | ~2.0 min | **Verified Donor** | Donor onboarding, 13-digit Pakistani CNIC Mod-10 checksum validation, WHO medical pre-screening, and real-time dispatch availability toggle. |
| **Scene 4** | ~3.0 min | **Radar & Coordination** | Proximity dispatch alert, donor acceptance, dynamic call unlocking (`🔒 Call Locked` $\rightarrow$ `📞 Call Donor`), strict donor privacy shield, and real-time in-app chat. |
| **Scene 5** | ~2.0 min | **Alkhidmat Desk Admin** | 24/7 Verification Desk queue, split-screen hospital slip review (94% OCR confidence), campus drive QR check-in terminal, and tamper-evident audit logs. |

---

## 📋 Production Specifications

| Attribute | Specification |
| :--- | :--- |
| **Official Demo URL** | `https://youtu.be/CXsLxy56ghA` |
| **Live Production URL** | `https://qatra-web-app.vercel.app` |
| **Design System** | `https://www.figma.com/design/XEFLbC0zv3ZM8NPRF53oHm/QATRA` |
| **Recording Viewports** | Mobile Device / Chrome DevTools Mobile Viewport (`390 x 844`, iPhone 14) + Desktop (`1920 x 1080`) |
| **Visual Highlights** | Apple HIG Design, Smooth Spring Animations, Real Location GPS, Strict Call Locking, Supabase RLS, Zero Mock Data |

---

## ⏱️ Detailed Scene Directory & Bilingual Recording Scripts

- **[Scene 1: Introduction & PWA Auto-Install Prompt](#scene-1-introduction--pwa-auto-install-prompt-000---050)** (0:00 - 0:50)
- **[Scene 2: Navigation & Real Google Sign-In](#scene-2-navigation--real-google-sign-in-050---145)** (0:50 - 1:45)
- **[Scene 3: Creating a Real Emergency Blood Appeal](#scene-3-creating-a-real-emergency-blood-appeal-145---315)** (1:45 - 3:15)
- **[Scene 4: Live Radar & Zero-Mock Empty State](#scene-4-live-radar--zero-mock-empty-state-315---430)** (3:15 - 4:30)
- **[Scene 5: Volunteer Donor Onboarding & Pakistani CNIC](#scene-5-volunteer-donor-onboarding--pakistani-cnic-430---600)** (4:30 - 6:00)
- **[Scene 6: Donor Proximity Alert & Dispatch Acceptance](#scene-6-donor-proximity-alert--dispatch-acceptance-600---715)** (6:00 - 7:15)
- **[Scene 7: Dispatch Coordination, Strict Call Lock & In-App Chat](#scene-7-dispatch-coordination-strict-call-lock--in-app-chat-715---900)** (7:15 - 9:00)
- **[Scene 8: 24/7 Verification Desk & Admin Security](#scene-8-247-verification-desk--admin-security-900---1030)** (9:00 - 10:30)
- **[Scene 9: Public Appeals Feed, WhatsApp Share & Closing](#scene-9-public-appeals-feed-whatsapp-share--closing-1030---1130)** (10:30 - 11:30)

---

## Scene 1: Introduction & PWA Auto-Install Prompt (0:00 - 0:50)

- **Viewport**: Mobile Viewport (`390 x 844`) or Real Smartphone Screen
- **Page**: `/index.html` (`https://qatra-web-app.vercel.app/`)
- **Visual Action**:
  1. Open the website on Chrome mobile or mobile emulation.
  2. Wait 1.2 seconds: Observe the **Apple HIG slide-up installation bottom sheet** (`📲 Install QATRA Web App`) smoothly appear with frosted-glass blur.
  3. Point the cursor to the *"1-Tap Install on Android Chrome"* and *"Add to Home Screen on iOS Safari"* visual guides.
  4. Dismiss or click **Install App**, then highlight the top PWA install header icon.

```markdown
🎙️ Voiceover (English):
"Welcome to QATRA — Pakistan's premier real-time emergency blood network developed for Alkhidmat Foundation. 
When an emergency strikes, every single second counts. That is why QATRA is architected as an ultra-responsive 
Progressive Web App. Notice how immediately upon opening the platform on any mobile device or browser, 
the install prompt smoothly slides up from the bottom. Users don't need to visit an App Store or wait for heavy 
downloads; with a single tap, QATRA installs directly to your home screen with offline capability and instant loading."

🎙️ Voiceover (Roman Urdu):
"QATRA me khush-amdeed — Pakistan ka pehla real-time emergency blood network jo Alkhidmat Foundation ke liye 
tayyar kiya gaya hai. Emergency situations me har aik second qeemti hota hai, is liye QATRA ko aik ultra-fast 
Progressive Web App ke tor par banaya gaya hai. Aap dekh sakte hain ke mobile browser par aate hi 1 second ke 
andar auto install bottom sheet screen par slide-up ho jati hai. Baghair kisi App Store download ke, real users 
sirf 1 tap me is app ko apne phone ki home screen par install kar sakte hain."
```

---

## Scene 2: Navigation & Real Google Sign-In (0:50 - 1:45)

- **Viewport**: Mobile Viewport transitioning to Desktop
- **Page**: `/index.html`
- **Visual Action**:
  1. Showcase the frosted glass bottom navigation bar with 4 tabs: **Home**, **Feed**, **Map**, **Donor**.
  2. Tap the Profile / Sign In icon on the top header.
  3. The Sign-In Sheet modal opens. Tap **"Continue with Google"**.
  4. Observe the real Firebase Google Authentication popup (`accounts.google.com`) appear, authenticate, and close.
  5. The profile banner instantly updates with the user's verified name, photo, and active status.

```markdown
🎙️ Voiceover (English):
"Let's explore the interface. The design system adheres strictly to Apple Human Interface Guidelines, featuring 
frosted glass translucency, responsive typography, and tactile spring animations. 
Authentication is powered by production Google OAuth through Firebase. When tapping 'Continue with Google', 
the official Google account selector launches securely. Once authenticated, user identity is verified and 
session tokens are encrypted."

🎙️ Voiceover (Roman Urdu):
"Interface par nazar daalein to yeh mukammal tor par Apple design system par mabni hai jisme smooth spring 
transitions aur glassmorphism shamil hain. Authentication real Google OAuth aur Firebase se powered hai. 
Jab hum 'Continue with Google' par tap karte hain to secure Google popup open hota hai aur account select karte 
hi user ka verified profile instantly load ho jata hai."
```

---

## Scene 3: Creating a Real Emergency Blood Appeal (1:45 - 3:15)

- **Viewport**: Mobile Viewport
- **Page**: `/seeker/request.html`
- **Visual Action**:
  1. From Home, tap the primary red button: **"🚨 Need Blood Urgently"**.
  2. Enter Patient Name: `Fatima Bibi`.
  3. Open the **Hospital Selector dropdown**:
     - Scroll through verified Karachi medical facilities: Show **Civil Hospital Karachi**, **Jinnah Postgraduate Medical Centre (JPMC)**, **The Indus Hospital**, **Aga Khan University Hospital**, and **Som Fauji Foundation Hospital (Shah Faisal Colony)**.
     - Select **Som Fauji Foundation Hospital, Shah Faisal Colony**.
  4. Tap the **"📍 Use Current GPS Location"** button:
     - Show browser GPS prompt granting permission.
     - Live coordinates auto-populate with accuracy radius.
  5. Select Blood Group: Tap **B+**.
  6. Set Units Needed: `2 Units`.
  7. Under Hospital Admission Slip: Click **"Upload Slip Photo"**, attach a sample doctor requisition slip image.
  8. Tap **"Broadcast Emergency Appeal 🚨"**:
     - The button shows an animated spinner: *"Uploading Slip & Running OCR Verification..."*.
     - Instant transition to the Live Radar screen.

```markdown
🎙️ Voiceover (English):
"Now, let's execute the most critical seeker flow: Creating an emergency blood appeal. 
The seeker enters patient details and selects from Karachi's comprehensive verified hospital directory — including 
Som Fauji Foundation Hospital in Shah Faisal, Civil Hospital, JPMC, and Indus Hospital. 
The GPS button instantly captures the exact geographic latitude and longitude of the medical facility. 
We select B Positive, choose 2 units, and upload the official hospital admission slip. 
Upon submission, QATRA's backend immediately encrypts the document, initiates optical character recognition, 
and launches the proximity matching radar."

🎙️ Voiceover (Roman Urdu):
"Ab hum seeker ka flow dekhte hain: Emergency blood request banana. 
Yahan seeker mareez ka naam darj karta hai aur verified Karachi hospitals ki list me se hospital select karta hai — 
jese Som Fauji Foundation Hospital Shah Faisal, Civil Hospital, ya JPMC. 
'Use Current GPS' par tap karte hi live location auto-detect ho kar exact coordinates fill ho jate hain. 
Blood group B+ aur 2 units select karne ke baad doctor ki hospital slip upload ki jati hai. 
Submit karte hi backend slip par automated OCR check chalata hai aur live radar broadcast start kar deta hai."
```

---

## Scene 4: Live Radar & Zero-Mock Empty State (3:15 - 4:30)

- **Viewport**: Mobile Viewport
- **Page**: `/seeker/status.html?request_id=...` & `/seeker/map.html`
- **Visual Action**:
  1. On the Seeker Radar screen, show the pulsating search radar icon (`📡`).
  2. Highlight the 3 status counters:
     - **Donors Alerted**: `0` (or real nearby registered count)
     - **Accepted**: `0`
     - **Scan Radius**: `10 km`
  3. Point the camera to the donor matches list:
     - Show the **clean empty state card**:
       `📡 No Donors Available Right Now`  
       *Radar is broadcasting your appeal to nearby compatible donors. Once a donor accepts your appeal, their live coordination status will appear here.*
  4. Emphasize that **NO fake or demo donors** (like old test donors) are shown.
  5. Switch to `/seeker/map.html`: Show the interactive Leaflet map canvas with the hospital emergency marker in Karachi and the search perimeter ring.

```markdown
🎙️ Voiceover (English):
"Notice the radical integrity of QATRA's production architecture: There is zero mock or fake data anywhere. 
Because this is a brand new emergency broadcast and no registered donor has confirmed dispatch yet, 
the radar displays a crystal-clear empty state: 'No Donors Available Right Now'. 
The system does not populate fake dummy profiles. Instead, the concentric geo-expansion engine actively broadcasts 
to real compatible donors within expanding rings — starting from 5 kilometers up to 15 kilometers across Karachi."

🎙️ Voiceover (Roman Urdu):
"Yahan QATRA ke real production architecture ki sab se bari khoobi dekhein: Kisi bhi qisam ka koi mock ya demo data 
nahi hai. Choonke abhi request broadcast hui hai aur kisi donor ne accept nahi kiya, is liye system clean empty state 
dikhata hai: 'No Donors Available Right Now'. 
Koi fake dummy donors nazar nahi aayenge. Radar background me Karachi ke 5 se 15 kilometer radius me real eligible 
donors ko push notifications bhej raha hai."
```

---

## Scene 5: Volunteer Donor Onboarding & Pakistani CNIC (4:30 - 6:00)

- **Viewport**: Mobile Viewport (In an Incognito Window / Second Browser Profile)
- **Page**: `/donor/register.html`
- **Visual Action**:
  1. Open `/donor/register.html`.
  2. Step 1: Personal Profile: Full Name: `Tariq Bilal`, Phone: `0300-1234567`, Blood Group: `B+`.
  3. Step 2: **Pakistani CNIC Validation**:
     - Type: `42101-8849201-3`.
     - Highlight the automated badge: `📍 Province: Sindh (Karachi Central)`.
     - Explain NADRA checksum verification.
  4. Step 3: Medical Pre-Screening:
     - Age: `24 years`, Weight: `68 kg`.
     - 4 WHO clinical checkboxes: No tattoos in 6 months, no fever/flu, not donated in past 90 days.
  5. Step 4: Click **"Complete Registration & Activate Donor Hub"**.
  6. Redirects to `/donor/dashboard.html`:
     - Show the **"Available for Emergency Dispatch"** toggle slider.
     - Toggle it ON: Live GPS coordinates register the donor within 3 km of the hospital.

```markdown
🎙️ Voiceover (English):
"Now let's switch perspective to Persona 2: The Verified Volunteer Donor. 
Registration is a frictionless 4-step onboarding wizard. In Step 2, the donor enters their 13-digit Pakistani CNIC. 
QATRA automatically validates the NADRA format and detects the origin province — in this case, Sindh, Karachi. 
The donor then passes the World Health Organization pre-screening criteria, verifying age, weight, and safety intervals. 
Once activated, the donor dashboard allows the volunteer to toggle their real-time emergency availability ON or OFF 
with full privacy control."

🎙️ Voiceover (Roman Urdu):
"Ab hum dusre user ki taraf aate hain: Verified Volunteer Donor. 
Donor registration 4 aasan steps par mushtamil hai. Step 2 me donor apna 13-digit Pakistani CNIC number darj karta hai. 
System automatically NADRA format validate karta hai aur province detect kar ke 'Sindh' show karta hai. 
Is ke baad WHO ke clinical screening sawalat (wazan, sehat, pichli donation) check hote hain. 
Dashboard par aate hi donor ke paas 'Live Availability' ka toggle button hota hai jise wo on ya off kar sakta hai."
```

---

## Scene 6: Donor Proximity Alert & Dispatch Acceptance (6:00 - 7:15)

- **Viewport**: Mobile Viewport (Donor Profile)
- **Page**: `/donor/dashboard.html` $\rightarrow$ Proximity Alert Card
- **Visual Action**:
  1. On the donor dashboard, an urgent proximity alert arrives:
     - *🚨 Emergency Blood Alert: B+ Needed at Som Fauji Foundation Hospital (2.8 km away)*.
  2. Donor inspects hospital address, patient urgency, and distance.
  3. Donor taps **"✅ Accept Dispatch & Coordinate"**:
     - Confirmation state updates instantly.
     - Request status switches to `matched`.

```markdown
🎙️ Voiceover (English):
"Because our volunteer is an eligible B Positive donor within the hospital's geographic perimeter, 
an instant proximity alert appears on their dashboard. 
The volunteer sees the hospital location, required blood group, and exact driving distance. 
Tapping 'Accept Dispatch' locks the unit, confirms transit commitment, and transitions the emergency to 
live coordination mode."

🎙️ Voiceover (Roman Urdu):
"Choonke donor B+ compatible hai aur hospital ke 3 kilometer ke daaire me mojood hai, un ke dashboard par 
instant emergency proximity alert display hota hai. 
Donor hospital ka naam, faasla aur urgency dekh kar 'Accept Dispatch' par tap karta hai. 
Accept hote hi request ka status 'matched' ho jata hai aur live coordination shuru ho jati hai."
```

---

## Scene 7: Dispatch Coordination, Strict Call Lock & In-App Chat (7:15 - 9:00)

- **Viewport**: Side-by-Side Dual Mobile Screens (Seeker on Left, Donor on Right)
- **Pages**: `/seeker/status.html` $\rightarrow$ `/seeker/coordination.html`
- **Visual Action**:
  1. **Seeker Screen Update**:
     - The radar immediately updates from empty state to show the accepted donor card:
       `Donor #D-102 • B+ • 2.8 km away • ✅ Dispatch Accepted`.
  2. **Strict Calling Permission Lock Demonstration**:
     - **Before Acceptance**: Show that if a donor has NOT accepted, the call button shows `🔒 Call Locked`, cellular phone numbers are completely redacted (`null`), and direct phone links are hidden with an advisory: *"Direct phone call unlocks after donor accepts request"*.
     - **After Acceptance**: Because this donor has accepted, the green button **`📞 Call Donor`** is unlocked with the clickable `tel:+923001234567` link.
  3. **Donor Privacy Shield**:
     - Look at the Donor's screen: The seeker's phone number is **never disclosed**. The donor has **no call button**, only an advisory explaining that direct calls are restricted to seekers to protect volunteers from harassment or commercial brokering.
  4. **Live In-App Chat Exchange**:
     - Seeker opens In-App Chat and types: *"Assalam o Alaikum! We are outside the Emergency Ward 2nd Floor."*
     - Instant arrival on Donor screen without page reload.
     - Donor replies: *"Walaikum Assalam, parked my bike outside main gate, entering elevator now."*
     - Both messages render in chronological bubbles with sender role badges.

```markdown
🎙️ Voiceover (English):
"Now observe QATRA's strict privacy and safety protocol:
First, direct cellular phone calls are strictly locked until a volunteer donor explicitly accepts the dispatch. 
Prior to acceptance, the donor's phone number is completely scrubbed from all APIs, and the seeker can only use 
secure In-App Chat. 
Once the volunteer accepts, the green 'Call Donor' button unlocks for the seeker, enabling direct cellular dialing 
to coordinate arrival at hospital gates.
Conversely, look at the donor's screen: To protect volunteer blood donors from unsolicited harassment, commercial brokering, 
or late-night calls, the seeker's phone number is permanently withheld. The donor coordinates exclusively via In-App Chat. 
Let's send a message — notice how real-time chat facilitates seamless coordination without compromising privacy."

🎙️ Voiceover (Roman Urdu):
"Ab QATRA ka sab se ahem security aur privacy feature dekhein:
Pehle — jab tak donor request accept na kare, direct phone call mukammal tor par LOCKED rehti hai. Phone number 
chupa hota hai aur seeker sirf In-App Chat kar sakta hai. 
Lekin jese hi donor request accept kar leta hai, seeker ke paas green 'Call Donor' button unlock ho jata hai taake 
wo hospital gate par donor se direct baat kar sake. 
Dusri taraf donor ki privacy ka mukammal tahaffuz kiya gaya hai: Donor ko seeker ka mobile number kabhi nazar 
nahi aata taake unhe beja calls ya brokers se bachaya ja sake. Donor sirf In-App Chat use karta hai. 
Aap dekh sakte hain dono ke darmiyan instant messaging real-time kaam kar rahi hai."
```

---

## Scene 8: 24/7 Verification Desk & Admin Security (9:00 - 10:30)

- **Viewport**: Desktop Viewport (`1920 x 1080`)
- **Pages**: `/admin/verification.html`, `/admin/drives.html`, `/admin/audit.html`
- **Visual Action**:
  1. Open `/admin/verification.html`:
     - Show the **Alkhidmat Desk Lead Authentication Gate** requiring authorized access.
     - Log in as admin: The split-screen verification queue appears.
     - Show the patient Fatima Bibi's case:
       - Zoom in on the high-resolution hospital admission slip.
       - Highlight the **OCR Confidence Score (94%)**, extracted doctor name, hospital match, and urgency tag.
       - Click **"Approve Appeal ✅"**.
  2. Switch to `/admin/drives.html`:
     - Show scheduled university and community blood drives (NED University, DUET, Karachi University).
     - Show the QR check-in terminal for volunteer check-ins.
  3. Switch to `/admin/audit.html`:
     - Show the **Tamper-Evident Audit Trail**: Every status change, login, slip review, and dispatch event is cryptographically logged with immutable timestamps.

```markdown
🎙️ Voiceover (English):
"On the administrative side, QATRA provides a 24/7 Verification Desk for Alkhidmat operations teams. 
Protected behind role-based authentication, desk officers review hospital admission slips in a split-screen interface. 
The system displays automated OCR extraction confidence metrics alongside the uploaded document, allowing instant approval 
or rejection with audit notes.
Administrators can also schedule campus blood drives with fast QR-code donor check-in, and review the tamper-evident 
audit log where every dispatch, review, and verification is permanently recorded."

🎙️ Voiceover (Roman Urdu):
"Admin side par Alkhidmat Foundation ke desk leads ke liye 24/7 Verification Portal banaya gaya hai. 
Authentication ke baad split-screen queue khulti hai jahan uploaded hospital slip aur OCR analysis ka confidence 
score (94%) nazar aata hai. Desk lead slip verify kar ke 'Approve' par click karta hai. 
Is ke ilawa campus blood drives ko manage kiya ja sakta hai jahan volunteers ke liye QR check-in terminal mojood hai, 
aur tamper-evident audit logs me har activity ka mukammal record mehfooz rehta hai."
```

---

## Scene 9: Public Appeals Feed, WhatsApp Share & Closing (10:30 - 11:30)

- **Viewport**: Mobile Viewport
- **Pages**: `/seeker/feed.html` $\rightarrow$ `/seeker/status.html` $\rightarrow$ `/seeker/closure.html`
- **Visual Action**:
  1. Open `/seeker/feed.html`:
     - Show the Public Appeals Feed with category filter chips (`All`, `A+`, `B+`, `O+`, `Platelets`).
     - Tap the **WhatsApp Share button** on an urgent appeal:
       - Show the pre-formatted, clean WhatsApp link preview with emergency details and live web tracking URL.
  2. On `/seeker/closure.html`:
     - The donation is completed: Seeker rates the volunteer 5 stars (`⭐⭐⭐⭐⭐`), submits thank-you note, and marks appeal resolved.
     - Final closing shot of the QATRA homepage with verified badges.

```markdown
🎙️ Voiceover (English):
"Finally, QATRA empowers the wider community through its Public Appeals Feed. Citizens can filter urgent blood needs 
across Karachi and broadcast appeals to family and neighborhood groups with one tap via clean WhatsApp formatting. 
Once blood units are received, the emergency appeal is marked complete, the donor enters a 90-day physiological rest cycle, 
and full transparency is maintained.
QATRA: Every Drop Connects. Every Second Counts. Available right now at qatra-web-app.vercel.app."

🎙️ Voiceover (Roman Urdu):
"Aakhir me QATRA community ko Public Appeals Feed ke zariye jorta hai jahan koi bhi shehri Karachi ki active blood 
appeals dekh sakta hai aur aik tap me WhatsApp par verify shuda appeal share kar sakta hai. 
Donation complete hone ke baad seeker 5-star rating deta hai, request close ho jati hai aur donor 90 din ke 
healthy rest period me chala jata hai. 
QATRA: Har Qatra Zindagi. Har Lamha Qeemti. Abhi visit karein qatra-web-app.vercel.app par."
```

---

## 💡 Practical Recording Tips for the Presenter

1. **Clean Browsing Session**: Use Google Chrome in clean profile or incognito window to showcase the instant 1.2s PWA bottom-sheet popup.
2. **Smooth Cursor & Pacing**: Keep cursor movements deliberate; pause for 1 to 2 seconds after each major screen transition so viewers can read the stats.
3. **Audio Levels**: Maintain voiceover volume at $-6\text{ dB}$ to $-12\text{ dB}$ with light background music ducked at $-25\text{ dB}$.
4. **Demonstrating Call Locking**: Make sure to explicitly point to the `🔒 Call Locked` button when viewing an unaccepted donor, and show how it dynamically turns into the green `📞 Call Donor` button once dispatch is accepted.

# QATRA — API Contract Specification (v1.0)

> **Document Status**: LOCKED (Phase 1 Approved)  
> **Backend Architecture**: FastAPI 0.115+  
> **Database**: Supabase (PostgreSQL)  
> **Authentication**: Firebase Authentication ("Continue with Google")  
> **Target Repository**: [https://github.com/abdulhayykhan/QATRA-Web-App](https://github.com/abdulhayykhan/QATRA-Web-App)

---

## 1. Global Conventions & Standards

### Base URL
All API routes are prefixed with `/api`.
- Local: `http://127.0.0.1:8000/api`
- Vercel Production: `https://<app-name>.vercel.app/api`

### Authentication & Authorization
- **Identity Provider**: Google Sign-In via Firebase Web SDK.
- **Header**: All protected requests require an `Authorization` header:
  ```http
  Authorization: Bearer <app_jwt_or_firebase_id_token>
  ```
- **RBAC Roles (`require_role(...)`)**:
  - `guest`: Unverified visitor (access to health check, eligibility checker, awareness library).
  - `verified_seeker`: Verified identity + CNIC. Can create emergency requests and upload hospital slips.
  - `verified_donor`: Verified identity + CNIC + passed pre-screening checklist. Receives proximity alerts.
  - `organizer`: Campus / Community Drive Lead. Can manage events and scan registrations.
  - `admin`: Alkhidmat Desk Lead / System Admin. Full access to verification queue and fraud logs.

### Standard Response Formats
#### Success Response
Standard JSON payload, HTTP `200 OK` or `201 Created`.

#### Standard Error Response (RFC 7807 inspired)
```json
{
  "detail": "Descriptive error message",
  "error_code": "INVALID_CREDENTIALS",
  "timestamp": "2026-09-08T02:30:00Z"
}
```

### Privacy & Data Masking Rule (NFR 2.2)
> [!IMPORTANT]
> Raw phone numbers and raw 13-digit CNIC plain text are **strictly forbidden** in public response bodies. All contact coordination is conducted via masked proxy identifiers.

---

## 2. Health & System

### `GET /api/health`
Verify backend service and routing availability.
- **Auth**: None
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "app": "QATRA Emergency Blood Response Platform",
  "version": "1.0.0",
  "timestamp": "2026-09-08T02:30:18.966181+05:00",
  "environment": "development"
}
```

---

## 3. Feature 2: Authentication, Authorization & Verification (PRD Section 4)
*Owner: Saghir Ahmed*

### 3.1 `POST /api/auth/firebase-login`
Verifies Firebase ID token obtained from Google Sign-In, syncs/creates the user in Supabase, and returns an application JWT session.
- **Auth**: None (Valid Firebase ID Token in body)
- **Request Body**:
```json
{
  "firebase_id_token": "eyJhbGciOiJSUzI1NiIs..."
}
```
- **Response**: `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 14,
    "firebase_uid": "firebase_uid_12345",
    "email": "user@example.com",
    "full_name": "Ahmad Raza",
    "role": "guest",
    "is_verified": false,
    "cnic_verified": false
  }
}
```

### 3.2 `GET /api/auth/me`
Fetches authenticated user profile, roles, and verification status.
- **Auth**: Required (`guest`, `verified_seeker`, `verified_donor`, `organizer`, `admin`)
- **Response**: `200 OK`
```json
{
  "id": 14,
  "firebase_uid": "firebase_uid_12345",
  "email": "user@example.com",
  "full_name": "Ahmad Raza",
  "role": "verified_donor",
  "is_active": true,
  "is_verified": true,
  "cnic_verified": true,
  "created_at": "2026-09-08T00:00:00Z",
  "updated_at": "2026-09-08T01:00:00Z"
}
```

### 3.3 `POST /api/auth/cnic/submit`
Validates 13-digit Pakistani CNIC checksum and attaches encrypted CNIC verification documents.
- **Auth**: Required (`guest`)
- **Request Body**:
```json
{
  "cnic_number": "4210112345671",
  "front_image_url": "https://vault.supabase.co/cnic_front_hash.jpg",
  "back_image_url": "https://vault.supabase.co/cnic_back_hash.jpg"
}
```
- **Response**: `200 OK`
```json
{
  "status": "pending_verification",
  "message": "CNIC submitted and checksum validated. Encrypted at rest.",
  "cnic_verified": true
}
```

### 3.4 `POST /api/auth/hospital-slip/upload`
Uploads hospital admission slip and triggers OCR processing for automated extraction.
- **Auth**: Required (`verified_seeker`, `admin`)
- **Request**: Multipart Form Data (`file`: image/pdf, `patient_name`: string, `hospital_name`: string, `blood_group`: string, `units_needed`: int)
- **Response**: `201 Created`
```json
{
  "request_id": 101,
  "ocr_confidence": 0.91,
  "status": "verified",
  "extracted_data": {
    "hospital_name": "Civil Hospital Karachi",
    "patient_mrn": "MRN-88291",
    "doctor_stamp_detected": true,
    "blood_group": "B+",
    "units_needed": 2
  }
}
```
*(If OCR confidence < 85%, `status` returns `"pending_verification"` and escalates to the 24/7 Desk).*

### 3.5 `GET /api/auth/admin/verification-queue`
Lists flagged slips requiring manual verification by Alkhidmat Desk Leads.
- **Auth**: Required (`admin`)
- **Response**: `200 OK`
```json
[
  {
    "request_id": 102,
    "patient_name": "Zainab Bibi",
    "hospital_name": "JPMC Karachi",
    "admission_slip_url": "https://vault.supabase.co/slips/slip_102.jpg",
    "ocr_confidence": 0.72,
    "created_at": "2026-09-08T02:15:00Z"
  }
]
```

### 3.6 `POST /api/auth/admin/verify-slip/{request_id}`
Admin manual approval or rejection of a flagged admission slip.
- **Auth**: Required (`admin`)
- **Request Body**:
```json
{
  "decision": "approved",
  "notes": "Doctor stamp and MRN verified via hospital directory."
}
```
- **Response**: `200 OK`
```json
{
  "request_id": 102,
  "status": "verified",
  "verified_by_admin_id": 1
}
```

### 3.7 `GET /api/auth/donor/cooldown`
Returns donor's current 90-day cooldown status.
- **Auth**: Required (`verified_donor`)
- **Response**: `200 OK`
```json
{
  "is_on_cooldown": false,
  "last_donation_date": "2026-05-10T10:00:00Z",
  "cooldown_until": "2026-08-08T10:00:00Z",
  "days_remaining": 0,
  "status": "Eligible & Active"
}
```

### 3.8 `POST /api/auth/donor/pre-screen`
Submits interactive pre-screening checklist scoring.
- **Auth**: Required (`verified_donor`, `guest`)
- **Request Body**:
```json
{
  "age": 24,
  "weight_kg": 68.5,
  "hemoglobin_g_dl": 14.2,
  "has_recent_illness": false,
  "has_recent_tattoo_or_surgery": false
}
```
- **Response**: `200 OK`
```json
{
  "pre_screening_passed": true,
  "eligibility": "eligible",
  "message": "Pre-screening passed. You are active in the donor matching pool."
}
```

---

## 4. Feature 1: Live Map Integration & Proximity Matching (PRD Section 3)
*Owner: Hareem Israr*

### 4.1 `POST /api/map/donor/location`
Throttled location update for donors (called every 2–5 minutes when "Available to Donate" is ON).
- **Auth**: Required (`verified_donor`)
- **Request Body**:
```json
{
  "latitude": 24.8607,
  "longitude": 67.0011
}
```
- **Response**: `200 OK`
```json
{
  "status": "updated",
  "timestamp": "2026-09-08T02:25:00Z"
}
```

### 4.2 `GET /api/map/requests`
Returns verified emergency requests formatted as map markers with anonymized hospital coordinates.
- **Auth**: Required (`guest`, `verified_donor`, `verified_seeker`)
- **Query Params**:
  - `latitude`: float (optional viewer center)
  - `longitude`: float (optional viewer center)
  - `radius_km`: float (default 15.0)
- **Response**: `200 OK`
```json
[
  {
    "request_id": 101,
    "hospital_name": "Civil Hospital Karachi",
    "latitude": 24.8569,
    "longitude": 67.0112,
    "blood_group": "B+",
    "units_needed": 2,
    "urgency": "within_2_hours",
    "marker_color": "red"
  }
]
```

### 4.3 `GET /api/map/requests/{request_id}/status`
Polled by seekers to monitor real-time fulfillment progress.
- **Auth**: Required (`verified_seeker`)
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "status": "matched",
  "units_needed": 2,
  "units_fulfilled": 1,
  "donors_alerted_count": 8,
  "donors_accepted_count": 1,
  "current_radius_km": 10.0,
  "eta_minutes": 18
}
```

### 4.4 `GET /api/map/requests/{request_id}/matches`
Internal proximity-ranked matching output (Haversine distance).
- **Auth**: Required (`verified_seeker`, `admin`)
- **Response**: `200 OK`
```json
[
  {
    "donor_id": 402,
    "blood_group": "B+",
    "distance_km": 3.4,
    "estimated_arrival_minutes": 14,
    "is_available": true
  },
  {
    "donor_id": 519,
    "blood_group": "O+",
    "distance_km": 5.8,
    "estimated_arrival_minutes": 22,
    "is_available": true
  }
]
```

### 4.5 `POST /api/map/requests/{request_id}/accept`
Donor accepts an emergency proximity alert.
- **Auth**: Required (`verified_donor`)
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "status": "matched",
  "message": "Match confirmed. Initializing masked proxy contact.",
  "proxy_channel_id": "px-99218"
}
```

### 4.6 `POST /api/map/requests/{request_id}/decline`
Donor declines alert; marks donor as deprioritized for this specific request.
- **Auth**: Required (`verified_donor`)
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "status": "declined",
  "message": "Alert declined. You remain eligible for other requests."
}
```

### 4.7 `POST /api/map/requests/{request_id}/cancel`
Donor cancels prior acceptance (due to emergency/traffic), immediately triggering re-dispatch.
- **Auth**: Required (`verified_donor`)
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "status": "re_dispatched",
  "message": "Acceptance cancelled. Request re-opened to next-ranked donors."
}
```

### 4.8 `POST /api/map/proxy-call/{request_id}/initiate`
Initiates masked proxy calling / in-app bridging without exposing real phone numbers.
- **Auth**: Required (`verified_seeker`, `verified_donor`)
- **Response**: `200 OK`
```json
{
  "proxy_call_id": "call_br_88392",
  "virtual_number": "+922130000000",
  "status": "connecting",
  "expires_in_seconds": 600
}
```

---

## 5. Feature 3: Social & Urgent Request Feed (PRD Section 5)
*Owner: Mahrukh Baig*

> **Architectural Note on Request Lifecycle & Creation**:
> - **Single Creation Point**: Per PRD Section 4 & FR 2.2, emergency blood requests are created **strictly** via `POST /api/auth/hospital-slip/upload` (owned by Saghir Ahmed). Every request is gated by hospital slip verification and OCR extraction before appearing publicly. The Feed module does **not** create raw requests; it provides the public query, discovery, and response interface for verified requests.
> - **Automatic Request Auto-Close (FR 3.4)**: Whenever recorded donations meet the requirement (`units_fulfilled >= units_needed`), the internal backend service automatically transitions the request status to `"fulfilled"`. The manual close endpoint below serves as an override for seekers or desk admins.

### 5.1 `GET /api/feed`
Public feed with query filters (replaces unorganized WhatsApp broadcasts per FR 3.2).
- **Auth**: None (publicly viewable)
- **Query Params**:
  - `blood_group`: string (optional, e.g. `A+`, `O-`)
  - `urgency`: string (optional, `within_2_hours`, `within_24_hours`)
  - `location`: string (optional city / district)
  - `include_drive_events`: bool (optional, default `false` — toggles drive events alongside emergency requests per FR 3.2)
  - `event_id`: int (optional, filters requests associated with a specific donation drive)
  - `page`: int (default 1)
  - `limit`: int (default 20)
- **Response**: `200 OK`
```json
{
  "total": 42,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "request_id": 101,
      "patient_name": "Ali Khan",
      "hospital_name": "Civil Hospital Karachi",
      "blood_group": "B+",
      "component_type": "Whole Blood",
      "units_needed": 2,
      "units_fulfilled": 0,
      "urgency": "within_2_hours",
      "status": "verified",
      "created_at": "2026-09-08T02:00:00Z"
    }
  ]
}
```

### 5.2 `GET /api/feed/{request_id}`
Retrieves single request card details.
- **Auth**: None
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "patient_name": "Ali Khan",
  "hospital_name": "Civil Hospital Karachi",
  "hospital_address": "Mission Rd, New Karachi",
  "hospital_latitude": 24.8569,
  "hospital_longitude": 67.0112,
  "blood_group": "B+",
  "component_type": "Whole Blood",
  "units_needed": 2,
  "units_fulfilled": 0,
  "urgency": "within_2_hours",
  "status": "verified",
  "search_radius_km": 10.0,
  "created_at": "2026-09-08T02:00:00Z"
}
```

### 5.3 `POST /api/feed/{request_id}/respond`
"I Can Donate" one-tap response button from feed post (FR 3.3).
- **Auth**: Required (`verified_donor`)
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "response_recorded": true,
  "message": "Thank you! The seeker has been notified."
}
```

### 5.4 `GET /api/feed/{request_id}/share`
Generates structured metadata for sharing via direct URL or WhatsApp forward without garbled text (FR 3.3).
- **Auth**: None
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "share_url": "https://qatra.pk/requests/101",
  "whatsapp_text": "🚨 *URGENT BLOOD NEEDED (QATRA)*\nBlood Group: *B+*\nHospital: *Civil Hospital Karachi*\nUnits Needed: *2*\nUrgency: *Within 2 Hours*\nVerify & Respond: https://qatra.pk/requests/101"
}
```

### 5.5 `POST /api/feed/{request_id}/close`
Manual override to close an active request (FR 3.4).
- **Auth**: Required (`verified_seeker`, `admin`)
- **Request Body**:
```json
{
  "reason": "Fulfilled on-site by family donor"
}
```
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "status": "fulfilled",
  "message": "Request closed. Donors have been notified."
}
```

---

### 5.6 Shared Internal Notification Service (Section 5.3 & PRD FR 1.3)
*Shared backend service between Feature 1 (Hareem: Map) and Feature 3 (Mahrukh: Feed).*

Rather than a public REST route, this is an internal domain service located at `backend/app/services/notifications.py`:

```python
async def dispatch_blood_alert(
    request_id: int,
    blood_group: str,
    hospital_name: str,
    hospital_lat: float,
    hospital_lon: float,
    urgency: str,
    is_rare: bool,
    target_donor_ids: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """
    Shared dispatch engine:
    1. Map Integration (Hareem): Dispatches targeted proximity push alerts to ranked donors.
    2. Feed Integration (Mahrukh): Triggers immediate high-priority broadcast for rare groups (O-, AB-).
    """
```

---

## 6. Feature 4: Awareness Sessions & Eligibility Module (PRD Section 6)
*Owner: Yumna Abbasi*

### 6.1 `POST /api/awareness/eligibility-check`
Stateless 4-step eligibility quiz returning actionable result and statutory disclaimer.

> **Note on 4-Step Structure**:
> - **Step 1 (Input)**: Core criteria (`step1_age`, `step1_weight_kg`)
> - **Step 2 (Input)**: Recent health conditions (`step2_has_recent_illness`)
> - **Step 3 (Input)**: Recovery & cooldown status (`step3_donated_within_90_days`)
> - **Step 4 (Output)**: Final Eligibility Result returned in the response payload (`result: "eligible" | "may_need_confirmation" | "not_eligible"`).

- **Auth**: None (available to guests)
- **Request Body**:
```json
{
  "step1_age": 22,
  "step1_weight_kg": 62,
  "step2_has_recent_illness": false,
  "step3_donated_within_90_days": false
}
```
- **Response**: `200 OK`
```json
{
  "result": "eligible",
  "summary": "Eligible to Proceed",
  "message": "Based on your preliminary answers, you meet initial donor criteria.",
  "disclaimer": "This quiz is for preliminary screening only. Final eligibility is determined on-site by qualified medical staff."
}
```
*(Alternative `result` values: `"may_need_confirmation"`, `"not_eligible"`).*

### 6.2 `GET /api/awareness/content`
Browse educational library (articles, videos, FAQs, myths vs facts).
- **Auth**: None
- **Query Params**:
  - `category`: string (`basics`, `myths_facts`, `health_prep`, `cultural`)
- **Response**: `200 OK`
```json
[
  {
    "id": 1,
    "title": "Does donating blood cause permanent weakness?",
    "category": "myths_facts",
    "content_type": "myth_vs_fact",
    "content_url": "https://www.youtube.com/watch?v=example",
    "myth": "Donating blood permanently decreases stamina and weakens immunity.",
    "fact": "The body replenishes fluid volume in 24-48 hours and red cells within weeks. Regular donation is healthy for adults.",
    "read_time_minutes": 2
  }
]
```

### 6.3 `GET /api/awareness/events`
Lists upcoming blood donation drives and campus awareness sessions.
- **Auth**: None
- **Query Params**:
  - `event_type`: string (`blood_drive`, `awareness_session`)
- **Response**: `200 OK`
```json
[
  {
    "id": 5,
    "title": "NED University Annual Emergency Blood Drive",
    "event_type": "blood_drive",
    "date_time": "2026-09-15T09:00:00Z",
    "location_name": "NED University Main Auditorium, Karachi",
    "slots_total": 200,
    "slots_booked": 48
  }
]
```

### 6.4 `POST /api/awareness/events/{event_id}/register`
User registers as a donor or volunteer for an upcoming event.
- **Auth**: Required (`guest`, `verified_donor`, `verified_seeker`)
- **Request Body**:
```json
{
  "event_id": 5,
  "registration_type": "donor"
}
```
- **Response**: `201 Created`
```json
{
  "registration_id": 12,
  "event_id": 5,
  "status": "confirmed",
  "message": "Registration confirmed. An in-app confirmation and email notification have been sent."
}
```

### 6.5 `GET /api/awareness/donor/health-feedback`
Retrieves post-donation health guidelines and screening outcomes for the authenticated user.
- **Auth**: Required (`verified_donor`)
- **Response**: `200 OK`
```json
{
  "last_donation_date": "2026-05-10T10:00:00Z",
  "screening_outcome": "Passed",
  "post_donation_instructions": [
    "Drink plenty of fluids over the next 24-48 hours.",
    "Avoid strenuous physical exercise for the rest of the day.",
    "Keep the bandage on for at least 4 hours."
  ],
  "next_eligible_date": "2026-08-08T10:00:00Z"
}
```

---

## 7. Change Management Policy

Per Section 1 of the Task Distribution Guide:
1. No teammate or AI tool may invent new endpoint names or modify these contracts unilaterally.
2. Any modifications require an issue or PR to this contract file first, reviewed and approved by the Team Lead (**Abdul Hayy Khan**).

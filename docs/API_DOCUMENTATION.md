# 📡 QATRA REST API Reference & Specification (v1.0)

### *Complete Endpoint Contract, Request/Response Schemas, and Authentication Protocol*

[![YouTube Demo](https://img.shields.io/badge/YouTube-Official%20Demo%20Video-FF0000?style=flat&logo=youtube&logoColor=white)](https://youtu.be/CXsLxy56ghA)
[![Figma Design](https://img.shields.io/badge/Figma-Design%20System-F24E1E?style=flat&logo=figma&logoColor=white)](https://www.figma.com/design/XEFLbC0zv3ZM8NPRF53oHm/QATRA)
[![Live Production](https://img.shields.io/badge/Vercel-Live%20API-000000?style=flat&logo=vercel)](https://qatra-web-app.vercel.app/api/docs)
[![Supabase RLS](https://img.shields.io/badge/Supabase%20RLS-Enforced-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)

---

## 📑 Table of Contents

- [1. General Conventions & Authentication](#1-general-conventions--authentication)
  - [Base URLs](#base-urls)
  - [Authentication Scheme (Bearer JWT)](#authentication-scheme-bearer-jwt)
  - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
  - [Row-Level Security (RLS) & Zero-Mock Guarantee](#row-level-security-rls--zero-mock-guarantee)
  - [Standard HTTP Status Codes](#standard-http-status-codes)
  - [Error Response Format (RFC 7807)](#error-response-format-rfc-7807)
- [2. System & Health Diagnostics](#2-system--health-diagnostics)
  - [`GET /api/health`](#get-apihealth)
- [3. Authentication & Verification Desk API (Saghir Ahmed)](#3-authentication--verification-desk-api-saghir-ahmed)
  - [`POST /api/auth/firebase-login`](#post-apiauthfirebase-login)
  - [`GET /api/auth/me`](#get-apiauthme)
  - [`POST /api/auth/cnic/submit`](#post-apiauthcnicsubmit)
  - [`POST /api/auth/hospital-slip/upload`](#post-apiauthhospital-slipupload)
  - [`GET /api/auth/admin/verification-queue`](#get-apiauthadminverification-queue)
  - [`POST /api/auth/admin/verify-slip/{id}`](#post-apiauthadminverify-slipid)
  - [`GET /api/auth/admin/audit-logs`](#get-apiauthadminaudit-logs)
  - [`GET /api/auth/donor/cooldown`](#get-apiauthdonorcooldown)
  - [`POST /api/auth/donor/pre-screen`](#post-apiauthdonorpre-screen)
- [4. Live Map & Proximity Matching API (Hareem Israr)](#4-live-map--proximity-matching-api-hareem-israr)
  - [`POST /api/map/donor/location`](#post-apimapdonorlocation)
  - [`GET /api/map/requests`](#get-apimaprequests)
  - [`GET /api/map/requests/my-active`](#get-apimaprequestsmy-active)
  - [`GET /api/map/requests/{id}/status`](#get-apimaprequestsidstatus)
  - [`GET /api/map/requests/{id}/matches`](#get-apimaprequestsidmatches)
  - [`POST /api/map/requests/{id}/accept`](#post-apimaprequestsidaccept)
  - [`POST /api/map/requests/{id}/decline`](#post-apimaprequestsiddecline)
  - [`POST /api/map/requests/{id}/cancel`](#post-apimaprequestsidcancel)
  - [`GET /api/coordination/{id}`](#get-apicoordinationid)
  - [`GET /api/coordination/{id}/messages`](#get-apicoordinationidmessages)
  - [`POST /api/coordination/{id}/messages`](#post-apicoordinationidmessages)
- [5. Urgent Social Feed & Sharing API (Mahrukh Baig)](#5-urgent-social-feed--sharing-api-mahrukh-baig)
  - [`GET /api/feed`](#get-apifeed)
  - [`GET /api/feed/{id}`](#get-apifeedid)
  - [`POST /api/feed/{id}/respond`](#post-apifeedidrespond)
  - [`GET /api/feed/{id}/share`](#get-apifeedidshare)
  - [`POST /api/feed/{id}/close`](#post-apifeedidclose)
- [6. Awareness & Eligibility Module API (Yumna Abbasi)](#6-awareness--eligibility-module-api-yumna-abbasi)
  - [`POST /api/awareness/eligibility-check`](#post-apiawarenesseligibility-check)
  - [`GET /api/awareness/content`](#get-apiawarenesscontent)
  - [`GET /api/awareness/events`](#get-apiawarenessevents)
  - [`POST /api/awareness/events/{id}/register`](#post-apiawarenesseventsidregister)
  - [`GET /api/awareness/donor/health-feedback`](#get-apiawarenessdonorhealth-feedback)
- [7. Rate Limiting Limits (NFR 2.6)](#7-rate-limiting-limits-nfr-26)

---

## 1. General Conventions & Authentication

### Base URLs
- **Local Development**: `http://127.0.0.1:8000/api`
- **Vercel Production**: `https://qatra-web-app.vercel.app/api`

### Authentication Scheme (Bearer JWT)
All protected endpoints require a valid Bearer token in the `Authorization` request header:
```http
Authorization: Bearer <app_jwt_token>
```
Tokens are issued upon calling `POST /api/auth/firebase-login`.

### Role-Based Access Control (RBAC)
- `guest`: Unverified visitor.
- `verified_seeker`: Authenticated Google identity (+ CNIC for emergency creation). Can upload hospital admission slips and create emergency appeals.
- `verified_donor`: Authenticated Google identity + CNIC + passed pre-screening checklist. Receives proximity alerts and reports spatial telemetry.
- `organizer`: Campus or community drive coordinator. Can schedule events.
- `admin`: Alkhidmat Foundation Desk Lead / System Administrator. Full access to verification queues and security audit logs.

### Row-Level Security (RLS) & Zero-Mock Guarantee
1. **Supabase PostgreSQL RLS**: All 9 database tables enforce PostgreSQL Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`). Unauthenticated requests attempting to query public database APIs are rejected, ensuring all data mutations flow strictly through FastAPI's authenticated business logic layer.
2. **Zero-Mock Policy**: The entire platform operates strictly against persistent database models. Mock data, hardcoded dummy donors, and fake responses have been eradicated. When no donors or requests exist, the API returns authentic empty lists with HTTP 200 status.

### Standard HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Input payload validation error or malformed data.
- `401 Unauthorized`: Missing or invalid Bearer token.
- `403 Forbidden`: Authenticated user lacks the necessary RBAC role.
- `404 Not Found`: Requested resource does not exist.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Unhandled server exception.

### Error Response Format (RFC 7807)
```json
{
  "detail": "Description of the error",
  "error_code": "INVALID_CHECKSUM",
  "timestamp": "2026-09-13T02:30:00Z"
}
```

---

## 2. System & Health Diagnostics

### `GET /api/health`
Performs live health checks across core dependencies (PostgreSQL pool, in-memory cache, and fallback mode).
- **Access**: Public
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "app": "QATRA Emergency Blood Response Platform",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2026-09-13T02:30:00.000000+00:00",
  "fallback_mode": false,
  "feed_only_mode": false,
  "dependencies": {
    "database": {
      "status": "connected",
      "type": "Supabase PostgreSQL"
    },
    "cache": {
      "status": "operational",
      "active_keys": 12,
      "hit_ratio": 0.88
    },
    "storage": {
      "status": "configured",
      "provider": "Supabase Storage Vault"
    }
  }
}
```

---

## 3. Authentication & Verification Desk API (Saghir Ahmed)

### `POST /api/auth/firebase-login`
Exchanges a client-side Firebase ID token (from Google Sign-In) for an application JWT session.
- **Access**: Public
- **Request Payload**:
```json
{
  "firebase_id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```
- **Response**: `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 14,
    "firebase_uid": "fb_uid_88392",
    "email": "ahmad.raza@example.com",
    "full_name": "Ahmad Raza",
    "role": "guest",
    "is_verified": false,
    "cnic_verified": false
  }
}
```

### `GET /api/auth/me`
Retrieves authenticated user profile and roles.
- **Access**: `guest`, `verified_seeker`, `verified_donor`, `admin`
- **Response**: `200 OK`
```json
{
  "id": 14,
  "email": "ahmad.raza@example.com",
  "full_name": "Ahmad Raza",
  "role": "verified_donor",
  "is_verified": true,
  "cnic_verified": true,
  "created_at": "2026-09-08T00:00:00Z"
}
```

### `POST /api/auth/cnic/submit`
Submits 13-digit Pakistani CNIC for Mod-10 checksum validation and AES-256 encrypted storage.
- **Access**: Required (`guest`)
- **Request Payload**:
```json
{
  "cnic_number": "42101-1234567-1",
  "front_image_url": "https://vault.supabase.co/cnic_front.jpg",
  "back_image_url": "https://vault.supabase.co/cnic_back.jpg"
}
```
- **Response**: `200 OK`
```json
{
  "status": "pending_verification",
  "message": "CNIC submitted and checksum validated. Encrypted at rest with AES-256.",
  "cnic_verified": true
}
```

### `POST /api/auth/hospital-slip/upload`
Uploads hospital admission slip, triggers machine vision OCR parsing, and creates the emergency blood request.
- **Access**: Required (`verified_seeker`, `admin`)
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: PDF or image file ($\le 10\text{ MB}$).
  - `patient_name`: string (e.g. `Fatima Bibi`).
  - `hospital_name`: string (e.g. `Civil Hospital Karachi`).
  - `blood_group`: string (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`).
  - `units_needed`: integer (1 to 6).
- **Response**: `201 Created`
```json
{
  "request_id": 101,
  "ocr_confidence": 0.92,
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

### `GET /api/auth/admin/verification-queue`
Lists low-confidence admission slips awaiting manual human verification.
- **Access**: Required (`admin`)
- **Response**: `200 OK`
```json
[
  {
    "request_id": 102,
    "patient_name": "Zainab Bibi",
    "hospital_name": "JPMC Karachi",
    "admission_slip_url": "https://vault.supabase.co/slips/slip_102.jpg",
    "ocr_confidence": 0.71,
    "created_at": "2026-09-13T01:15:00Z"
  }
]
```

### `POST /api/auth/admin/verify-slip/{id}`
Approves or rejects a flagged slip with reviewer notes.
- **Access**: Required (`admin`)
- **Request Payload**:
```json
{
  "decision": "approved",
  "notes": "Doctor registration verified via Sindh Medical Council database."
}
```
```json
{
  "request_id": 102,
  "status": "verified",
  "verified_by_admin_id": 1
}
```

### `GET /api/auth/admin/audit-logs`
Retrieves paginated tamper-evident security audit logs for compliance, security tracking, and administrative review (NFR 2.5).
- **Access**: Required (`admin`)
- **Query Parameters**:
  - `page` (int, default: 1): Page offset.
  - `limit` (int, default: 20): Logs per page (max 100).
  - `action` (string, optional): Filter by action name (e.g., `VERIFY_SLIP`, `DONOR_REGISTER`, `LOGIN_SUCCESS`).
  - `admin_user_id` (int, optional): Filter by operator user ID.
  - `start_date` (ISO string, optional): Earliest timestamp filter.
  - `end_date` (ISO string, optional): Latest timestamp filter.
- **Response**: `200 OK`
```json
{
  "total": 142,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "id": 104,
      "user_id": 1,
      "action": "VERIFY_SLIP",
      "target_resource": "requests/204",
      "details": "Hospital slip approved by desk operator Zubair Khan",
      "ip_address": "127.0.0.1",
      "created_at": "2026-09-14T19:30:00Z"
    }
  ]
}
```

### `GET /api/auth/donor/cooldown`
Returns donor's current 90-day cooldown status and days remaining.
- **Access**: Required (`verified_donor`)
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

### `POST /api/auth/donor/pre-screen`
Scores donor medical pre-screening questionnaire.
- **Access**: Public / Authenticated
- **Request Payload**:
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

## 4. Live Map & Proximity Matching API (Hareem Israr)

### `POST /api/map/donor/location`
Pings donor's current coarse geolocation coordinates.
- **Access**: Required (`verified_donor`, `admin`)
- **Throttling**: 120-second cooldown per FR 1.1.2 unless significant geographic displacement ($\ge 0.1\text{ km}$) occurs. Bypassable via `?force=true` query parameter during emergency tests.
- **Request Payload**:
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
  "timestamp": "2026-09-13T02:25:00Z"
}
```

### `GET /api/map/requests`
Returns verified active emergency requests formatted as map markers for Leaflet.
- **Access**: Public
- **Query Parameters**:
  - `latitude`: float (optional center point)
  - `longitude`: float (optional center point)
  - `radius_km`: float (default `15.0`)
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

### `GET /api/map/requests/my-active`
Retrieves the currently authenticated user's active emergency blood request for instant dashboard rendering, live radar resumption, and persistent alert banner display across browser sessions.
- **Access**: Required (`Bearer JWT` session)
- **Matching Criteria**: Latest request created by `current_user.id` with status in `["pending_verification", "verified", "matched", "in_transit"]`.
- **Response (When Active Request Exists)**: `200 OK`
```json
{
  "has_active_request": true,
  "request_id": 101,
  "patient_name": "Fatima Bibi",
  "hospital_name": "Som Fauji Foundation Hospital, Shah Faisal Colony",
  "hospital_address": "Shah Faisal Colony, Karachi",
  "hospital_latitude": 24.8783,
  "hospital_longitude": 67.1458,
  "blood_group": "B+",
  "component_type": "Whole Blood",
  "units_needed": 2,
  "units_fulfilled": 0,
  "urgency": "within_2_hours",
  "status": "verified",
  "created_at": "2026-09-23T12:00:00Z"
}
```
- **Response (When No Active Request Exists)**: `200 OK`
```json
{
  "has_active_request": false
}
```

### `GET /api/map/requests/{id}/status`
Polled by seekers to monitor real-time fulfillment progress and radius expansion.
- **Access**: Required (`verified_seeker`, `admin`)
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

### `GET /api/map/requests/{id}/matches`
Ranks candidate donors using great-circle Haversine distances.
- **Access**: Required (`verified_seeker`, `admin`)
- **Response**: `200 OK`
```json
[
  {
    "donor_id": 402,
    "blood_group": "B+",
    "distance_km": 3.4,
    "estimated_arrival_minutes": 14,
    "is_available": true
  }
]
```

### `POST /api/map/requests/{id}/accept`
Donor accepts an emergency proximity notification.
- **Access**: Required (`verified_donor`)
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "status": "matched",
  "message": "Match confirmed. Live coordination and in-app chat initialized.",
  "matched_donor_id": 402
}
```

### `POST /api/map/requests/{id}/decline`
Donor declines alert without penalty.
- **Access**: Required (`verified_donor`)
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "status": "declined",
  "message": "Alert declined. You remain eligible for other requests."
}
```

### `POST /api/map/requests/{id}/cancel`
Donor cancels prior acceptance (due to breakdown/traffic), immediately re-opening dispatch.
- **Access**: Required (`verified_donor`)
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "status": "re_dispatched",
  "message": "Acceptance cancelled. Request re-opened to next-ranked donors."
}
```

### `GET /api/coordination/{id}`
Resolves emergency coordination permissions and donor contact for the session.
- **Access**: Public / Optional JWT (`seeker`, `verified_donor`)
- **Calling Policy**: Seeker receives donor phone number for direct calling (`tel:+92...`). Donor receives `can_call: false` with seeker phone strictly omitted.
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "status": "matched",
  "viewer_role": "seeker",
  "can_call": true,
  "call_phone_number": "+923001234567",
  "matched_donor": {
    "donor_id": 402,
    "name": "Verified Volunteer Donor",
    "phone_number": "+923001234567",
    "blood_group": "B+",
    "distance_km": 2.4,
    "estimated_arrival_minutes": 14
  },
  "seeker_info": {
    "patient_name": "Emergency Blood Recipient",
    "blood_group": "B+",
    "units_needed": 2,
    "units_fulfilled": 1
  },
  "hospital": {
    "name": "Civil Hospital Karachi",
    "address": "Mission Rd, New Karachi",
    "latitude": 24.8569,
    "longitude": 67.0112
  }
}
```

### `GET /api/coordination/{id}/messages`
Retrieves the real-time chat history between seeker and dispatch donor.
- **Access**: Public / Authenticated
- **Response**: `200 OK`
```json
[
  {
    "id": 1,
    "sender_role": "donor",
    "sender_name": "Volunteer Donor",
    "text": "Hello! I have confirmed your emergency blood alert. I am on my way to the blood bank.",
    "timestamp": "2026-09-13T10:00:00Z"
  }
]
```

### `POST /api/coordination/{id}/messages`
Sends a coordination message into the live in-app chat.
- **Access**: Public / Authenticated
- **Request Body**:
```json
{
  "text": "Attendant is waiting at the reception with the file.",
  "sender_role": "seeker"
}
```
- **Response**: `200 OK`
```json
{
  "id": 2,
  "sender_role": "seeker",
  "sender_name": "Emergency Seeker",
  "text": "Attendant is waiting at the reception with the file.",
  "timestamp": "2026-09-13T10:01:15Z"
}
```

---

## 5. Urgent Social Feed & Sharing API (Mahrukh Baig)

### `GET /api/feed`
Paginated public stream of active verified blood appeals with filters.
- **Access**: Public
- **Query Parameters**:
  - `blood_group`: string (optional, e.g. `O-`, `A+`)
  - `urgency`: string (optional, `within_2_hours`, `within_24_hours`)
  - `page`: int (default `1`)
  - `limit`: int (default `20`)
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
      "created_at": "2026-09-13T01:00:00Z"
    }
  ]
}
```

### `POST /api/feed/{id}/respond`
One-tap "I Can Donate" commitment directly from the feed stream.
- **Access**: Required (`verified_donor`)
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "response_recorded": true,
  "message": "Thank you! The seeker has been notified."
}
```

### `GET /api/feed/{id}/share`
Generates pre-formatted WhatsApp share text and verified link.
- **Access**: Public
- **Response**: `200 OK`
```json
{
  "request_id": 101,
  "share_url": "https://qatra-web-app.vercel.app/seeker/feed.html?req=101",
  "whatsapp_text": "🚨 *URGENT BLOOD NEEDED (QATRA)*\nBlood Group: *B+*\nHospital: *Civil Hospital Karachi*\nUnits Needed: *2*\nUrgency: *Within 2 Hours*\nVerify & Respond: https://qatra-web-app.vercel.app/seeker/feed.html?req=101"
}
```

### `POST /api/feed/{id}/close`
Manually closes a fulfilled or expired request.
- **Access**: Required (`verified_seeker`, `admin`)
- **Request Payload**:
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

## 6. Awareness & Eligibility Module API (Yumna Abbasi)

### `POST /api/awareness/eligibility-check`
Stateless 4-step preliminary eligibility quiz.
- **Access**: Public
- **Request Payload**:
```json
{
  "step1_age": 22,
  "step1_weight_kg": 62.0,
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

### `GET /api/awareness/content`
Browses educational articles and Myth vs Fact comparisons.
- **Access**: Public
- **Query Parameters**:
  - `category`: string (`basics`, `myths_facts`, `health_prep`, `cultural`)
- **Response**: `200 OK`
```json
[
  {
    "id": 1,
    "title": "Does donating blood cause permanent weakness?",
    "category": "myths_facts",
    "content_type": "myth_vs_fact",
    "myth": "Donating blood permanently decreases stamina and weakens immunity.",
    "fact": "The body replenishes fluid volume in 24-48 hours and red cells within weeks. Regular donation is healthy for adults.",
    "read_time_minutes": 2
  }
]
```

### `GET /api/awareness/events`
Lists upcoming community blood donation drives and awareness sessions.
- **Access**: Public
- **Response**: `200 OK`
```json
[
  {
    "id": 5,
    "title": "DUET Campus Annual Blood Drive",
    "event_type": "blood_drive",
    "date_time": "2026-09-20T09:00:00Z",
    "location_name": "Dawood University Main Lawn, Karachi",
    "slots_total": 250,
    "slots_booked": 84
  }
]
```

### `POST /api/awareness/events/{id}/register`
Registers a donor or volunteer slot for an upcoming event.
- **Access**: Public / Authenticated
- **Request Payload**:
```json
{
  "event_id": 5,
  "registration_type": "donor"
}
```
- **Response**: `201 Created`
```json
{
  "registration_id": 19,
  "event_id": 5,
  "status": "confirmed",
  "message": "Registration confirmed. An appointment reminder has been logged."
}
```

### `GET /api/awareness/donor/health-feedback`
Retrieves post-donation recovery guidelines and cooldown date for the authenticated user.
- **Access**: Required (`verified_donor`)
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

## 7. Rate Limiting Limits (NFR 2.6)

| Route Class | Limit | Window | Action on Violation |
| :--- | :---: | :---: | :--- |
| **Authentication (`/api/auth/*`)** | 10 requests | 60 seconds | `429 Too Many Requests` |
| **OCR Slip Upload (`/hospital-slip/upload`)** | 5 requests | 60 seconds | `429 Too Many Requests` |
| **Public Feed Queries (`/api/feed`)** | 60 requests | 60 seconds | `429 Too Many Requests` |
| **General Read Routes** | 120 requests | 60 seconds | `429 Too Many Requests` |

---

<div align="center">
  <b>QATRA REST API Specification (v1.0)</b><br>
  <i>Locked for Phase 2 & Phase 3 Production Integration.</i>
</div>

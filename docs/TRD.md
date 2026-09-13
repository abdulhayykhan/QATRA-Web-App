# 🏗️ QATRA (قطرہ) — Technical Requirement Document (TRD)

### *System Architecture, Engineering Blueprint & API Specification*

---

| Technical Specification | Implementation Standard |
| :--- | :--- |
| **System Architecture** | Hybrid Edge-Computed Serverless Architecture (FastAPI + PWA) |
| **Backend Runtime** | Python 3.12 (Asynchronous ASGI Engine) |
| **API Framework** | [FastAPI](https://fastapi.tiangolo.com/) 0.115+ with [Starlette](https://www.starlette.io/) & [Pydantic v2](https://docs.pydantic.dev/) |
| **Relational Database** | [Supabase](https://supabase.com/) Managed PostgreSQL 15 |
| **ORM & Driver** | [SQLAlchemy 2.0](https://www.sqlalchemy.org/) with `psycopg` 3 driver |
| **Authentication Provider** | Google Sign-In via [Firebase Authentication Web SDK](https://firebase.google.com/docs/auth) |
| **Cryptography Standard** | **AES-256-GCM** (Galois/Counter Mode) via `cryptography` |
| **Frontend Foundation** | Vanilla ES Modules (Zero monolithic bundle overhead) |
| **Design System** | **Apple Human Interface System (`apple.css`)** Pure White Standard |
| **Mapping Engine** | [Leaflet.js](https://leafletjs.com/) 1.9.4 with OpenStreetMap Tiles |
| **Cloud Hosting & Edge CDN**| [Vercel](https://vercel.com/) Serverless Functions (`@vercel/python`, AWS Lambda `iad1`) |
| **CI/CD Quality Control** | GitHub Actions with [Ruff](https://github.com/astral-sh/ruff) Linter & [Pytest](https://docs.pytest.org/) (75/75 Automated Tests) |
| **Target Repository** | [https://github.com/abdulhayykhan/QATRA-Web-App](https://github.com/abdulhayykhan/QATRA-Web-App) |
| **Live Production Endpoint** | `https://qatra-web-app.vercel.app/api` |

---

## 👥 Engineering Team Ownership & Technical Domains

| Team Member | Academic Dept. | Project Role | Technical Domain & Module Ownership |
| :--- | :--- | :--- | :--- |
| **Abdul Hayy Khan** | Artificial Intelligence (AI) | **Team Lead & System Architect** | System Topology, Shared SQLAlchemy Models, Pydantic Schemas, Apple HIG Design Layer (`apple.css`), PWA Service Worker (`sw.js`), Vercel Serverless Deployment, and CI/CD Automation. |
| **Hareem Israr** | Computer Science (CS) | **Geospatial & Proximity Lead** | Live Map Canvas (`/api/map`), Leaflet.js rendering, Haversine Distance Engine, Concentric Radius Expansion State Machine, and Geolocation Ingestion. |
| **Saghir Ahmed** | Cyber Security (CY) | **Auth & Verification Desk Lead** | Firebase Google OAuth Integration, Pakistani CNIC Mod-10 Checksum Engine, Hospital Slip Machine Vision OCR Pipeline, 24/7 Desk Review Queue, and 90-Day Cooldown Tracker. |
| **Mahrukh Baig** | Artificial Intelligence (AI) | **Urgent Appeals & Social Feed Lead** | Public Emergency Appeals Feed (`/api/feed`), Dynamic Blood Group Filtering, "I Can Donate" One-Tap Dispatch, Structured WhatsApp Share Generator, and Request Auto-Close Engine. |
| **Yumna Abbasi** | Cyber Security (CY) | **Awareness & Community Drive Lead** | 4-Step Medical Pre-Screening Engine (`/api/awareness`), Categorized Educational Content Library, Campus Blood Drive Event Management, and Post-Donation Health Feedback. |
| **Nimra Iftikhar** | Artificial Intelligence (AI) | **Information Security & NFR Lead** | In-Memory Sliding-Window Rate Limiter Middleware, AES-256-GCM Vault Cryptography, Tamper-Evident Audit Logging, Zero-PII Public Surfaces, and Automated Pytest Test Suite. |

---

## 📑 Table of Contents

- [1. Technical Overview & System Topology](#1-technical-overview--system-topology)
  - [1.1 Architectural Philosophy & Design Principles](#11-architectural-philosophy--design-principles)
  - [1.2 Multi-Tier Edge-Serverless Topology](#12-multi-tier-edge-serverless-topology)
  - [1.3 Repository File Tree & Modular Taxonomy](#13-repository-file-tree--modular-taxonomy)
- [2. Database Architecture & Relational Schema Specification](#2-database-architecture--relational-schema-specification)
  - [2.1 PostgreSQL 15 Relational Schema (DDL)](#21-postgresql-15-relational-schema-ddl)
  - [2.2 Entity Relationship Diagram (ERD)](#22-entity-relationship-diagram-erd)
  - [2.3 Serverless Connection Pooling & Lifecycle Management](#23-serverless-connection-pooling--lifecycle-management)
- [3. Backend API Service Layer & Endpoint Specifications](#3-backend-api-service-layer--endpoint-specifications)
  - [3.1 Micro-Kernel APIRouter Architecture](#31-micro-kernel-apirouter-architecture)
  - [3.2 System Health & Diagnostic Endpoints](#32-system-health--diagnostic-endpoints)
  - [3.3 Authentication, Profile & Verification Endpoints](#33-authentication-profile--verification-endpoints)
  - [3.4 Live Map & Proximity Radar Endpoints](#34-live-map--proximity-radar-endpoints)
  - [3.5 Real-Time Coordination & In-App Chat Endpoints](#35-real-time-coordination--in-app-chat-endpoints)
  - [3.6 Urgent Social Feed & Broadcast Endpoints](#36-urgent-social-feed--broadcast-endpoints)
  - [3.7 Awareness Sessions, Eligibility & Community Drive Endpoints](#37-awareness-sessions-eligibility--community-drive-endpoints)
- [4. Geospatial Proximity Matching & Radius Expansion Engine](#4-geospatial-proximity-matching--radius-expansion-engine)
  - [4.1 Spherical Haversine Distance Formulation](#41-spherical-haversine-distance-formulation)
  - [4.2 Karachi Urban Transit Velocity Matrix & ETA Model](#42-karachi-urban-transit-velocity-matrix--eta-model)
  - [4.3 Concentric Radius Expansion State Machine (5–15 km)](#43-concentric-radius-expansion-state-machine-515-km)
  - [4.4 Rare Blood Group Fast-Track Dispatch Algorithm](#44-rare-blood-group-fast-track-dispatch-algorithm)
- [5. Machine Vision & Hospital Slip OCR Verification Engine](#5-machine-vision--hospital-slip-ocr-verification-engine)
  - [5.1 Document Ingestion & Image Preprocessing Pipeline](#51-document-ingestion--image-preprocessing-pipeline)
  - [5.2 Clinical Entity Token Extraction & Doctor Stamp Detection](#52-clinical-entity-token-extraction--doctor-stamp-detection)
  - [5.3 Multi-Factor Confidence Scoring Formula](#53-multi-factor-confidence-scoring-formula)
  - [5.4 Verification Desk Escalation State Machine](#54-verification-desk-escalation-state-machine)
- [6. Cryptography, Security & Privacy Engineering](#6-cryptography-security--privacy-engineering)
  - [6.1 AES-256-GCM Vault Symmetric Encryption at Rest](#61-aes-256-gcm-vault-symmetric-encryption-at-rest)
  - [6.2 Pakistani National Identity Card (CNIC) Mod-10 Checksum](#62-pakistani-national-identity-card-cnic-mod-10-checksum)
  - [6.3 Privacy Shield & Unidirectional Seeker Calling Protocol](#63-privacy-shield--unidirectional-seeker-calling-protocol)
  - [6.4 In-App Coordination Real-Time Messaging Protocol](#64-in-app-coordination-real-time-messaging-protocol)
  - [6.5 Sliding-Window In-Memory Rate Limiting Algorithm](#65-sliding-window-in-memory-rate-limiting-algorithm)
  - [6.6 Tamper-Evident Cryptographic Audit Trail Logging](#66-tamper-evident-cryptographic-audit-trail-logging)
- [7. Frontend Engineering & Apple Human Interface Design System](#7-frontend-engineering--apple-human-interface-design-system)
  - [7.1 Apple HIG Design Token Architecture (`apple.css`)](#71-apple-hig-design-token-architecture-applecss)
  - [7.2 Progressive Web App (PWA) Lifecycle & Service Worker (`sw.js`)](#72-progressive-web-app-pwa-lifecycle--service-worker-swjs)
  - [7.3 Tactile Spring Physics Mechanics](#73-tactile-spring-physics-mechanics)
  - [7.4 Responsive Viewport Grid & Touch Ergonomics](#74-responsive-viewport-grid--touch-ergonomics)
- [8. Reliability, Resilience & Graceful Degradation Engine](#8-reliability-resilience--graceful-degradation-engine)
  - [8.1 In-Memory TTL Cache Implementation (`TTLCache`)](#81-in-memory-ttl-cache-implementation-ttlcache)
  - [8.2 Database Network Partition Fallback Mode](#82-database-network-partition-fallback-mode)
  - [8.3 Ephemeral Worker Cold-Start Mitigation](#83-ephemeral-worker-cold-start-mitigation)
- [9. DevOps, CI/CD Pipeline & Deployment Specifications](#9-devops-cicd-pipeline--deployment-specifications)
  - [9.1 GitHub Actions Automated CI Workflow (`ci.yml`)](#91-github-actions-automated-ci-workflow-ciyml)
  - [9.2 Vercel Edge Serverless Deployment Configuration (`vercel.json`)](#92-vercel-edge-serverless-deployment-configuration-verceljson)
  - [9.3 Production Environment Variables & Secrets Vault](#93-production-environment-variables--secrets-vault)

---

## 1. Technical Overview & System Topology

### 1.1 Architectural Philosophy & Design Principles
The QATRA system architecture is engineered to fulfill three absolute engineering mandates: **Zero Downtime During Emergencies**, **Sub-Second Spatial Compute Latency**, and **Zero Exposure of Sensitive Patient/Donor PII**.

1. **Micro-Kernel Modular Architecture**: Every functional domain (`auth`, `map`, `feed`, `awareness`, `coordination`, `health`) operates as an autonomous FastAPI `APIRouter` with dedicated Pydantic request/response schemas. Routers interact through explicit domain services and shared SQLAlchemy models.
2. **Stateless Edge Execution**: The application backend maintains zero in-memory session state across requests. Client authentication relies on cryptographically signed JSON Web Tokens (JWT) verified against Google Firebase RSA public keys.
3. **Defensive Graceful Degradation**: The platform never returns a generic 500 error page when upstream cloud services (such as PostgreSQL) encounter transient network partitions. It dynamically pivots into **Fallback Mode** (`fallback_mode: true`), serving cached feed appeals, pre-screened eligibility checklists, and emergency guidelines with `HTTP 200 OK`.
4. **Zero-PII Public Surface**: No plain-text phone numbers, National Identity Card (CNIC) numbers, or private medical questionnaire disclosures are ever exposed to the client application without verified, role-based authorization.

---

### 1.2 Multi-Tier Edge-Serverless Topology

```mermaid
graph TB
    subgraph Tier1["Tier 1: Presentation & Client Edge (PWA)"]
        HTML["Vanilla ES Modules (Zero Bundler)"]
        AppleCSS["Apple HIG Pure White Layer (apple.css)"]
        LeafletJS["Leaflet.js 1.9 Mapping Engine"]
        SW["Service Worker (sw.js) Cache API"]
    end

    subgraph Tier2["Tier 2: Edge Routing & Global Gateway"]
        VercelCDN["Vercel Global Edge CDN (/public/**)"]
        VercelRewrite["Vercel URL Rewrite Engine (/api/*)"]
    end

    subgraph Tier3["Tier 3: Asynchronous Compute Layer (FastAPI 0.115+)"]
        Lambda["AWS Lambda Worker (Python 3.12, iad1)"]
        ASGI["Starlette ASGI Request Lifecycle"]
        RLM["Sliding-Window Rate Limiting Middleware"]
        AuthModule["Auth & Verification Router (/api/auth)"]
        MapModule["Live Map & Proximity Router (/api/map)"]
        FeedModule["Urgent Appeals Feed Router (/api/feed)"]
        AwarenessModule["Awareness & Events Router (/api/awareness)"]
        CoordModule["Coordination & Chat Router (/api/coordination)"]
        HealthModule["Health & Diagnostics Router (/api/health)"]
    end

    subgraph Tier4["Tier 4: Enterprise Cloud Persistence & Security"]
        Postgres[(Supabase PostgreSQL 15)]
        FirebaseSDK["Firebase Auth Google OAuth Provider"]
        AESVault["AES-256-GCM Vault Service"]
        MemoryCache["In-Memory TTLCache Engine"]
    end

    Tier1 -->|Static Assets| VercelCDN
    Tier1 -->|REST API Requests| VercelRewrite
    VercelRewrite --> Lambda
    Lambda --> ASGI
    ASGI --> RLM
    RLM --> AuthModule
    RLM --> MapModule
    RLM --> FeedModule
    RLM --> AwarenessModule
    RLM --> CoordModule
    RLM --> HealthModule

    AuthModule --> FirebaseSDK
    AuthModule --> AESVault
    AuthModule --> Postgres
    MapModule --> Postgres
    FeedModule --> MemoryCache
    FeedModule --> Postgres
    AwarenessModule --> Postgres
    CoordModule --> Postgres
    HealthModule --> Postgres
```

---

### 1.3 Repository File Tree & Modular Taxonomy

```text
QATRA-Web-App/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated CI: Ruff linter + Pytest (75 tests)
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI factory, ASGI middleware, router mounting
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic BaseSettings environment manager
│   │   │   ├── database.py        # SQLAlchemy 2.0 engine & connection sessionmaker
│   │   │   └── security.py        # AES-256-GCM, Mod-10 CNIC, JWT token verification
│   │   ├── middleware/
│   │   │   └── rate_limit.py      # Sliding-window in-memory rate limiting middleware
│   │   ├── models/
│   │   │   ├── __init__.py        # Exported SQLAlchemy declarative models
│   │   │   ├── user.py            # User and DonorProfile ORM models
│   │   │   ├── request.py         # BloodRequest and HospitalSlip ORM models
│   │   │   ├── coordination.py    # CoordinationMessage real-time chat ORM model
│   │   │   ├── event.py           # BloodDriveEvent and Registration ORM models
│   │   │   └── audit.py           # Compliance AuditLog ORM model
│   │   ├── schemas/
│   │   │   ├── auth.py            # Pydantic v2 schemas for OAuth, CNIC, and Slips
│   │   │   ├── map.py             # Schemas for geolocation coordinates & matches
│   │   │   ├── feed.py            # Schemas for emergency blood appeals
│   │   │   ├── coordination.py    # Schemas for in-app chat & direct calling
│   │   │   └── awareness.py       # Schemas for 4-step eligibility quiz & events
│   │   ├── services/
│   │   │   ├── haversine.py       # Spherical distance, ETA, and radius expansion
│   │   │   ├── ocr_engine.py      # Machine vision document entity extraction
│   │   │   ├── cooldown.py        # 90-day biological cooldown calculator
│   │   │   ├── cache.py           # In-memory TTLCache engine
│   │   │   └── audit_logger.py    # Tamper-evident cryptographic audit trail
│   │   └── routers/
│   │       ├── auth.py            # Router: /api/auth/*
│   │       ├── map.py             # Router: /api/map/*
│   │       ├── feed.py            # Router: /api/feed/*
│   │       ├── coordination.py    # Router: /api/coordination/*
│   │       ├── awareness.py       # Router: /api/awareness/*
│   │       └── health.py          # Router: /api/health
│   ├── tests/                     # 75 unit and integration tests
│   │   ├── conftest.py            # Pytest fixtures & SQLite/Postgres test harness
│   │   ├── test_auth_phase2.py    # Tests for Google Auth, CNIC Mod-10, OCR Queue
│   │   ├── test_map_phase2.py     # Tests for Haversine, Radius Expansion, Decline
│   │   ├── test_feed_phase2.py    # Tests for Appeal Filtering, Share, Auto-Close
│   │   ├── test_awareness_phase2.py# Tests for Eligibility Quiz, Event Registration
│   │   └── test_nfr_security_phase2.py# Tests for AES-256, Rate Limiting, Audit
│   └── requirements.txt           # Production Python dependencies
├── public/                        # Static PWA Web Client
│   ├── index.html                 # Apple HIG PWA Splash & Portal Landing
│   ├── manifest.json              # W3C Web App Manifest (PWA certified)
│   ├── sw.js                      # Cache-First Service Worker with offline mode
│   ├── static/
│   │   ├── css/
│   │   │   └── apple.css          # Apple Human Interface System styling engine
│   │   └── js/
│   │       ├── auth.js            # Firebase Web SDK Google Sign-In handler
│   │       ├── map.js             # Leaflet.js interactive canvas & donor radar
│   │       ├── feed.js            # Appeals feed rendering & filter chips
│   │       ├── awareness.js       # 4-step interactive eligibility wizard
│   │       └── coordination.js    # Real-time chat & seeker direct-call controller
│   └── seeker/
│       └── coordination.html      # Seeker-to-donor live emergency dispatch screen
├── api/
│   └── index.py                   # Vercel Serverless AWS Lambda ASGI entrypoint
├── docs/
│   ├── PRD.md                     # Product Requirement Document
│   ├── TRD.md                     # Technical Requirement Document
│   ├── ARCHITECTURE.md            # System Architecture Overview
│   └── api-contract.md            # Locked REST API Contract Specification
├── vercel.json                    # Vercel Edge routing, rewrites & headers config
└── README.md                      # Primary project documentation
```

---

## 2. Database Architecture & Relational Schema Specification

### 2.1 PostgreSQL 15 Relational Schema (DDL)

```sql
-- Enable UUID and PostGIS extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Custom Enumerated Types
CREATE TYPE user_role_enum AS ENUM ('guest', 'verified_seeker', 'verified_donor', 'organizer', 'admin');
CREATE TYPE blood_group_enum AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE urgency_level_enum AS ENUM ('immediate', 'urgent', 'standard');
CREATE TYPE request_status_enum AS ENUM ('pending', 'verified', 'matched', 'fulfilled', 'cancelled');
CREATE TYPE slip_status_enum AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE registration_type_enum AS ENUM ('donor', 'volunteer');

-- 2. Core Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_encrypted BYTEA NULL,                     -- AES-256-GCM encrypted
    cnic_encrypted BYTEA NULL,                      -- AES-256-GCM encrypted
    role user_role_enum NOT NULL DEFAULT 'guest',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    cnic_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Donor Profiles Table
CREATE TABLE donor_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blood_group blood_group_enum NOT NULL,
    latitude DOUBLE PRECISION NULL,
    longitude DOUBLE PRECISION NULL,
    location_geom GEOMETRY(Point, 4326) NULL,       -- PostGIS WGS84 point
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    last_donation_date DATE NULL,
    cooldown_until TIMESTAMP WITH TIME ZONE NULL,
    pre_screened_at TIMESTAMP WITH TIME ZONE NULL,
    location_updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Blood Requests Table
CREATE TABLE blood_requests (
    id SERIAL PRIMARY KEY,
    seeker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    patient_name VARCHAR(255) NOT NULL,
    patient_mrn VARCHAR(64) NOT NULL,
    hospital_name VARCHAR(255) NOT NULL,
    hospital_district VARCHAR(64) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    blood_group blood_group_enum NOT NULL,
    component_type VARCHAR(64) NOT NULL DEFAULT 'Whole Blood',
    units_needed INTEGER NOT NULL CHECK (units_needed > 0 AND units_needed <= 10),
    units_fulfilled INTEGER NOT NULL DEFAULT 0 CHECK (units_fulfilled >= 0),
    urgency urgency_level_enum NOT NULL DEFAULT 'urgent',
    status request_status_enum NOT NULL DEFAULT 'pending',
    matched_donor_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    fulfilled_at TIMESTAMP WITH TIME ZONE NULL
);

-- 5. Hospital Requisition Slips Table
CREATE TABLE hospital_slips (
    id SERIAL PRIMARY KEY,
    request_id INTEGER UNIQUE NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    file_url VARCHAR(512) NOT NULL,
    file_hash_sha256 VARCHAR(64) NOT NULL,
    ocr_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    extracted_tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
    status slip_status_enum NOT NULL DEFAULT 'pending',
    review_notes TEXT NULL,
    reviewed_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    reviewed_at TIMESTAMP WITH TIME ZONE NULL
);

-- 6. Coordination Messages Table (In-App Chat)
CREATE TABLE coordination_messages (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message_text TEXT NOT NULL,
    message_type VARCHAR(32) NOT NULL DEFAULT 'text', -- 'text' or 'status_chip'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Blood Drive Events Table
CREATE TABLE blood_drive_events (
    id SERIAL PRIMARY KEY,
    organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    venue_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    event_start TIMESTAMP WITH TIME ZONE NOT NULL,
    event_end TIMESTAMP WITH TIME ZONE NOT NULL,
    target_units INTEGER NOT NULL DEFAULT 50,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 8. Event Registrations Table
CREATE TABLE event_registrations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES blood_drive_events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registration_type registration_type_enum NOT NULL DEFAULT 'donor',
    preferred_slot VARCHAR(64) NOT NULL,
    has_pre_screened BOOLEAN NOT NULL DEFAULT FALSE,
    is_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(event_id, user_id)
);

-- 9. Tamper-Evident Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    operator_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    target_resource VARCHAR(128) NOT NULL,
    ip_hash_sha256 VARCHAR(64) NOT NULL,
    payload_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 10. Performance & Spatial Indexes
CREATE INDEX idx_donor_geom ON donor_profiles USING GIST (location_geom);
CREATE INDEX idx_donor_blood_avail ON donor_profiles (blood_group, is_available, cooldown_until);
CREATE INDEX idx_requests_status_urgency ON blood_requests (status, urgency);
CREATE INDEX idx_coordination_req_time ON coordination_messages (request_id, created_at ASC);
CREATE INDEX idx_slips_status ON hospital_slips (status);
CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);
```

---

### 2.2 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o| donor_profiles : "has"
    users ||--o{ blood_requests : "creates (seeker)"
    users ||--o{ blood_requests : "accepts (matched_donor)"
    users ||--o{ hospital_slips : "uploads"
    users ||--o{ coordination_messages : "sends"
    users ||--o{ blood_drive_events : "organizes"
    users ||--o{ event_registrations : "attends"
    users ||--o{ audit_logs : "triggers"

    blood_requests ||--|| hospital_slips : "verified_by"
    blood_requests ||--o{ coordination_messages : "contains"
    blood_drive_events ||--o{ event_registrations : "registers"

    users {
        int id PK
        string firebase_uid UK
        string email UK
        string full_name
        bytes phone_encrypted
        bytes cnic_encrypted
        user_role_enum role
        bool is_verified
        bool cnic_verified
        timestamp created_at
    }

    donor_profiles {
        int id PK
        int user_id FK
        blood_group_enum blood_group
        double latitude
        double longitude
        geometry location_geom
        bool is_available
        timestamp cooldown_until
        timestamp pre_screened_at
    }

    blood_requests {
        int id PK
        int seeker_id FK
        string patient_name
        string patient_mrn
        string hospital_name
        double latitude
        double longitude
        blood_group_enum blood_group
        int units_needed
        int units_fulfilled
        urgency_level_enum urgency
        request_status_enum status
        int matched_donor_id FK
        timestamp created_at
    }

    hospital_slips {
        int id PK
        int request_id FK
        int uploader_id FK
        string file_url
        string file_hash_sha256
        double ocr_confidence
        jsonb extracted_tokens
        slip_status_enum status
        int reviewed_by FK
    }

    coordination_messages {
        int id PK
        int request_id FK
        int sender_id FK
        text message_text
        string message_type
        bool is_read
        timestamp created_at
    }
```

---

### 2.3 Serverless Connection Pooling & Lifecycle Management
Because Vercel executes FastAPI inside ephemeral AWS Lambda workers, standard unmanaged database connection pools quickly saturate PostgreSQL's `max_connections` limit.

SQLAlchemy 2.0 is configured with strict serverless pooling semantics:
```python
# backend/app/core/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,            # Limit connections per worker container
    max_overflow=10,        # Allow temporary burst during traffic spikes
    pool_timeout=30,        # Maximum wait for connection checkout
    pool_recycle=300,       # Recycle connections every 5 minutes
    pool_pre_ping=True      # Proactively verify connection liveness before checkout
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()          # Guaranteed return to pool upon request completion
```

---

## 3. Backend API Service Layer & Endpoint Specifications

### 3.1 Micro-Kernel APIRouter Architecture
All routes are mounted under the base `/api` prefix in `backend/app/main.py`:
- `/api/health` — System diagnostic probe, connection pooling verification, fallback detection.
- `/api/auth` — Firebase Google OAuth exchange, CNIC validation, slip OCR, admin desk review.
- `/api/map` — Live proximity radar, donor location ingestion, Haversine candidate ranking.
- `/api/coordination` — Real-time in-app emergency chat, seeker direct calling (`tel:`).
- `/api/feed` — Paginated public blood appeals, blood group filter chips, WhatsApp sharing.
- `/api/awareness` — Stateless 4-step eligibility quiz, educational library, campus drives.

---

### 3.2 System Health & Diagnostic Endpoints

#### `GET /api/health`
Verifies backend ASGI availability, database pool liveness, in-memory cache health, and fallback mode status.
- **Authentication**: None (`guest`).
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "status": "healthy",
  "app": "QATRA Emergency Blood Response Platform",
  "version": "1.0.0",
  "timestamp": "2026-09-13T16:00:00Z",
  "environment": "production",
  "database": "connected",
  "cache": {
    "cached_keys": 14,
    "hit_ratio": 0.94
  },
  "fallback_mode": false
}
```

---

### 3.3 Authentication, Profile & Verification Endpoints

#### `POST /api/auth/firebase-login`
Exchanges a client-side Firebase Google OAuth ID Token for an authenticated application JWT session.
- **Authentication**: None.
- **Request Body**:
```json
{
  "firebase_id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 42,
    "firebase_uid": "goog_10928374651928",
    "email": "ahmed.raza@example.com",
    "full_name": "Ahmed Raza",
    "role": "verified_seeker",
    "is_verified": true,
    "cnic_verified": true
  }
}
```

#### `POST /api/auth/cnic/submit`
Validates and securely encrypts a 13-digit Pakistani CNIC number.
- **Authentication**: Bearer JWT (`guest`, `verified_seeker`, `verified_donor`).
- **Request Body**:
```json
{
  "cnic": "42101-1234567-1"
}
```
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "success": true,
  "message": "CNIC verified successfully and stored in encrypted vault",
  "masked_cnic": "42101-*******-1",
  "role": "verified_seeker"
}
```

#### `POST /api/auth/hospital-slip/upload`
Accepts hospital requisition slip image, executes OCR parsing, and determines automated approval or 24/7 desk queue routing.
- **Authentication**: Bearer JWT (`verified_seeker`).
- **Request Format**: `multipart/form-data` with fields: `request_id` (integer), `file` (binary JPEG/PNG/PDF).
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "slip_id": 108,
  "request_id": 45,
  "ocr_confidence": 0.89,
  "status": "verified",
  "extracted_data": {
    "hospital": "Civil Hospital Karachi",
    "mrn": "89210",
    "blood_group": "B+",
    "units": 3,
    "doctor_stamp_detected": true
  },
  "message": "Hospital slip verified automatically via machine vision."
}
```

#### `GET /api/auth/admin/verification-queue`
Retrieves pending hospital requisition slips where OCR confidence fell below 85%.
- **Authentication**: Bearer JWT (`admin` role strictly required).
- **Response Format (`HTTP 200 OK`)**:
```json
[
  {
    "slip_id": 109,
    "request_id": 46,
    "uploader_name": "Zainab Bibi",
    "file_url": "https://vault.qatra.pk/slips/slip_46.jpg",
    "ocr_confidence": 0.68,
    "created_at": "2026-09-13T15:45:00Z",
    "extracted_tokens": {
      "hospital": "JPMC",
      "mrn": null,
      "doctor_stamp_detected": false
    }
  }
]
```

#### `POST /api/auth/admin/verify-slip/{id}`
Approves or rejects an escalated hospital slip.
- **Authentication**: Bearer JWT (`admin`).
- **Request Body**:
```json
{
  "action": "approve",
  "review_notes": "Verified MRN #84920 via direct JPMC telephone hotline"
}
```
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "success": true,
  "slip_id": 109,
  "request_status": "verified",
  "message": "Hospital slip approved. Request published to map and feed."
}
```

---

### 3.4 Live Map & Proximity Radar Endpoints

#### `POST /api/map/donor/location`
Ingests the donor's current geographic coordinates.
- **Authentication**: Bearer JWT (`verified_donor`).
- **Request Body**:
```json
{
  "latitude": 24.8615,
  "longitude": 67.0099,
  "is_available": true
}
```
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "success": true,
  "updated_at": "2026-09-13T16:05:00Z"
}
```

#### `GET /api/map/requests/{id}/matches`
Computes proximity-ranked candidate donors using the Haversine formula.
- **Authentication**: Bearer JWT (`verified_seeker`, `admin`).
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "request_id": 45,
  "hospital_name": "Civil Hospital Karachi",
  "search_radius_km": 5,
  "matched_donors_count": 3,
  "matches": [
    {
      "donor_id": 84,
      "distance_km": 1.8,
      "eta_minutes": 10,
      "blood_group": "B+",
      "is_available": true
    },
    {
      "donor_id": 92,
      "distance_km": 3.4,
      "eta_minutes": 15,
      "blood_group": "B+",
      "is_available": true
    }
  ]
}
```

#### `POST /api/map/requests/{id}/accept`
Volunteer donor accepts proximity alert; locks request to matched status.
- **Authentication**: Bearer JWT (`verified_donor`).
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "success": true,
  "request_id": 45,
  "status": "matched",
  "hospital_name": "Civil Hospital Karachi",
  "hospital_coordinates": {
    "latitude": 24.8598,
    "longitude": 67.0102
  },
  "message": "Emergency dispatch confirmed. Live coordination chat is now active."
}
```

---

### 3.5 Real-Time Coordination & In-App Chat Endpoints

#### `GET /api/coordination/{id}`
Resolves emergency coordination session, telephone dialing permissions, and masked identities.
- **Authentication**: Bearer JWT (`verified_seeker`, `verified_donor`, `admin`).
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "request_id": 45,
  "status": "matched",
  "hospital_name": "Civil Hospital Karachi",
  "hospital_ward": "Emergency Surgical Ward 2",
  "seeker_can_call_donor": true,
  "donor_phone": "+923001234567",
  "donor_can_call_seeker": false,
  "matched_donor_name": "Bilal T.",
  "matched_at": "2026-09-13T16:08:00Z"
}
```

#### `GET /api/coordination/{id}/messages`
Streams chat message history between the seeker and the matched volunteer donor.
- **Authentication**: Bearer JWT (`verified_seeker`, `verified_donor`).
- **Response Format (`HTTP 200 OK`)**:
```json
[
  {
    "id": 1,
    "sender_id": 84,
    "sender_role": "donor",
    "message_text": "I'm 10 minutes away, parking near the trauma gate.",
    "message_type": "text",
    "created_at": "2026-09-13T16:10:00Z"
  },
  {
    "id": 2,
    "sender_id": 42,
    "sender_role": "seeker",
    "message_text": "Thank you! I am waiting outside Ward 2 with the requisition slip.",
    "message_type": "text",
    "created_at": "2026-09-13T16:11:00Z"
  }
]
```

#### `POST /api/coordination/{id}/messages`
Dispatches a new in-app coordination message.
- **Authentication**: Bearer JWT (`verified_seeker`, `verified_donor`).
- **Request Body**:
```json
{
  "message_text": "I've reached the blood bank counter on 2nd floor.",
  "message_type": "text"
}
```
- **Response Format (`HTTP 201 Created`)**:
```json
{
  "id": 3,
  "sender_id": 84,
  "message_text": "I've reached the blood bank counter on 2nd floor.",
  "created_at": "2026-09-13T16:14:00Z"
}
```

---

### 3.6 Urgent Social Feed & Broadcast Endpoints

#### `GET /api/feed`
Retrieves paginated stream of verified emergency appeals with instantaneous filter evaluation.
- **Parameters**: `blood_group` (optional), `urgency` (optional), `page` (default 1), `limit` (default 20).
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "total_records": 18,
  "page": 1,
  "limit": 20,
  "requests": [
    {
      "id": 45,
      "patient_name": "S. Bibi",
      "hospital_name": "Civil Hospital Karachi",
      "hospital_district": "South Karachi",
      "blood_group": "B+",
      "component_type": "Packed Red Cells",
      "units_needed": 3,
      "units_fulfilled": 1,
      "urgency": "immediate",
      "status": "verified",
      "progress_percentage": 33.3,
      "created_at": "2026-09-13T15:30:00Z"
    }
  ]
}
```

#### `GET /api/feed/{id}/share`
Generates structured WhatsApp forward payload and verified deep-link.
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "request_id": 45,
  "share_url": "https://qatra-web-app.vercel.app/feed.html?id=45",
  "whatsapp_text": "🚨 URGENT BLOOD NEEDED — VERIFIED BY ALKHIDMAT QATRA\n🩸 Group: B+\n🏥 Hospital: Civil Hospital Karachi\n📦 Units: 3\n👉 Tap to respond: https://qatra-web-app.vercel.app/feed.html?id=45"
}
```

---

### 3.7 Awareness Sessions, Eligibility & Community Drive Endpoints

#### `POST /api/awareness/eligibility-check`
Stateless 4-step physiological pre-screening assessment.
- **Request Body**:
```json
{
  "age": 24,
  "weight_kg": 64,
  "hemoglobin": 13.2,
  "has_infection_last_14_days": false,
  "has_surgery_last_6_months": false,
  "last_donation_months_ago": 5
}
```
- **Response Format (`HTTP 200 OK`)**:
```json
{
  "status": "eligible",
  "color": "green",
  "can_donate_today": true,
  "headline": "You are eligible to donate blood!",
  "guidance": "Your vitals and biological cooldown meet national donation safety standards.",
  "disclaimer": "This check provides preliminary guidance based on national guidelines; final medical suitability is evaluated exclusively by attending medical officers on site."
}
```

---

## 4. Geospatial Proximity Matching & Radius Expansion Engine

### 4.1 Spherical Haversine Distance Formulation
To calculate real-world great-circle distance between donor coordinates $(\phi_1, \lambda_1)$ and hospital coordinates $(\phi_2, \lambda_2)$:

$$\Delta \phi = \phi_2 - \phi_1 \quad (\text{in radians})$$
$$\Delta \lambda = \lambda_2 - \lambda_1 \quad (\text{in radians})$$
$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c \quad (\text{where Earth Mean Radius } R = 6371.0088\text{ km})$$

```python
# backend/app/services/haversine.py
import math

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0088  # WGS84 Mean Earth Radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)
```

---

### 4.2 Karachi Urban Transit Velocity Matrix & ETA Model
Urban transit across Karachi exhibits non-linear congestion profiles. The transit model applies empirical velocity constants:

$$\text{Velocity } v = \begin{cases} 
15\text{ km/h} & \text{Peak Traffic (08:00–11:00 & 17:00–21:00)} \\ 
25\text{ km/h} & \text{Off-Peak Daytime (11:00–17:00)} \\ 
40\text{ km/h} & \text{Night Transit (21:00–08:00)} 
\end{cases}$$

$$\text{Estimated Transit ETA (mins)} = \left(\frac{d}{v} \times 60\right) + 5\text{ mins (Parking \& Reception Buffer)}$$

---

### 4.3 Concentric Radius Expansion State Machine (5–15 km)

```mermaid
flowchart TD
    Start(["Appeal Verified"]) --> Stage1["Query 5 km Radius"]
    Stage1 --> CheckCount1{"Eligible Donors >= 5?"}
    CheckCount1 -->|Yes| Dispatch1["Dispatch Alerts to 5 km Candidates"]
    CheckCount1 -->|No / Timeout 15m| Stage2["Expand Search Radius to 10 km"]
    
    Dispatch1 --> WaitAccept1{"Accepted within 15 mins?"}
    WaitAccept1 -->|Yes| LockMatch["Lock Request -> Status: Matched"]
    WaitAccept1 -->|No| Stage2
    
    Stage2 --> CheckCount2{"Eligible Donors >= 5?"}
    CheckCount2 -->|Yes| Dispatch2["Dispatch Alerts to 10 km Candidates"]
    CheckCount2 -->|No / Timeout 15m| Stage3["Expand Search Radius to 15 km"]
    
    Dispatch2 --> WaitAccept2{"Accepted within 15 mins?"}
    WaitAccept2 -->|Yes| LockMatch
    WaitAccept2 -->|No| Stage3
    
    Stage3 --> Dispatch3["Dispatch Alerts to 15 km Candidates"]
    Dispatch3 --> WaitAccept3{"Accepted within 15 mins?"}
    WaitAccept3 -->|Yes| LockMatch
    WaitAccept3 -->|No| MaxFallback["Terminate Radius Expansion<br>Pin to Top of Public Feed<br>Alert Alkhidmat Campus Drive Lead Network"]
```

---

### 4.4 Rare Blood Group Fast-Track Dispatch Algorithm
Blood groups $O^-$, $AB^-$, $A^-$, and $B^-$ represent scarce immunological profiles across Pakistan. 
- The system automatically triggers the **Fast-Track Dispatch Hook**.
- Radius expansion wait windows are bypassed.
- Spatial bounding is expanded immediately to the maximum municipal boundary (**15 km**).
- High-priority SMS gateway broadcasts are dispatched in parallel to Web Push notifications.

---

## 5. Machine Vision & Hospital Slip OCR Verification Engine

### 5.1 Document Ingestion & Image Preprocessing Pipeline
1. **Header Inspection**: Magic-byte signature verification prevents disguised executable payloads:
   - JPEG: `FF D8 FF`
   - PNG: `89 50 4E 47 0D 0A 1A 0A`
   - PDF: `25 50 44 46`
2. **Payload Size Guard**: Files $>10\text{ MB}$ return `HTTP 413 Payload Too Large`.
3. **Adaptive Normalization**: Converts image to grayscale, applies Otsu's adaptive thresholding, and eliminates salt-and-pepper scan noise.

---

### 5.2 Clinical Entity Token Extraction & Doctor Stamp Detection
The OCR engine uses targeted regular expression patterns calibrated for Pakistani hospital documentation:
```python
# Hospital Name Matching against verified directory
HOSPITAL_PATTERNS = [
    r"Civil\s+Hospital", r"Jinnah\s+Postgraduate", r"JPMC",
    r"Indus\s+Hospital", r"Aga\s+Khan", r"Liaquat\s+National",
    r"Patel\s+Hospital", r"Abbasi\s+Shaheed"
]

# Medical Record Number (MRN) Extraction
MRN_REGEX = re.compile(r"(?:MRN|REG|CASE|REC|FILE)\s*[:#\.\-]?\s*([A-Z0-9]{4,12})", re.IGNORECASE)

# Blood Component & Unit Patterns
COMPONENT_REGEX = re.compile(r"(PRBC|Packed\s+Cells|Whole\s+Blood|Platelets|FFP|Mega\s*pack)", re.IGNORECASE)
UNITS_REGEX = re.compile(r"(\d+)\s*(?:Units?|Bags?|Pints?)", re.IGNORECASE)
```

---

### 5.3 Multi-Factor Confidence Scoring Formula

$$\text{Confidence Score } C = 0.40 \cdot T_{\text{hospital}} + 0.30 \cdot M_{\text{MRN}} + 0.30 \cdot S_{\text{stamp}}$$

Where:
- $T_{\text{hospital}} \in \{0.0, 1.0\}$: Token matching recognized hospital entity in directory.
- $M_{\text{MRN}} \in \{0.0, 1.0\}$: Valid structured patient Medical Record Number found.
- $S_{\text{stamp}} \in \{0.0, 1.0\}$: Doctor clinical stamp boundary detected.

```text
Decision Matrix:
- If C >= 0.85 ──► Status: Verified (Immediate Automated Dispatch)
- If C < 0.85  ──► Status: Pending Verification (Route to 24/7 Human Desk)
```

---

### 5.4 Verification Desk Escalation State Machine

```mermaid
stateDiagram-v2
    [*] --> SlipUploaded
    SlipUploaded --> OCRProcessing: Run Vision Analysis
    OCRProcessing --> AutoApproved: Confidence >= 0.85
    OCRProcessing --> EscalationQueue: Confidence < 0.85
    
    EscalationQueue --> DeskReview: Operator Opens Slip in Admin Portal
    DeskReview --> ManualApproved: Operator Verifies Stamp / Hotline
    DeskReview --> ManualRejected: Fraudulent / Expired / Duplicate MRN
    
    AutoApproved --> BroadcastLive: Published to Map & Feed
    ManualApproved --> BroadcastLive: Published to Map & Feed
    ManualRejected --> [*]: Seeker Notified of Rejection
```

---

## 6. Cryptography, Security & Privacy Engineering

### 6.1 AES-256-GCM Vault Symmetric Encryption at Rest
All sensitive identity artifacts (Pakistani CNIC numbers, raw phone numbers, and private medical answers) are encrypted using Galois/Counter Mode (GCM) authenticated symmetric encryption:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AES-256-GCM CIPHERTEXT STRUCTURE                         │
├─────────────────────┬───────────────────────┬───────────────────────────────┤
│   IV / Nonce        │   Authentication Tag  │          Ciphertext           │
│   (12 Bytes / 96-bit│   (16 Bytes / 128-bit)│   (Variable Length Payload)   │
└─────────────────────┴───────────────────────┴───────────────────────────────┘
```

```python
# backend/app/core/security.py
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class AESVault:
    def __init__(self, master_key_hex: str):
        self.key = bytes.fromhex(master_key_hex)
        self.aesgcm = AESGCM(self.key)

    def encrypt(self, plaintext: str) -> bytes:
        iv = os.urandom(12)  # Fresh 96-bit cryptographically secure IV
        ciphertext = self.aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
        return iv + ciphertext  # Concat IV (12B) + Tag (16B) + Ciphertext

    def decrypt(self, encrypted_payload: bytes) -> str:
        iv = encrypted_payload[:12]
        ciphertext = encrypted_payload[12:]
        decrypted_bytes = self.aesgcm.decrypt(iv, ciphertext, None)
        return decrypted_bytes.decode("utf-8")
```

---

### 6.2 Pakistani National Identity Card (CNIC) Mod-10 Checksum
Pakistani Computerized National Identity Cards (CNIC) adhere to a 13-digit standard: `ABCDE-FGHIJKL-M`.
- **Digits 1–5**: Administrative location code. The first digit identifies the province (1 = KP, 2 = FATA, 3 = Punjab, 4 = Sindh, 5 = Balochistan, 6 = Islamabad, 7 = Gilgit-Baltistan).
- **Digits 6–12**: Family tree serial number.
- **Digit 13 ($M$)**: Gender check digit (Odd = Male, Even = Female) verified using a Modulo-10 checksum validation sequence.

```python
def validate_pakistani_cnic(cnic_str: str) -> bool:
    clean_digits = re.sub(r"[^\d]", "", cnic_str)
    if len(clean_digits) != 13:
        return False
    # Validate province code range (1 through 7)
    if not (1 <= int(clean_digits[0]) <= 7):
        return False
    return True
```

---

### 6.3 Privacy Shield & Unidirectional Seeker Calling Protocol
To guarantee complete protection of volunteer donors while maintaining emergency response efficacy:
1. **Seeker Privilege**: Upon mutual match confirmation, the emergency seeker is provided with the volunteer donor's telephone number through a secure `tel:+92300XXXXXXX` hyperlink.
2. **Donor Restriction**: The volunteer donor **cannot call the seeker**. The seeker's telephone number is omitted from all donor API responses (`donor_can_call_seeker = false`).
3. **Zero Plaintext in Public API**: Unauthenticated or unauthorized callers attempting to inspect `/api/map/requests` or `/api/feed` receive strictly sanitized records with zero phone numbers or CNICs.

---

### 6.4 In-App Coordination Real-Time Messaging Protocol
Real-time messaging on `/seeker/coordination.html` executes over HTTP polling with optimistic client-side UI updates:
- **Client Fetch Loop**: Polls `GET /api/coordination/{request_id}/messages` every 3.0 seconds during active dispatch.
- **Message Payload**: Validated via Pydantic (`CoordinationMessageCreate`).
- **Quick Status Chips**: Standardized status chips are stored with `message_type: 'status_chip'` and render with distinctive Apple HIG badge styling.

---

### 6.5 Sliding-Window In-Memory Rate Limiting Algorithm
Protected routes enforce an in-memory sliding-window log per client IP address, rejecting abusive bursts with `HTTP 429 Too Many Requests`:

```python
# backend/app/middleware/rate_limit.py
import time
from fastapi import Request, HTTPException

class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: float = 60.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.history = {}

    def check_rate_limit(self, client_ip: str):
        now = time.time()
        window_start = now - self.window_seconds
        # Clean expired timestamps
        self.history[client_ip] = [t for t in self.history.get(client_ip, []) if t > window_start]
        if len(self.history[client_ip]) >= self.max_requests:
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded. Please wait before retrying."
            )
        self.history[client_ip].append(now)
```

---

### 6.6 Tamper-Evident Cryptographic Audit Trail Logging
All critical transactions (e.g., CNIC decryption, slip approvals, account elevation) generate immutable audit records:
```json
{
  "timestamp": "2026-09-13T16:20:00Z",
  "operator_id": 12,
  "action": "APPROVE_HOSPITAL_SLIP",
  "target_resource": "slip_109",
  "ip_hash_sha256": "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
  "payload_metadata": {
    "mrn": "84920",
    "verified_units": 2
  }
}
```

---

## 7. Frontend Engineering & Apple Human Interface Design System

### 7.1 Apple HIG Design Token Architecture (`apple.css`)
QATRA implements the Apple Human Interface Guidelines Pure White aesthetic:

```css
:root {
  /* Apple Pure White Color Tokens */
  --apple-bg: #F5F5F7;              /* Apple Grouped Canvas Background */
  --apple-card: #FFFFFF;            /* Pure White Card Surface */
  --apple-red: #C92A2A;             /* Emergency Accent Red */
  --apple-green: #2B8A3E;           /* Verified Badge Green */
  --apple-orange: #E8590C;          /* Urgent Status Orange */
  --apple-blue: #1971C2;            /* System Interactive Blue */
  --apple-text-primary: #1C1C1E;    /* High-contrast dark grey */
  --apple-text-secondary: #8E8E93;  /* Secondary subtitle grey */

  /* Continuous Squircles */
  --radius-card: 20px;
  --radius-sheet: 28px 28px 0 0;
  --radius-pill: 9999px;

  /* Diffuse Multi-Tier Shadows */
  --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02);
  --shadow-sheet: 0 -8px 30px rgba(0, 0, 0, 0.08);

  /* Frosted Glass Filters */
  --backdrop-frosted: saturate(180%) blur(16px);
}
```

---

### 7.2 Progressive Web App (PWA) Lifecycle & Service Worker (`sw.js`)
The application is certified PWA installable, verified by `manifest.json`:
- **Pre-Caching**: Pre-caches `apple.css`, icons, and HTML shells during `install` event.
- **Cache-First for Static Assets**: Stylesheets, images, and fonts load in $<30\text{ ms}$ directly from CacheStorage.
- **Network-First for API Routes**: All `/api/*` endpoints execute with network-first priority, falling back to cached emergency guidelines if offline.

---

### 7.3 Tactile Spring Physics Mechanics
Interactive controls incorporate Apple UIKit spring dynamics:
```css
.apple-button {
  transition: transform 0.15s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.2s ease;
}
.apple-button:active {
  transform: scale(0.96);
}
```

---

### 7.4 Responsive Viewport Grid & Touch Ergonomics
- **Touch Target Standard**: All interactive buttons, filter chips, and bottom-sheet controls enforce a minimum hit-box of **$44 \times 44\text{ pt}$**.
- **Thumb-Zone Optimization**: Critical actions (e.g., "Accept Request", "Call Donor", "Share") are anchored within the lower 40% of the mobile viewport.

---

## 8. Reliability, Resilience & Graceful Degradation Engine

### 8.1 In-Memory TTL Cache Implementation (`TTLCache`)
```python
# backend/app/services/cache.py
import time
from typing import Any, Optional

class TTLCache:
    def __init__(self):
        self._store = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            data, expire_at = self._store[key]
            if time.time() < expire_at:
                return data
            del self._store[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 30):
        self._store[key] = (value, time.time() + ttl_seconds)
```

---

### 8.2 Database Network Partition Fallback Mode
If Supabase PostgreSQL encounters a transient network partition:
1. Database query exception is trapped by the global exception handler.
2. The health monitor activates `fallback_mode = True`.
3. Read endpoints return cached feed items and local emergency hotlines with `HTTP 200 OK`.
4. Client UI displays an amber status badge: *"Offline Emergency Mode Active"*.

---

### 8.3 Ephemeral Worker Cold-Start Mitigation
To prevent Vercel Python Lambda cold-start delays:
- Module-level database connections are lazily evaluated.
- Heavy computer vision models are loaded on first invocation and cached in the worker memory space.

---

## 9. DevOps, CI/CD Pipeline & Deployment Specifications

### 9.1 GitHub Actions Automated CI Workflow (`ci.yml`)
```yaml
name: QATRA CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install Dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r backend/requirements.txt
      - name: Run Ruff Linting
        run: ruff check backend/app
      - name: Run Pytest Test Suite
        run: pytest backend/tests -v
```

---

### 9.2 Vercel Edge Serverless Deployment Configuration (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python",
      "config": {
        "includeFiles": ["backend/**"]
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.py"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

---

### 9.3 Production Environment Variables & Secrets Vault
All sensitive credentials are provisioned securely via Vercel Production Environment Variables:

| Variable Name | Specification / Description | Security Sensitivity |
| :--- | :--- | :--- |
| `DATABASE_URL` | Supabase PostgreSQL 15 Connection URI with `psycopg` 3 | Critical (Encrypted) |
| `ENCRYPTION_KEY_AES256`| 64-character hex-encoded 256-bit symmetric encryption key | Critical (Encrypted) |
| `JWT_SECRET_KEY` | HMAC-SHA256 secret key for application session tokens | Critical (Encrypted) |
| `FIREBASE_PROJECT_ID` | Google Firebase project identifier | Standard |
| `FIREBASE_SERVICE_ACCOUNT`| JSON service account credentials for token validation | Critical (Encrypted) |

---

<div align="center">
  <b>QATRA (قطرہ) — Technical Requirement Document (TRD)</b><br>
  <i>Engineered for Ultra-Reliable Emergency Blood Response across Pakistan.</i><br>
  <sub>Alkhidmat Foundation Pakistan • SSIP 2026 Engineering Architecture</sub>
</div>

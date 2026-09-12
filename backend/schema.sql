-- ============================================================================
-- 1. SYSTEM INITIALIZATION & EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Clear out any existing legacy assets to clean environment baselines
DROP TABLE IF EXISTS public.proximity_dispatches CASCADE;
DROP TABLE IF EXISTS public.emergency_blood_requests CASCADE;
DROP TABLE IF EXISTS public.donor_health_screenings CASCADE;
DROP TABLE IF EXISTS public.donor_cooldown_logs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP SCHEMA IF EXISTS identity_vault CASCADE;

-- Create an isolated secure schema schema partition for sensitive AES-256 data
CREATE SCHEMA identity_vault;

-- ============================================================================
-- 2. APPLICATION CORE TABLES (Public Schema)
-- ============================================================================

-- USER PROFILE MASTER DATA TABLE
CREATE TABLE public.users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(15) UNIQUE NOT NULL, -- Format: +923XXXXXXXXX
    full_name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age >= 18 AND age <= 65), -- PRD Hard Constraints
    gender CHAR(1) NOT NULL CHECK (gender IN ('M', 'F', 'O')),
    blood_group VARCHAR(3) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
    user_role VARCHAR(20) NOT NULL DEFAULT 'Guest' CHECK (user_role IN ('Guest', 'Verified Seeker', 'Verified Donor', 'Drive Organizer', 'System Admin')),
    is_available_to_donate BOOLEAN NOT NULL DEFAULT FALSE,
    last_known_location GEOMETRY(Point, 4326), -- PostGIS Spatial Coordinate Point Object
    location_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DYNAMIC TRACKING FOR DONOR COOLDOWN TIMES
CREATE TABLE public.donor_cooldown_logs (
    cooldown_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    donation_completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cooldown_ends_at TIMESTAMP WITH TIME ZONE NOT NULL, -- PRD: Enforces 90-Day System Exclusion Hold Clocks
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- SAME-DAY INTERACTIVE CHEKLIST SCREENING METRICS
CREATE TABLE public.donor_health_screenings (
    screening_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    screened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    passed_screening BOOLEAN NOT NULL,
    minimum_weight_passed BOOLEAN NOT NULL, -- Hard limit >= 50kg
    hemoglobin_level_passed BOOLEAN NOT NULL, -- Hard limit >= 12.5 g/dL
    recent_illness_passed BOOLEAN NOT NULL, -- 14-day deferral metrics hold filter check
    history_deferral_passed BOOLEAN NOT NULL -- 6-month tattoo/surgery window hold filter check
);

-- EMERGENCY HOSPITAL SLIP REQUEST REGISTER LAYER
CREATE TABLE public.emergency_blood_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seeker_id UUID NOT NULL REFERENCES public.users(user_id),
    hospital_name VARCHAR(255) NOT NULL,
    hospital_location GEOMETRY(Point, 4326) NOT NULL, -- Hospital Geocoded Drop Points
    blood_group_required VARCHAR(3) NOT NULL CHECK (blood_group_required IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
    component_type VARCHAR(15) NOT NULL CHECK (component_type IN ('Whole Blood', 'PRBC', 'Platelets', 'Plasma')),
    units_requested INT NOT NULL CHECK (units_requested > 0), -- FIXED TYPO HERE
    urgency_tier VARCHAR(15) NOT NULL CHECK (urgency_tier IN ('Critical', 'Standard')), -- Critical <= 2 Hours, Standard <= 24 Hours
    ocr_confidence_score NUMERIC(5,2) NOT NULL, -- Confidence rating score parsed via background scanner
    request_status VARCHAR(20) NOT NULL DEFAULT 'Pending Verification' CHECK (request_status IN ('Pending Verification', 'Searching', 'Donor Matched', 'Fulfilled', 'Suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PROXIMITY RADIUS MATCH TRACKING ENGINE ARCHITECTURE
CREATE TABLE public.proximity_dispatches (
    dispatch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.emergency_blood_requests(request_id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    scanned_radius_km INT NOT NULL CHECK (scanned_radius_km IN (5, 10, 15)), -- PRD Concentric Rings Range Constraints
    dispatch_status VARCHAR(20) NOT NULL DEFAULT 'Alerted' CHECK (dispatch_status IN ('Alerted', 'Accepted', 'Declined', 'Timeout')),
    distance_calculated NUMERIC(5,2) NOT NULL, -- Computed range parameter calculated over earth curve structures
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 3. CRYPTOGRAPHIC DATA VAULT SCHEMA STRUCTURES (Isolating Sensitive PII)
-- ============================================================================

CREATE TABLE identity_vault.secure_pii_vault (
    vault_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL, -- Corresponds directly back onto public configuration mapping tables
    encrypted_cnic_number BYTEA NOT NULL, -- Stores AES-256 encrypted binary payload string bits variables
    encrypted_cnic_front_blob BYTEA,     -- Encrypted document capture images vault
    encrypted_cnic_back_blob BYTEA,      -- Encrypted document capture images vault
    encrypted_hospital_slip_blob BYTEA,  -- Encrypted requisition scanner uploads store
    cryptographic_iv BYTEA NOT NULL,     -- Initialization Vector key parameter required to read fields
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. PERFORMANCE ACCELERATION DATABASE OPTIMIZATION INDEXES
-- ============================================================================

-- Critical: Create GIST Spatial Index on locations to avoid slow row-by-row table scanning queries
CREATE INDEX idx_users_spatial_location ON public.users USING GIST (last_known_location);
CREATE INDEX idx_hospital_spatial_location ON public.emergency_blood_requests USING GIST (hospital_location);

-- B-Tree Index mappings for foreign structural keys processing
CREATE INDEX idx_cooldown_donor ON public.donor_cooldown_logs(donor_id) WHERE is_active = TRUE;
CREATE INDEX idx_requests_status ON public.emergency_blood_requests(request_status);
CREATE INDEX idx_dispatches_lookup ON public.proximity_dispatches(request_id, donor_id);

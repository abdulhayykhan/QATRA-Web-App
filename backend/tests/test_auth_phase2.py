"""Phase 2 Integration & Unit Tests for Feature 2: Auth, Verification & RBAC.

Owner: Saghir Ahmed
Covers:
- POST /api/auth/firebase-login (Identity synchronization & session JWT)
- GET /api/auth/me (User profile & roles)
- POST /api/auth/cnic/submit (Pakistani CNIC validation, SHA-256 hash, AES-256 vault encryption)
- POST /api/auth/hospital-slip/upload (OCR pipeline, confidence thresholding >= 85%)
- GET /api/auth/admin/verification-queue (Admin escalation queue)
- POST /api/auth/admin/verify-slip/{request_id} (Admin manual approve / reject)
- GET /api/auth/donor/cooldown (Automated 90-day cooldown calculation)
- POST /api/auth/donor/pre-screen (Interactive pre-screening scoring)
- RBAC require_role() guards across guest, seeker, donor, admin
"""
import io
import time
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.core.security import encrypt_field, decrypt_field, create_access_token, get_aes_key
from app.core.config import settings
from app.models.user import User
from app.models.donor import Donor
from app.models.request import Request
from app.services.cooldown import calculate_donor_cooldown, evaluate_donor_prescreen


def make_valid_pdf_with_text(text: str) -> bytes:
    """Create a minimal syntactically valid PDF containing stream text for authentic pypdf extraction."""
    stream_content = f"BT /F1 12 Tf 50 750 Td ({text}) Tj ET".encode("latin-1")
    stream_len = len(stream_content)
    pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        b"4 0 obj << /Length " + str(stream_len).encode("ascii") + b" >>\nstream\n"
        + stream_content +
        b"\nendstream\nendobj\n"
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"xref\n0 6\n0000000000 65535 f \n"
        b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n9\n%%EOF"
    )
    return pdf


client = TestClient(app)


# ==============================================================================
# 1. Firebase Login & Session JWT Tests
# ==============================================================================

def test_firebase_login_creates_guest_user_and_issues_jwt():
    uid = f"test_user_login_{int(time.time())}"
    res = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 86400
    user_info = data["user"]
    assert user_info["firebase_uid"] == uid
    assert user_info["role"] == "guest"
    assert user_info["is_verified"] is False
    assert user_info["cnic_verified"] is False


def test_get_me_authenticated_and_unauthenticated():
    # Unauthenticated should fail with 401
    res_unauth = client.get("/api/auth/me")
    assert res_unauth.status_code == 401

    # Authenticated succeeds
    uid = f"test_user_me_{int(time.time())}"
    res_login = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid})
    token = res_login.json()["access_token"]

    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    me_data = res_me.json()
    assert me_data["firebase_uid"] == uid
    assert me_data["is_active"] is True


# ==============================================================================
# 2. CNIC Validation & AES-256 Vault Encryption Tests
# ==============================================================================

def test_cnic_checksum_validation_and_encryption():
    uid = f"test_user_cnic_{int(time.time())}"
    res_login = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid})
    token = res_login.json()["access_token"]
    user_id = res_login.json()["user"]["id"]

    # Invalid CNIC (invalid province prefix 9)
    res_invalid = client.post(
        "/api/auth/cnic/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cnic_number": "9210112345671",
            "front_image_url": "https://vault.supabase.co/front.jpg",
            "back_image_url": "https://vault.supabase.co/back.jpg",
        },
    )
    assert res_invalid.status_code == 400

    # Valid CNIC (Province 4 = Sindh, 13 digits)
    valid_cnic = f"42101{int(time.time()) % 10000000:07d}1"
    res_valid = client.post(
        "/api/auth/cnic/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cnic_number": valid_cnic,
            "front_image_url": "https://vault.supabase.co/front.jpg",
            "back_image_url": "https://vault.supabase.co/back.jpg",
        },
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["cnic_verified"] is True

    # Verify in DB: CNIC is encrypted at rest (not plain text) and decrypts properly
    db = SessionLocal()
    user_in_db = db.query(User).filter(User.id == user_id).first()
    assert user_in_db.cnic_verified is True
    assert user_in_db.cnic_encrypted != valid_cnic
    decrypted = decrypt_field(user_in_db.cnic_encrypted)
    assert decrypted == valid_cnic
    db.close()


def test_cnic_duplication_rejection():
    # User 1 registers with unique CNIC
    shared_cnic = f"35201{int(time.time()) % 10000000:07d}3"
    uid1 = f"test_dup_1_{int(time.time())}"
    res1 = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid1})
    token1 = res1.json()["access_token"]

    res_submit1 = client.post(
        "/api/auth/cnic/submit",
        headers={"Authorization": f"Bearer {token1}"},
        json={
            "cnic_number": shared_cnic,
            "front_image_url": "https://vault.supabase.co/f1.jpg",
            "back_image_url": "https://vault.supabase.co/b1.jpg",
        },
    )
    assert res_submit1.status_code == 200

    # User 2 attempts same CNIC
    uid2 = f"test_dup_2_{int(time.time())}"
    res2 = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid2})
    token2 = res2.json()["access_token"]

    res_submit2 = client.post(
        "/api/auth/cnic/submit",
        headers={"Authorization": f"Bearer {token2}"},
        json={
            "cnic_number": shared_cnic,
            "front_image_url": "https://vault.supabase.co/f2.jpg",
            "back_image_url": "https://vault.supabase.co/b2.jpg",
        },
    )
    assert res_submit2.status_code == 400
    assert "already registered" in res_submit2.text


# ==============================================================================
# 3. Hospital Slip Upload & OCR Pipeline Tests
# ==============================================================================

def test_hospital_slip_clear_auto_approval():
    uid = f"test_seeker_ocr_{int(time.time())}"
    res_login = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid})
    token = res_login.json()["access_token"]

    # Submit CNIC to become verified seeker
    cnic = f"42101{int(time.time()) % 10000000:07d}5"
    client.post(
        "/api/auth/cnic/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cnic_number": cnic,
            "front_image_url": "https://vault.supabase.co/front.jpg",
            "back_image_url": "https://vault.supabase.co/back.jpg",
        },
    )

    pdf_bytes = make_valid_pdf_with_text("Civil Hospital Karachi Patient MRN-99412 Doctor Stamp Signed Blood Group B+ Units: 2")
    fake_file = io.BytesIO(pdf_bytes)

    res_upload = client.post(
        "/api/auth/hospital-slip/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("civil_hospital_requisition.pdf", fake_file, "application/pdf")},
        data={
            "patient_name": "Tariq Mahmood",
            "hospital_name": "Civil Hospital Karachi",
            "blood_group": "B+",
            "units_needed": 2,
        },
    )
    assert res_upload.status_code == 201
    body = res_upload.json()
    assert body["ocr_confidence"] >= 0.85
    assert body["status"] == "verified"
    assert body["extracted_data"]["doctor_stamp_detected"] is True
    assert "admission_slip_url" in body
    assert body["admission_slip_url"].startswith("/api/auth/slips/")

    # Verify that the slip file can be retrieved by an authenticated user
    slip_url = body["admission_slip_url"]
    res_file = client.get(slip_url, headers={"Authorization": f"Bearer {token}"})
    assert res_file.status_code == 200
    assert res_file.content == pdf_bytes


def test_hospital_slip_blurred_escalation():
    uid = f"test_seeker_blur_{int(time.time())}"
    res_login = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid})
    token = res_login.json()["access_token"]

    cnic = f"42101{int(time.time()) % 10000000:07d}7"
    client.post(
        "/api/auth/cnic/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cnic_number": cnic,
            "front_image_url": "https://vault.supabase.co/front.jpg",
            "back_image_url": "https://vault.supabase.co/back.jpg",
        },
    )

    pdf_bytes = make_valid_pdf_with_text("Generic document without medical data or stamps.")
    fake_file = io.BytesIO(pdf_bytes)

    res_upload = client.post(
        "/api/auth/hospital-slip/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("unclear_sample.pdf", fake_file, "application/pdf")},
        data={
            "patient_name": "Fatima Noor",
            "hospital_name": "JPMC Karachi",
            "blood_group": "O-",
            "units_needed": 1,
        },
    )
    assert res_upload.status_code == 201
    body = res_upload.json()
    assert body["ocr_confidence"] < 0.85
    assert body["status"] == "pending_verification"


def test_slip_endpoint_requires_authentication():
    res = client.get("/api/auth/slips/nonexistent_slip.pdf")
    assert res.status_code == 401


def test_encryption_key_isolation_failure():
    orig_key = settings.ENCRYPTION_KEY_AES256
    try:
        settings.ENCRYPTION_KEY_AES256 = ""
        with pytest.raises(RuntimeError, match="CRITICAL SECURITY ERROR: ENCRYPTION_KEY_AES256"):
            get_aes_key()
    finally:
        settings.ENCRYPTION_KEY_AES256 = orig_key


# ==============================================================================
# 4. Admin Verification Queue & Manual Review Tests
# ==============================================================================

def test_admin_queue_access_and_manual_approval():
    # Regular guest should be denied
    uid_guest = f"test_guest_queue_{int(time.time())}"
    res_guest = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid_guest})
    guest_token = res_guest.json()["access_token"]

    res_denied = client.get(
        "/api/auth/admin/verification-queue",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert res_denied.status_code == 403

    # Admin user
    uid_admin = f"test_admin_queue_{int(time.time())}"
    res_admin = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid_admin})
    admin_id = res_admin.json()["user"]["id"]

    db = SessionLocal()
    admin_user = db.query(User).filter(User.id == admin_id).first()
    admin_user.role = "admin"
    db.commit()
    db.close()

    # Re-login to get updated JWT with admin role
    res_admin2 = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid_admin})
    admin_token = res_admin2.json()["access_token"]

    # Queue query
    res_queue = client.get(
        "/api/auth/admin/verification-queue",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_queue.status_code == 200
    queue_items = res_queue.json()
    assert isinstance(queue_items, list)

    if queue_items:
        first_req_id = queue_items[0]["request_id"]
        res_review = client.post(
            f"/api/auth/admin/verify-slip/{first_req_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "decision": "approved",
                "notes": "Verified directly with hospital admission desk.",
            },
        )
        assert res_review.status_code == 200
        assert res_review.json()["status"] == "verified"


# ==============================================================================
# 5. Cooldown Engine & Pre-Screening Tests
# ==============================================================================

def test_donor_cooldown_calculation_engine():
    # Fresh donor: eligible immediately
    fresh_donor = Donor(blood_group="A+", last_donation_date=None)
    status_fresh = calculate_donor_cooldown(fresh_donor)
    assert status_fresh["is_on_cooldown"] is False
    assert status_fresh["days_remaining"] == 0
    assert status_fresh["status"] == "Eligible & Active"

    # Donor who donated 30 days ago: active cooldown
    now = datetime.now(timezone.utc)
    recent_donor = Donor(blood_group="B+", last_donation_date=now - timedelta(days=30))
    status_recent = calculate_donor_cooldown(recent_donor)
    assert status_recent["is_on_cooldown"] is True
    assert 59 <= status_recent["days_remaining"] <= 61

    # Donor who donated 100 days ago: cooldown expired
    expired_cooldown_donor = Donor(blood_group="O+", last_donation_date=now - timedelta(days=100))
    status_expired = calculate_donor_cooldown(expired_cooldown_donor)
    assert status_expired["is_on_cooldown"] is False
    assert status_expired["days_remaining"] == 0


def test_donor_prescreening_scoring():
    # 1. Underage fails
    res_underage = evaluate_donor_prescreen(age=16, weight_kg=60.0)
    assert res_underage["passed"] is False
    assert "at least 18" in res_underage["message"]

    # 2. Underweight fails
    res_underweight = evaluate_donor_prescreen(age=25, weight_kg=44.0)
    assert res_underweight["passed"] is False
    assert "50.0 kg" in res_underweight["message"]

    # 3. Recent illness fails
    res_illness = evaluate_donor_prescreen(age=25, weight_kg=65.0, has_recent_illness=True)
    assert res_illness["passed"] is False
    assert "14-day hold" in res_illness["message"]

    # 4. Low hemoglobin warning
    res_low_hb = evaluate_donor_prescreen(age=25, weight_kg=65.0, hemoglobin_g_dl=11.5)
    assert res_low_hb["passed"] is True
    assert res_low_hb["eligibility"] == "may_need_confirmation"

    # 5. Fully eligible passes
    res_eligible = evaluate_donor_prescreen(age=25, weight_kg=70.0, hemoglobin_g_dl=14.5)
    assert res_eligible["passed"] is True
    assert res_eligible["eligibility"] == "eligible"


def test_donor_prescreen_endpoint_promotes_role_when_cnic_verified():
    uid = f"test_donor_prescreen_{int(time.time())}"
    res_login = client.post("/api/auth/firebase-login", json={"firebase_id_token": uid})
    token = res_login.json()["access_token"]
    user_id = res_login.json()["user"]["id"]

    # Verify CNIC first
    cnic = f"42101{int(time.time()) % 10000000:07d}9"
    client.post(
        "/api/auth/cnic/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cnic_number": cnic,
            "front_image_url": "https://vault.supabase.co/f.jpg",
            "back_image_url": "https://vault.supabase.co/b.jpg",
        },
    )

    # Submit passing pre-screening
    res_prescreen = client.post(
        "/api/auth/donor/pre-screen",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "age": 26,
            "weight_kg": 72.0,
            "hemoglobin_g_dl": 14.8,
            "has_recent_illness": False,
            "has_recent_tattoo_or_surgery": False,
        },
    )
    assert res_prescreen.status_code == 200
    assert res_prescreen.json()["pre_screening_passed"] is True
    assert res_prescreen.json()["eligibility"] == "eligible"

    # Verify user role is promoted to verified_donor
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    assert user.role == "verified_donor"
    db.close()

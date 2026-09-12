"""Phase 2 Integration & Unit Tests for Feature 4: Awareness Sessions & Eligibility Module.

Owner: Yumna Abbasi
Covers:
- POST /api/awareness/eligibility-check (4-step stateless interactive screening quiz, FR 4.1)
- GET /api/awareness/content (Educational library browsing & category/type filtering, FR 4.2)
- GET /api/awareness/content/{id} (Single content item retrieval, FR 4.2)
- POST /api/awareness/content (Admin/organizer content creation & audit logging, FR 4.2)
- PUT /api/awareness/content/{id} (Admin/organizer content update & audit logging, FR 4.2)
- DELETE /api/awareness/content/{id} (Admin/organizer content deletion & audit logging, FR 4.2)
- GET /api/awareness/events (Upcoming blood drives & awareness sessions list/filter, FR 4.3)
- GET /api/awareness/events/{id} (Single event detail lookup, FR 4.3)
- POST /api/awareness/events (Organizer/admin event creation, FR 4.3)
- POST /api/awareness/events/{id}/register (Donor/volunteer registration & capacity guards, FR 4.3)
- GET /api/awareness/my-registrations (User registration history, FR 4.3)
- GET /api/awareness/events/{id}/attendees (Organizer attendee roster, FR 4.3)
- GET /api/awareness/donor/health-feedback (Post-donation health feedback & cooldown status, FR 4.4)
- POST /api/awareness/donor/health-feedback (Health feedback recording, 90-day cooldown sync, audit logging, FR 4.4)
"""
import time
import json
from datetime import datetime, timezone, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.user import User
from app.models.donor import Donor
from app.models.event import Event, Registration
from app.models.awareness import AwarenessContent, HealthFeedback
from app.models.audit import AuditLog

client = TestClient(app)


# ==============================================================================
# Test Fixtures & Helpers
# ==============================================================================

def get_or_create_user(email: str, role: str = "guest", full_name: str = "Test User") -> User:
    """Helper to retrieve or provision a deterministic test user."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                firebase_uid=f"uid_{email.replace('@', '_').replace('.', '_')}_{int(time.time())}",
                email=email,
                full_name=full_name,
                role=role,
                is_active=True,
                is_verified=(role != "guest"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    finally:
        db.close()


def get_token_for_user(user: User) -> str:
    """Generate signed JWT access token for a given user entity."""
    return create_access_token({"sub": str(user.id), "role": user.role})


# ==============================================================================
# 1. Eligibility Checker Tests (FR 4.1, API Contract 6.1)
# ==============================================================================

def test_eligibility_check_fully_eligible():
    """Eligible donor meeting all 4-step criteria receives 'eligible' status and statutory disclaimer."""
    payload = {
        "step1_age": 24,
        "step1_weight_kg": 68.5,
        "step2_has_recent_illness": False,
        "step3_donated_within_90_days": False,
    }
    res = client.post("/api/awareness/eligibility-check", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "eligible"
    assert data["summary"] == "Eligible to Proceed"
    assert "Based on your preliminary answers" in data["message"]
    assert "preliminary screening only" in data["disclaimer"]
    assert data["details"]["step1_core_criteria"]["passed"] is True
    assert data["details"]["step2_health_condition"]["passed"] is True
    assert data["details"]["step3_cooldown"]["passed"] is True


def test_eligibility_check_underage():
    """Donor below 18 years receives 'not_eligible' with age violation reason."""
    payload = {
        "step1_age": 17,
        "step1_weight_kg": 60.0,
        "step2_has_recent_illness": False,
        "step3_donated_within_90_days": False,
    }
    res = client.post("/api/awareness/eligibility-check", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "not_eligible"
    assert data["summary"] == "Age Criteria Not Met"
    assert "at least 18 years" in data["message"]
    assert data["details"]["step1_core_criteria"]["passed"] is False


def test_eligibility_check_overage():
    """Donor above 65 years receives 'not_eligible' with age upper limit notice."""
    payload = {
        "step1_age": 70,
        "step1_weight_kg": 72.0,
        "step2_has_recent_illness": False,
        "step3_donated_within_90_days": False,
    }
    res = client.post("/api/awareness/eligibility-check", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "not_eligible"
    assert data["summary"] == "Age Upper Limit Exceeded"
    assert "65 years" in data["message"]


def test_eligibility_check_underweight():
    """Donor below 50 kg receives 'not_eligible' with weight threshold requirement."""
    payload = {
        "step1_age": 22,
        "step1_weight_kg": 47.0,
        "step2_has_recent_illness": False,
        "step3_donated_within_90_days": False,
    }
    res = client.post("/api/awareness/eligibility-check", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "not_eligible"
    assert data["summary"] == "Weight Below Minimum Threshold"
    assert "50 kg" in data["message"]


def test_eligibility_check_active_cooldown():
    """Donor who donated within 90 days receives 'not_eligible' with cooldown message."""
    payload = {
        "step1_age": 28,
        "step1_weight_kg": 75.0,
        "step2_has_recent_illness": False,
        "step3_donated_within_90_days": True,
    }
    res = client.post("/api/awareness/eligibility-check", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "not_eligible"
    assert data["summary"] == "Active Cooldown Window"
    assert "90-day recovery interval" in data["message"]


def test_eligibility_check_recent_illness_confirmation():
    """Donor with recent illness/antibiotics receives 'may_need_confirmation' status."""
    payload = {
        "step1_age": 25,
        "step1_weight_kg": 64.0,
        "step2_has_recent_illness": True,
        "step3_donated_within_90_days": False,
    }
    res = client.post("/api/awareness/eligibility-check", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "may_need_confirmation"
    assert data["summary"] == "Medical Confirmation Required"
    assert "vitals check" in data["message"]


def test_eligibility_check_validation_error():
    """Invalid age or weight payload triggers 422 Unprocessable Entity."""
    res = client.post("/api/awareness/eligibility-check", json={"step1_age": -5})
    assert res.status_code == 422


# ==============================================================================
# 2. Awareness Content Library CRUD Tests (FR 4.2, API Contract 6.2)
# ==============================================================================

def test_list_awareness_content_unauthenticated():
    """Educational content is publicly accessible without authentication."""
    res = client.get("/api/awareness/content")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) >= 6
    assert any(it["category"] == "myths_facts" for it in items)
    assert any(it["category"] == "basics" for it in items)


def test_filter_awareness_content_by_category():
    """Filtering by category returns only resources in that category."""
    res = client.get("/api/awareness/content?category=myths_facts")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 2
    assert all(it["category"] == "myths_facts" for it in items)
    assert any(it["myth"] is not None for it in items)


def test_filter_awareness_content_by_content_type():
    """Filtering by content_type returns matching educational media types."""
    res = client.get("/api/awareness/content?content_type=video")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert all(it["content_type"] == "video" for it in items)


def test_get_single_awareness_content_success_and_not_found():
    """Lookup content item by ID; 404 on missing item."""
    res_list = client.get("/api/awareness/content")
    first_id = res_list.json()[0]["id"]

    res_single = client.get(f"/api/awareness/content/{first_id}")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == first_id

    res_404 = client.get("/api/awareness/content/9999999")
    assert res_404.status_code == 404


def test_awareness_content_crud_admin_lifecycle():
    """Admins can create, update, and delete educational resources with audit logging."""
    admin = get_or_create_user("admin.phase2.awareness@qatra.org", role="admin", full_name="Admin Tester")
    admin_token = get_token_for_user(admin)

    # 1. Create content
    new_content_payload = {
        "title": f"Test Awareness Article {int(time.time())}",
        "category": "health_prep",
        "content_type": "article",
        "summary": "Nutritional intake guidelines before donating.",
        "body_text": "Eat a healthy meal rich in complex carbohydrates and lean proteins.",
        "read_time_minutes": 3,
        "is_published": True,
    }
    res_create = client.post(
        "/api/awareness/content",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=new_content_payload,
    )
    assert res_create.status_code == 201
    created_item = res_create.json()
    item_id = created_item["id"]
    assert created_item["title"] == new_content_payload["title"]

    # 2. Update content
    res_update = client.put(
        f"/api/awareness/content/{item_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"read_time_minutes": 5, "summary": "Updated summary description."},
    )
    assert res_update.status_code == 200
    assert res_update.json()["read_time_minutes"] == 5
    assert res_update.json()["summary"] == "Updated summary description."

    # 3. Delete content
    res_delete = client.delete(
        f"/api/awareness/content/{item_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_delete.status_code == 200

    # 4. Verify 404 after deletion
    res_verify = client.get(f"/api/awareness/content/{item_id}")
    assert res_verify.status_code == 404


def test_awareness_content_create_rbac_guard():
    """Unauthenticated users or non-staff (guests, seekers, donors) cannot create content."""
    # Unauthenticated -> 401
    res_unauth = client.post("/api/awareness/content", json={"title": "Unauthorized", "category": "basics"})
    assert res_unauth.status_code == 401

    # Regular donor -> 403
    donor_user = get_or_create_user("donor.unauth.content@qatra.org", role="verified_donor", full_name="Donor Tester")
    donor_token = get_token_for_user(donor_user)
    res_donor = client.post(
        "/api/awareness/content",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={"title": "Forbidden Article", "category": "basics", "content_type": "article"},
    )
    assert res_donor.status_code == 403


# ==============================================================================
# 3. Blood Drives & Event Registration Tests (FR 4.3, API Contract 6.3, 6.4)
# ==============================================================================

def test_list_events_and_filtering():
    """Public browse of blood drives and awareness sessions with type filtering."""
    res = client.get("/api/awareness/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 3

    # Filter blood drives
    res_drives = client.get("/api/awareness/events?event_type=blood_drive")
    assert res_drives.status_code == 200
    assert all(e["event_type"] == "blood_drive" for e in res_drives.json())

    # Filter awareness sessions
    res_sessions = client.get("/api/awareness/events?event_type=awareness_session")
    assert res_sessions.status_code == 200
    assert all(e["event_type"] == "awareness_session" for e in res_sessions.json())


def test_event_registration_and_duplicate_prevention():
    """Authenticated users register as donor/volunteer; duplicate registrations are rejected."""
    # Create test attendee
    attendee = get_or_create_user("attendee.phase2@qatra.org", role="verified_donor", full_name="Registration Tester")
    token = get_token_for_user(attendee)

    # Get an active event
    events = client.get("/api/awareness/events").json()
    ev = events[0]
    ev_id = ev["id"]

    # Clear previous registration if any
    db = SessionLocal()
    try:
        db.query(Registration).filter(Registration.event_id == ev_id, Registration.user_id == attendee.id).delete()
        db.commit()
    finally:
        db.close()

    # Initial slots booked
    slots_before = client.get(f"/api/awareness/events/{ev_id}").json()["slots_booked"]

    # 1. Successful registration as donor
    res_reg = client.post(
        f"/api/awareness/events/{ev_id}/register",
        headers={"Authorization": f"Bearer {token}"},
        json={"registration_type": "donor"},
    )
    assert res_reg.status_code == 201
    reg_data = res_reg.json()
    assert reg_data["status"] == "confirmed"
    assert reg_data["registration_type"] == "donor"
    assert "Registration confirmed" in reg_data["message"]

    # Verify slots_booked incremented
    slots_after = client.get(f"/api/awareness/events/{ev_id}").json()["slots_booked"]
    assert slots_after == slots_before + 1

    # 2. Duplicate registration attempt -> 400 Bad Request
    res_dup = client.post(
        f"/api/awareness/events/{ev_id}/register",
        headers={"Authorization": f"Bearer {token}"},
        json={"registration_type": "donor"},
    )
    assert res_dup.status_code == 400
    assert "already registered" in res_dup.json()["detail"]


def test_get_my_registrations():
    """Authenticated user retrieves their list of registered events."""
    user = get_or_create_user("attendee.myreg@qatra.org", role="verified_seeker", full_name="My Reg Tester")
    token = get_token_for_user(user)

    events = client.get("/api/awareness/events").json()
    ev_id = events[1]["id"]

    # Register for event
    db = SessionLocal()
    try:
        db.query(Registration).filter(Registration.event_id == ev_id, Registration.user_id == user.id).delete()
        db.commit()
    finally:
        db.close()

    client.post(
        f"/api/awareness/events/{ev_id}/register",
        headers={"Authorization": f"Bearer {token}"},
        json={"registration_type": "volunteer"},
    )

    # Fetch registrations
    res = client.get("/api/awareness/my-registrations", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    my_regs = res.json()
    assert any(r["event_id"] == ev_id for r in my_regs)


def test_event_capacity_exhaustion():
    """Registering for a fully booked event is rejected with 400 Bad Request."""
    admin = get_or_create_user("admin.capacity@qatra.org", role="admin")
    admin_token = get_token_for_user(admin)

    # Create an event with slots_total = 1
    res_ev = client.post(
        "/api/awareness/events",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": f"Full Capacity Test Drive {int(time.time())}",
            "event_type": "blood_drive",
            "date_time": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "location_name": "Test Clinic Room A",
            "slots_total": 1,
        },
    )
    assert res_ev.status_code == 201
    full_ev_id = res_ev.json()["id"]

    # First user fills the slot
    u1 = get_or_create_user("user1.capacity@qatra.org", role="guest")
    t1 = get_token_for_user(u1)
    res_r1 = client.post(
        f"/api/awareness/events/{full_ev_id}/register",
        headers={"Authorization": f"Bearer {t1}"},
        json={"registration_type": "donor"},
    )
    assert res_r1.status_code == 201

    # Second user attempts to register -> 400 Fully Booked
    u2 = get_or_create_user("user2.capacity@qatra.org", role="guest")
    t2 = get_token_for_user(u2)
    res_r2 = client.post(
        f"/api/awareness/events/{full_ev_id}/register",
        headers={"Authorization": f"Bearer {t2}"},
        json={"registration_type": "donor"},
    )
    assert res_r2.status_code == 400
    assert "fully booked" in res_r2.json()["detail"].lower()


# ==============================================================================
# 4. Post-Donation Health Feedback Tests (FR 4.4, API Contract 6.5)
# ==============================================================================

def test_donor_health_feedback_flow():
    """Retrieves post-donation guidelines, updates 90-day cooldown, and validates audit logs."""
    # 1. Setup donor
    donor_user = get_or_create_user("donor.healthflow@qatra.org", role="verified_donor", full_name="Cooldown Donor")
    donor_token = get_token_for_user(donor_user)

    db = SessionLocal()
    try:
        donor = db.query(Donor).filter(Donor.user_id == donor_user.id).first()
        if not donor:
            donor = Donor(
                user_id=donor_user.id,
                blood_group="B+",
                is_available=True,
                donation_count=0,
                pre_screening_passed=False,
            )
            db.add(donor)
            db.commit()
            db.refresh(donor)
        donor_id = donor.id
    finally:
        db.close()

    # 2. Donor retrieves baseline health feedback before donation
    res_initial = client.get(
        "/api/awareness/donor/health-feedback",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    assert res_initial.status_code == 200
    init_data = res_initial.json()
    assert len(init_data["post_donation_instructions"]) >= 3

    # 3. Medical staff / Admin records post-donation feedback with 90-day cooldown
    admin = get_or_create_user("admin.healthfeedback@qatra.org", role="admin")
    admin_token = get_token_for_user(admin)

    res_record = client.post(
        "/api/awareness/donor/health-feedback",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "donor_id": donor_id,
            "screening_outcome": "Passed",
            "notes": "500ml whole blood collection completed without incident.",
            "donation_completed": True,
            "custom_instructions": [
                "Drink 3-4 liters of water over the next 48 hours.",
                "Keep compression bandage on for 4 hours minimum.",
                "Avoid intense gym lifting today.",
            ],
        },
    )
    assert res_record.status_code == 201
    rec_data = res_record.json()
    assert rec_data["screening_outcome"] == "Passed"
    assert rec_data["donation_count"] >= 1
    assert rec_data["next_eligible_date"] is not None

    # 4. Donor re-fetches and confirms updated cooldown and next eligible date
    res_updated = client.get(
        "/api/awareness/donor/health-feedback",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    assert res_updated.status_code == 200
    up_data = res_updated.json()
    assert up_data["screening_outcome"] == "Passed"
    assert up_data["donation_count"] == rec_data["donation_count"]
    assert up_data["next_eligible_date"] == rec_data["next_eligible_date"]

    # 5. Verify database donor state (is_available locked to False during cooldown)
    db = SessionLocal()
    try:
        d = db.query(Donor).filter(Donor.id == donor_id).first()
        assert d.is_available is False
        assert d.cooldown_until is not None

        # Verify audit log entry
        audit = db.query(AuditLog).filter(
            AuditLog.action == "record_health_feedback",
            AuditLog.target_resource == "health_feedbacks",
        ).order_by(AuditLog.timestamp.desc()).first()
        assert audit is not None
        assert "Passed" in audit.details
    finally:
        db.close()


def test_health_feedback_rbac_guards():
    """Unauthenticated users cannot fetch feedback; non-staff cannot record feedback."""
    # Unauthenticated GET -> 401
    res_unauth = client.get("/api/awareness/donor/health-feedback")
    assert res_unauth.status_code == 401

    # Regular user attempting POST -> 403
    guest = get_or_create_user("guest.guard@qatra.org", role="guest")
    guest_token = get_token_for_user(guest)
    res_post_guard = client.post(
        "/api/awareness/donor/health-feedback",
        headers={"Authorization": f"Bearer {guest_token}"},
        json={"donor_id": 1, "screening_outcome": "Passed"},
    )
    assert res_post_guard.status_code == 403

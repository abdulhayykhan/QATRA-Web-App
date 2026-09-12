"""Phase 2 Integration & Unit Tests for Feature 3: Social & Urgent Request Feed.

Owner: Mahrukh Baig
Covers:
- GET  /api/feed                   (Public feed with multi-parameter filtering & pagination)
- GET  /api/feed/{request_id}      (Single request detail view)
- POST /api/feed/{request_id}/respond (One-tap 'I Can Donate' response, cooldown enforcement, seeker notification)
- GET  /api/feed/{request_id}/share   (Clean WhatsApp forward formatting & direct share URL)
- POST /api/feed/{request_id}/close   (Manual close override with strict ownership RBAC & notifications)
- Auto-close lifecycle engine (FR 3.4) when units_fulfilled >= units_needed
- Notification trigger logic (Sec 5.3, Contract 5.6) for rare vs common blood groups
"""
import time
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.user import User
from app.models.donor import Donor
from app.models.request import Request
from app.models.event import Event
from app.models.notification import Notification
from app.schemas.enums import UserRole, NotificationType
from app.services.feed import (
    check_and_auto_close_request,
    record_donation_fulfillment,
    trigger_feed_blood_alert,
)
from app.services.notifications import dispatch_blood_alert

client = TestClient(app)


# ------------------------------------------------------------------------------
# Fixtures & Test Data Helpers
# ------------------------------------------------------------------------------

def get_test_token_and_user(role: str, cnic_verified: bool = True):
    """Helper to create a test user directly in DB and issue a valid JWT token."""
    db = SessionLocal()
    unique_id = f"feed_test_{int(time.time() * 1000)}_{role}"
    user = User(
        firebase_uid=unique_id,
        email=f"{unique_id}@qatra.test",
        full_name=f"Test {role.title()}",
        role=role,
        is_verified=True,
        cnic_verified=cnic_verified,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "firebase_uid": user.firebase_uid}
    )
    db.close()
    return token, user.id


def create_test_request(
    seeker_id: int,
    blood_group: str = "B+",
    hospital_name: str = "Civil Hospital Karachi",
    hospital_address: str = "Mission Rd, Karachi",
    units_needed: int = 2,
    units_fulfilled: int = 0,
    urgency: str = "within_24_hours",
    status: str = "verified",
) -> int:
    """Helper to insert an active test request."""
    db = SessionLocal()
    req = Request(
        seeker_id=seeker_id,
        patient_name="Test Patient",
        patient_mrn="MRN-TEST-12345",
        hospital_name=hospital_name,
        hospital_address=hospital_address,
        hospital_latitude=24.8569,
        hospital_longitude=67.0112,
        blood_group=blood_group,
        component_type="Whole Blood",
        units_needed=units_needed,
        units_fulfilled=units_fulfilled,
        urgency=urgency,
        status=status,
        search_radius_km=10.0,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    req_id = req.id
    db.close()
    return req_id


# ==============================================================================
# 1. Public Feed Query & Filtering Tests (Contract 5.1 & FR 3.2)
# ==============================================================================

def test_get_feed_public_access_no_auth():
    """Verify GET /api/feed is publicly viewable without authentication."""
    res = client.get("/api/feed")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert "items" in data
    assert isinstance(data["items"], list)


def test_get_feed_filtering_by_blood_group():
    """Verify blood group filter matches only requested blood group."""
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req_id = create_test_request(seeker_id, blood_group="AB-")

    res = client.get("/api/feed?blood_group=AB-")
    assert res.status_code == 200
    data = res.json()
    items = data["items"]
    assert len(items) > 0
    for it in items:
        if it.get("item_type") == "request":
            assert it["blood_group"] == "AB-"


def test_get_feed_filtering_by_urgency():
    """Verify urgency filter returns matching urgency requests."""
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    create_test_request(seeker_id, urgency="within_2_hours")

    res = client.get("/api/feed?urgency=within_2_hours")
    assert res.status_code == 200
    data = res.json()
    for it in data["items"]:
        if it.get("item_type") == "request":
            assert it["urgency"] == "within_2_hours"


def test_get_feed_filtering_by_location():
    """Verify location query performs case-insensitive search across hospital name and address."""
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    create_test_request(seeker_id, hospital_name="Indus Hospital Korangi", hospital_address="Korangi Creek Road")

    res = client.get("/api/feed?location=Korangi")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    found = any("Korangi" in it["hospital_name"] or "Korangi" in str(it.get("hospital_address", "")) for it in data["items"])
    assert found


def test_get_feed_include_drive_events():
    """Verify toggling include_drive_events includes active blood drive events in feed."""
    db = SessionLocal()
    _, org_id = get_test_token_and_user(UserRole.ORGANIZER.value)
    ev = Event(
        organizer_id=org_id,
        title="NED University Annual Drive",
        event_type="blood_drive",
        date_time=datetime.now(timezone.utc) + timedelta(days=3),
        location_name="NED Campus Karachi",
        slots_total=150,
        slots_booked=10,
        is_active=True,
    )
    db.add(ev)
    db.commit()
    ev_id = ev.id
    db.close()

    res = client.get(f"/api/feed?include_drive_events=true&event_id={ev_id}&limit=50")
    assert res.status_code == 200
    data = res.json()
    items = data["items"]
    event_items = [it for it in items if it.get("item_type") == "blood_drive"]
    assert len(event_items) >= 1
    assert any(it["event_id"] == ev_id for it in event_items)



# ==============================================================================
# 2. Single Request Detail View Tests (Contract 5.2)
# ==============================================================================

def test_get_feed_single_request_detail_success():
    """Verify GET /api/feed/{request_id} returns all required card details."""
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req_id = create_test_request(
        seeker_id,
        blood_group="O+",
        hospital_name="Ziauddin Hospital",
        units_needed=3,
        urgency="within_2_hours",
    )

    res = client.get(f"/api/feed/{req_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["request_id"] == req_id
    assert data["patient_name"] == "Test Patient"
    assert data["hospital_name"] == "Ziauddin Hospital"
    assert data["blood_group"] == "O+"
    assert data["units_needed"] == 3
    assert data["urgency"] == "within_2_hours"
    assert data["status"] == "verified"
    assert "hospital_latitude" in data
    assert "hospital_longitude" in data


def test_get_feed_single_request_not_found():
    """Verify 404 returned for nonexistent request ID."""
    res = client.get("/api/feed/99999999")
    assert res.status_code == 404


def test_get_feed_single_request_pending_not_visible():
    """Verify pending_verification requests are not publicly viewable."""
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req_id = create_test_request(seeker_id, status="pending_verification")

    res = client.get(f"/api/feed/{req_id}")
    assert res.status_code == 404


# ==============================================================================
# 3. 'I Can Donate' One-Tap Response Tests (Contract 5.3 & FR 3.3)
# ==============================================================================

def test_feed_respond_unauthenticated_fails():
    """Verify unauthenticated donor response is rejected with 401."""
    res = client.post("/api/feed/1/respond")
    assert res.status_code == 401


def test_feed_respond_seeker_role_forbidden():
    """Verify verified seekers cannot respond as donors (403 Forbidden)."""
    seeker_token, _ = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    headers = {"Authorization": f"Bearer {seeker_token}"}
    res = client.post("/api/feed/1/respond", headers=headers)
    assert res.status_code == 403


def test_feed_respond_verified_donor_success():
    """Verify verified donor successfully responds and seeker receives in-app notification."""
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req_id = create_test_request(seeker_id, status="verified")

    donor_token, donor_id = get_test_token_and_user(UserRole.VERIFIED_DONOR.value)

    # Attach active eligible donor profile
    db = SessionLocal()
    donor = Donor(
        user_id=donor_id,
        blood_group="B+",
        is_available=True,
        pre_screening_passed=True,
    )
    db.add(donor)
    db.commit()
    db.close()

    headers = {"Authorization": f"Bearer {donor_token}"}
    res = client.post(f"/api/feed/{req_id}/respond", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["request_id"] == req_id
    assert data["response_recorded"] is True
    assert "notified" in data["message"]

    # Verify request transitioned to matched
    db = SessionLocal()
    updated_req = db.query(Request).filter(Request.id == req_id).first()
    assert updated_req.status == "matched"

    # Verify seeker received in-app notification
    seeker_notif = (
        db.query(Notification)
        .filter(Notification.user_id == seeker_id, Notification.request_id == req_id)
        .first()
    )
    assert seeker_notif is not None
    assert "Donor Responded" in seeker_notif.title
    db.close()


def test_feed_respond_donor_on_cooldown_rejected():
    """Verify donor currently on 90-day cooldown is blocked from responding."""
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req_id = create_test_request(seeker_id, status="verified")

    donor_token, donor_id = get_test_token_and_user(UserRole.VERIFIED_DONOR.value)

    # Attach donor profile with recent donation (10 days ago -> cooldown active)
    db = SessionLocal()
    donor = Donor(
        user_id=donor_id,
        blood_group="B+",
        is_available=True,
        pre_screening_passed=True,
        last_donation_date=datetime.now(timezone.utc) - timedelta(days=10),
    )
    db.add(donor)
    db.commit()
    db.close()

    headers = {"Authorization": f"Bearer {donor_token}"}
    res = client.post(f"/api/feed/{req_id}/respond", headers=headers)
    assert res.status_code == 400
    assert "cooldown" in res.json()["detail"].lower()


# ==============================================================================
# 4. WhatsApp Share & URL Generation Tests (Contract 5.4 & FR 3.3)
# ==============================================================================

def test_feed_share_endpoint():
    """Verify structured WhatsApp text and share URL generation."""
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req_id = create_test_request(
        seeker_id,
        blood_group="A+",
        hospital_name="JPMC Karachi",
        units_needed=2,
        urgency="within_2_hours",
    )

    res = client.get(f"/api/feed/{req_id}/share")
    assert res.status_code == 200
    data = res.json()
    assert data["request_id"] == req_id
    assert data["share_url"] == f"https://qatra.pk/requests/{req_id}"

    text = data["whatsapp_text"]
    assert "URGENT BLOOD NEEDED" in text
    assert "A+" in text
    assert "JPMC Karachi" in text
    assert "2" in text
    assert "Within 2 Hours" in text
    assert f"https://qatra.pk/requests/{req_id}" in text


# ==============================================================================
# 5. Manual Request Close Override Tests (Contract 5.5 & FR 3.4)
# ==============================================================================

def test_feed_close_owner_seeker_success():
    """Verify the request owner can close an active request with a custom reason."""
    seeker_token, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req_id = create_test_request(seeker_id, status="verified")

    headers = {"Authorization": f"Bearer {seeker_token}"}
    payload = {"reason": "Fulfilled on-site by family donor"}
    res = client.post(f"/api/feed/{req_id}/close", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["request_id"] == req_id
    assert data["status"] == "fulfilled"
    assert "closed" in data["message"].lower()

    # Verify DB status
    db = SessionLocal()
    req = db.query(Request).filter(Request.id == req_id).first()
    assert req.status == "fulfilled"
    assert "Fulfilled on-site" in (req.admin_notes or "")
    db.close()


def test_feed_close_non_owner_seeker_forbidden():
    """Verify non-owner seeker cannot close another user's request (403 Forbidden)."""
    _, owner_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req_id = create_test_request(owner_id, status="verified")

    other_seeker_token, _ = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    headers = {"Authorization": f"Bearer {other_seeker_token}"}
    payload = {"reason": "Attempted close by non-owner"}

    res = client.post(f"/api/feed/{req_id}/close", json=payload, headers=headers)
    assert res.status_code == 403
    assert "only close your own" in res.json()["detail"].lower()


def test_feed_close_admin_override_success():
    """Verify admin can close any request as manual desk override."""
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req_id = create_test_request(seeker_id, status="verified")

    admin_token, _ = get_test_token_and_user(UserRole.ADMIN.value)
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"reason": "Desk admin override: units secured via blood bank"}

    res = client.post(f"/api/feed/{req_id}/close", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "fulfilled"


# ==============================================================================
# 6. Auto-Close Engine & Fulfillment Service Tests (FR 3.4)
# ==============================================================================

def test_auto_close_engine_transitions_status():
    """Verify check_and_auto_close_request transitions request to fulfilled when units met."""
    db = SessionLocal()
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req = Request(
        seeker_id=seeker_id,
        patient_name="Auto Close Patient",
        hospital_name="Civil Hospital",
        hospital_latitude=24.86,
        hospital_longitude=67.01,
        blood_group="B+",
        units_needed=2,
        units_fulfilled=2,
        status="verified",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    closed = check_and_auto_close_request(req, db)
    assert closed is True
    assert req.status == "fulfilled"

    # Verify seeker received fulfillment notification
    notif = (
        db.query(Notification)
        .filter(Notification.user_id == seeker_id, Notification.request_id == req.id)
        .first()
    )
    assert notif is not None
    assert "Fulfilled" in notif.title
    db.close()


def test_record_donation_fulfillment_service():
    """Verify record_donation_fulfillment increments count and auto-closes when full."""
    db = SessionLocal()
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    req = Request(
        seeker_id=seeker_id,
        patient_name="Unit Test Patient",
        hospital_name="JPMC Karachi",
        hospital_latitude=24.86,
        hospital_longitude=67.01,
        blood_group="O+",
        units_needed=2,
        units_fulfilled=0,
        status="verified",
    )
    db.add(req)
    db.commit()
    req_id = req.id

    # Record 1 unit -> not closed yet
    updated1 = record_donation_fulfillment(req_id, units_donated=1, db=db)
    assert updated1.units_fulfilled == 1
    assert updated1.status == "verified"

    # Record 2nd unit -> meets units_needed -> auto-closes to fulfilled
    updated2 = record_donation_fulfillment(req_id, units_donated=1, db=db)
    assert updated2.units_fulfilled == 2
    assert updated2.status == "fulfilled"
    db.close()


# ==============================================================================
# 7. Rare vs Common Blood Group Notification Triggers (Sec 5.3 & Contract 5.6)
# ==============================================================================

@pytest.mark.anyio
async def test_notification_trigger_rare_blood_group():
    """Verify rare blood groups (O-, AB-) trigger high-priority alerts with RARE_BLOOD_ALERT type."""
    db = SessionLocal()
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    _, donor_id = get_test_token_and_user(UserRole.VERIFIED_DONOR.value)

    # Setup available O- donor
    donor = Donor(
        user_id=donor_id,
        blood_group="O-",
        is_available=True,
        pre_screening_passed=True,
    )
    db.add(donor)

    req = Request(
        seeker_id=seeker_id,
        patient_name="Rare Blood Patient",
        hospital_name="JPMC Karachi",
        hospital_latitude=24.86,
        hospital_longitude=67.01,
        blood_group="O-",
        units_needed=1,
        urgency="within_2_hours",
        status="verified",
    )
    db.add(req)
    db.commit()

    dispatch_res = await trigger_feed_blood_alert(req, db)
    assert dispatch_res["is_rare"] is True
    assert dispatch_res["status"] == "dispatched"
    assert dispatch_res["donors_alerted_count"] >= 1

    # Verify high priority rare notification created in DB
    notif = (
        db.query(Notification)
        .filter(
            Notification.user_id == donor_id,
            Notification.request_id == req.id,
        )
        .first()
    )
    assert notif is not None
    assert notif.notification_type == NotificationType.RARE_BLOOD_ALERT.value
    assert "RARE BLOOD ALERT" in notif.title
    db.close()


@pytest.mark.anyio
async def test_notification_trigger_common_blood_group():
    """Verify common blood groups (B+) trigger standard PROXIMITY_ALERT type."""
    db = SessionLocal()
    _, seeker_id = get_test_token_and_user(UserRole.VERIFIED_SEEKER.value)
    _, donor_id = get_test_token_and_user(UserRole.VERIFIED_DONOR.value)

    # Setup available B+ donor near hospital
    donor = Donor(
        user_id=donor_id,
        blood_group="B+",
        latitude=24.8610,
        longitude=67.0120,
        is_available=True,
        pre_screening_passed=True,
    )
    db.add(donor)

    req = Request(
        seeker_id=seeker_id,
        patient_name="Common Blood Patient",
        hospital_name="Civil Hospital Karachi",
        hospital_latitude=24.8569,
        hospital_longitude=67.0112,
        blood_group="B+",
        units_needed=1,
        urgency="within_24_hours",
        status="verified",
    )
    db.add(req)
    db.commit()

    dispatch_res = await trigger_feed_blood_alert(req, db)
    assert dispatch_res["is_rare"] is False
    assert dispatch_res["status"] == "dispatched"

    notif = (
        db.query(Notification)
        .filter(
            Notification.user_id == donor_id,
            Notification.request_id == req.id,
        )
        .first()
    )
    assert notif is not None
    assert notif.notification_type == NotificationType.PROXIMITY_ALERT.value
    db.close()

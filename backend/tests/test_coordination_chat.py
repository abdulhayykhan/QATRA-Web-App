"""
Tests for QATRA In-App Coordination Chat and Calling Permissions.
Verifies:
1. When donor has NOT accepted request: Seeker CANNOT call donor (can_call is False, call_phone_number is None).
2. When donor ACCEPTS dispatch: Seeker receives donor's phone number and can_call is True.
3. Donor view: cannot call seeker (can_call is False, phone scrubbed).
4. Real-time In-App Chat: Starts clean (no mock greetings), supports bidirectional chat exchange.
5. All test fixtures are cleanly purged after test run.
"""
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.donor import Donor
from app.models.request import Request
from app.schemas.enums import UserRole

client = TestClient(app)


def test_seeker_coordination_permissions_and_calling():
    """Verify call is locked before donor acceptance, and unlocked after acceptance."""
    db = SessionLocal()
    created_user_ids = []
    created_req_ids = []

    try:
        # Create Seeker User
        seeker_uid = f"test_seeker_{int(time.time() * 1000)}"
        seeker = User(
            firebase_uid=seeker_uid,
            email=f"{seeker_uid}@example.com",
            full_name="Emergency Recipient",
            phone_number="+923009999999",
            role=UserRole.VERIFIED_SEEKER.value,
            is_verified=True,
        )
        db.add(seeker)

        # Create Donor User
        donor_uid = f"test_donor_{int(time.time() * 1000)}"
        donor_user = User(
            firebase_uid=donor_uid,
            email=f"{donor_uid}@example.com",
            full_name="Tariq Volunteer",
            phone_number="+923001234567",
            role=UserRole.VERIFIED_DONOR.value,
            is_verified=True,
        )
        db.add(donor_user)
        db.commit()
        db.refresh(seeker)
        db.refresh(donor_user)
        created_user_ids.extend([seeker.id, donor_user.id])

        # Create Donor Profile
        donor_profile = Donor(
            user_id=donor_user.id,
            blood_group="B+",
            is_available=True,
            latitude=24.8607,
            longitude=67.0011,
        )
        db.add(donor_profile)

        # Create Blood Request (Initially Unaccepted: status="verified")
        req = Request(
            seeker_id=seeker.id,
            patient_name="Fatima Bibi",
            hospital_name="Civil Hospital Karachi",
            hospital_address="Mission Rd, Karachi",
            hospital_latitude=24.8569,
            hospital_longitude=67.0112,
            blood_group="B+",
            units_needed=1,
            units_fulfilled=0,
            status="verified",
            matched_donor_id=None,
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        created_req_ids.append(req.id)

        # 1. Before Acceptance: Seeker CANNOT call donor
        res_before = client.get(f"/api/coordination/{req.id}?as_role=seeker&donor_id={donor_profile.id}")
        assert res_before.status_code == 200
        data_before = res_before.json()
        assert data_before["viewer_role"] == "seeker"
        assert data_before["can_call"] is False
        assert data_before["call_phone_number"] is None

        # 2. Donor Accepts Request: status="matched", matched_donor_id set
        req.status = "matched"
        req.matched_donor_id = donor_profile.id
        req.units_fulfilled = 1
        db.commit()

        # 3. After Acceptance: Seeker CAN call donor
        res_after = client.get(f"/api/coordination/{req.id}?as_role=seeker")
        assert res_after.status_code == 200
        data_after = res_after.json()
        assert data_after["viewer_role"] == "seeker"
        assert data_after["can_call"] is True
        assert data_after["call_phone_number"] == "+923001234567"
        assert data_after["matched_donor"] is not None
        assert data_after["matched_donor"]["phone_number"] == "+923001234567"

    finally:
        for r_id in created_req_ids:
            db.query(Request).filter(Request.id == r_id).delete()
        for u_id in created_user_ids:
            db.query(Donor).filter(Donor.user_id == u_id).delete()
            db.query(User).filter(User.id == u_id).delete()
        db.commit()
        db.close()


def test_donor_coordination_permissions_and_call_prevention():
    """Verify donor CANNOT call seeker and phone number is scrubbed."""
    db = SessionLocal()
    created_user_ids = []
    created_req_ids = []

    try:
        seeker_uid = f"test_seeker_{int(time.time() * 1000)}"
        seeker = User(
            firebase_uid=seeker_uid,
            email=f"{seeker_uid}@example.com",
            full_name="Emergency Recipient",
            phone_number="+923009999999",
            role=UserRole.VERIFIED_SEEKER.value,
            is_verified=True,
        )
        db.add(seeker)

        donor_uid = f"test_donor_{int(time.time() * 1000)}"
        donor_user = User(
            firebase_uid=donor_uid,
            email=f"{donor_uid}@example.com",
            full_name="Volunteer Donor",
            phone_number="+923001234567",
            role=UserRole.VERIFIED_DONOR.value,
            is_verified=True,
        )
        db.add(donor_user)
        db.commit()
        db.refresh(seeker)
        db.refresh(donor_user)
        created_user_ids.extend([seeker.id, donor_user.id])

        donor_profile = Donor(
            user_id=donor_user.id,
            blood_group="O+",
            is_available=True,
            latitude=24.8607,
            longitude=67.0011,
        )
        db.add(donor_profile)

        req = Request(
            seeker_id=seeker.id,
            patient_name="Patient Ali",
            hospital_name="Civil Hospital Karachi",
            hospital_address="Mission Rd, Karachi",
            hospital_latitude=24.8569,
            hospital_longitude=67.0112,
            blood_group="O+",
            units_needed=1,
            units_fulfilled=1,
            status="matched",
            matched_donor_id=donor_profile.id,
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        created_req_ids.append(req.id)

        response = client.get(f"/api/coordination/{req.id}?as_role=donor")
        assert response.status_code == 200
        data = response.json()

        assert data["viewer_role"] == "donor"
        assert data["can_call"] is False
        assert data["call_phone_number"] is None
        assert "phone_number" not in data["seeker_info"]

    finally:
        for r_id in created_req_ids:
            db.query(Request).filter(Request.id == r_id).delete()
        for u_id in created_user_ids:
            db.query(Donor).filter(Donor.user_id == u_id).delete()
            db.query(User).filter(User.id == u_id).delete()
        db.commit()
        db.close()


def test_bidirectional_in_app_chat_exchange():
    """Verify clean initial chat state and bidirectional message exchange."""
    req_id = 99999

    # 1. Initial messages must be clean (no mock greetings)
    res_initial = client.get(f"/api/coordination/{req_id}/messages")
    assert res_initial.status_code == 200
    initial_msgs = res_initial.json()
    assert len(initial_msgs) == 0

    # 2. Seeker posts a message
    seeker_payload = {
        "text": "Thank you! We are on the 2nd Floor ICU at Civil Hospital.",
        "sender_role": "seeker"
    }
    res_post_seeker = client.post(f"/api/coordination/{req_id}/messages", json=seeker_payload)
    assert res_post_seeker.status_code == 200
    posted_msg = res_post_seeker.json()
    assert posted_msg["sender_role"] == "seeker"
    assert "2nd Floor ICU" in posted_msg["text"]

    # 3. Donor sends an update
    donor_payload = {
        "text": "Understood, parked outside and taking elevator now.",
        "sender_role": "donor"
    }
    res_post_donor = client.post(f"/api/coordination/{req_id}/messages", json=donor_payload)
    assert res_post_donor.status_code == 200
    assert res_post_donor.json()["sender_role"] == "donor"

    # 4. Fetch full history and verify count & ordering
    res_all = client.get(f"/api/coordination/{req_id}/messages")
    assert res_all.status_code == 200
    all_msgs = res_all.json()
    assert len(all_msgs) == 2
    assert all_msgs[0]["sender_role"] == "seeker"
    assert all_msgs[1]["sender_role"] == "donor"
    assert all_msgs[1]["text"] == "Understood, parked outside and taking elevator now."


def test_my_active_request_and_donor_phone_persistence():
    """Verify active request retrieval on re-login and donor phone number persistence."""
    db = SessionLocal()
    created_user_ids = []
    created_req_ids = []

    try:
        # 1. Create Seeker via login
        seeker_token_resp = client.post(
            "/api/auth/firebase-login",
            json={"firebase_id_token": f"seeker_test_{int(time.time() * 1000)}"}
        )
        assert seeker_token_resp.status_code == 200
        seeker_token = seeker_token_resp.json()["access_token"]
        seeker_user_id = seeker_token_resp.json()["user"]["id"]
        created_user_ids.append(seeker_user_id)

        # Before any request, /requests/my-active returns has_active_request = False
        res_empty = client.get(
            "/api/map/requests/my-active",
            headers={"Authorization": f"Bearer {seeker_token}"}
        )
        assert res_empty.status_code == 200
        assert res_empty.json()["has_active_request"] is False

        # 2. Create an Emergency Blood Request for this seeker
        req = Request(
            seeker_id=seeker_user_id,
            patient_name="Alina Bibi",
            hospital_name="Shaukat Omar Memorial (SOM) Fauji Foundation Hospital",
            hospital_address="Shah Faisal Colony, Karachi",
            hospital_latitude=24.8841,
            hospital_longitude=67.1514,
            blood_group="O+",
            units_needed=2,
            units_fulfilled=0,
            urgency="within_2_hours",
            status="verified",
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        created_req_ids.append(req.id)

        # 3. Check /requests/my-active returns active request
        res_active = client.get(
            "/api/map/requests/my-active",
            headers={"Authorization": f"Bearer {seeker_token}"}
        )
        assert res_active.status_code == 200
        active_data = res_active.json()
        assert active_data["has_active_request"] is True
        assert active_data["request_id"] == req.id
        assert active_data["patient_name"] == "Alina Bibi"
        assert active_data["blood_group"] == "O+"

        # 4. Create Donor via login & complete pre-screen with phone number & blood group
        donor_token_resp = client.post(
            "/api/auth/firebase-login",
            json={"firebase_id_token": f"donor_test_{int(time.time() * 1000)}"}
        )
        assert donor_token_resp.status_code == 200
        donor_token = donor_token_resp.json()["access_token"]
        donor_user_id = donor_token_resp.json()["user"]["id"]
        created_user_ids.append(donor_user_id)

        # Submit pre-screen checklist with phone number
        prescreen_res = client.post(
            "/api/auth/donor/pre-screen",
            headers={"Authorization": f"Bearer {donor_token}"},
            json={
                "age": 25,
                "weight_kg": 72.0,
                "hemoglobin_g_dl": 14.5,
                "has_recent_illness": False,
                "has_recent_tattoo_or_surgery": False,
                "phone_number": "03001234567",
                "blood_group": "O+",
                "full_name": "Tariq Volunteer"
            }
        )
        assert prescreen_res.status_code == 200
        assert prescreen_res.json()["pre_screening_passed"] is True

        # Verify donor user in DB has phone number and blood group
        updated_donor_user = db.query(User).filter(User.id == donor_user_id).first()
        assert updated_donor_user.phone_number == "03001234567"
        assert updated_donor_user.full_name == "Tariq Volunteer"
        donor_rec = db.query(Donor).filter(Donor.user_id == donor_user_id).first()
        assert donor_rec.blood_group == "O+"

        # Elevate to verified_donor and re-issue token
        updated_donor_user.cnic_verified = True
        updated_donor_user.role = UserRole.VERIFIED_DONOR.value
        db.commit()

        donor_token_resp2 = client.post(
            "/api/auth/firebase-login",
            json={"firebase_id_token": f"donor_test_{donor_user_id}"}
        )
        donor_token = donor_token_resp2.json()["access_token"]

        # 5. Donor accepts proximity alert
        accept_res = client.post(
            f"/api/map/requests/{req.id}/accept",
            headers={"Authorization": f"Bearer {donor_token}"}
        )
        assert accept_res.status_code == 200

        # 6. Seeker views coordination session and receives donor's phone number
        coord_res = client.get(
            f"/api/coordination/{req.id}",
            headers={"Authorization": f"Bearer {seeker_token}"}
        )
        assert coord_res.status_code == 200
        coord_data = coord_res.json()
        assert coord_data["can_call"] is True
        assert coord_data["call_phone_number"] == "03001234567"
        assert coord_data["viewer_role"] == "seeker"

    finally:
        for r_id in created_req_ids:
            db.query(Request).filter(Request.id == r_id).delete()
        for u_id in created_user_ids:
            db.query(Donor).filter(Donor.user_id == u_id).delete()
            db.query(User).filter(User.id == u_id).delete()
        db.commit()
        db.close()

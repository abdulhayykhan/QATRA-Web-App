"""
Tests for QATRA In-App Coordination Chat and Unidirectional Seeker Calling.
Verifies:
1. Seeker receives donor's phone number and can_call is True.
2. Donor cannot call seeker (can_call is False, phone numbers scrubbed).
3. Bidirectional In-App Chat: Seeker and donor can exchange instant messages.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_seeker_coordination_permissions_and_calling():
    """Verify seeker receives donor phone number for direct calling."""
    response = client.get("/api/coordination/99?as_role=seeker")
    assert response.status_code == 200
    data = response.json()

    assert data["viewer_role"] == "seeker"
    assert data["can_call"] is True
    assert data["call_phone_number"] is not None
    assert "+92" in data["call_phone_number"]
    assert data["matched_donor"] is not None
    assert data["matched_donor"]["phone_number"] is not None


def test_donor_coordination_permissions_and_call_prevention():
    """Verify donor CANNOT call seeker and phone number is scrubbed."""
    response = client.get("/api/coordination/99?as_role=donor")
    assert response.status_code == 200
    data = response.json()

    assert data["viewer_role"] == "donor"
    assert data["can_call"] is False
    assert data["call_phone_number"] is None
    # Donor must not receive seeker's phone number
    assert "phone_number" not in data["seeker_info"]


def test_bidirectional_in_app_chat_exchange():
    """Verify donor and seeker can exchange chat messages."""
    req_id = 101

    # 1. Check initial message list (seeds greeting)
    res_initial = client.get(f"/api/coordination/{req_id}/messages")
    assert res_initial.status_code == 200
    initial_msgs = res_initial.json()
    assert len(initial_msgs) >= 1
    assert initial_msgs[0]["sender_role"] == "donor"

    # 2. Seeker posts a reply
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

    # 4. Fetch full history and verify ordering
    res_all = client.get(f"/api/coordination/{req_id}/messages")
    assert res_all.status_code == 200
    all_msgs = res_all.json()
    assert len(all_msgs) >= 3
    assert all_msgs[-1]["text"] == "Understood, parked outside and taking elevator now."

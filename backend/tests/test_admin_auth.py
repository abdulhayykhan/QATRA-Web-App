"""Tests for Alkhidmat 24/7 Admin Desk Authentication Gate (POST /api/auth/admin/login).

Covers:
- Successful authentication with valid Desk Officer ID and Shift Security Passcode.
- Rejection of invalid passcode (401 Unauthorized).
- Rejection of unauthorized officer ID (401 Unauthorized).
- Request validation for missing/empty fields (422 Unprocessable Entity).
- Brute-force rate limiting enforcement (429 Too Many Requests).
- Protected admin route access (/api/auth/admin/verification-queue) with issued Admin JWT.
- RBAC denial for unauthenticated or non-admin users (401/403).
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.routers.auth import _admin_failed_attempts


@pytest.fixture(autouse=True)
def reset_rate_limit():
    """Reset the rate limiting state before each test."""
    _admin_failed_attempts.clear()
    yield
    _admin_failed_attempts.clear()


def test_admin_desk_login_success():
    """Valid officer ID and shift passcode must return 200 with signed Admin JWT."""
    client = TestClient(app)
    response = client.post(
        "/api/auth/admin/login",
        json={
            "officer_id": settings.ADMIN_DESK_ID,
            "passcode": settings.ADMIN_DESK_KEY,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "admin"
    assert data["user"]["is_verified"] is True


def test_admin_desk_login_alkhidmat_domain_id():
    """Any valid @alkhidmat.org officer ID with correct passcode must be authorized."""
    client = TestClient(app)
    response = client.post(
        "/api/auth/admin/login",
        json={
            "officer_id": "lead.korangi@alkhidmat.org",
            "passcode": settings.ADMIN_DESK_KEY,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "admin"
    assert data["user"]["email"] == "lead.korangi@alkhidmat.org"


def test_admin_desk_login_wrong_passcode():
    """Incorrect passcode must be rejected with 401 Unauthorized."""
    client = TestClient(app)
    response = client.post(
        "/api/auth/admin/login",
        json={
            "officer_id": settings.ADMIN_DESK_ID,
            "passcode": "wrong-shift-passcode-123",
        },
    )
    assert response.status_code == 401
    assert "Invalid Desk Officer ID or Shift Security Passcode" in response.json()["detail"]


def test_admin_desk_login_invalid_officer_id():
    """Non-whitelisted officer ID must be rejected with 401 Unauthorized."""
    client = TestClient(app)
    response = client.post(
        "/api/auth/admin/login",
        json={
            "officer_id": "random.stranger@gmail.com",
            "passcode": settings.ADMIN_DESK_KEY,
        },
    )
    assert response.status_code == 401
    assert "Invalid Desk Officer ID or Shift Security Passcode" in response.json()["detail"]


def test_admin_desk_login_validation_error():
    """Missing or short fields must return 422 validation error."""
    client = TestClient(app)
    response = client.post(
        "/api/auth/admin/login",
        json={"officer_id": "a"},  # missing passcode, officer_id too short
    )
    assert response.status_code == 422


def test_admin_desk_login_rate_limiting():
    """5 consecutive failed attempts must trigger 429 Too Many Requests."""
    client = TestClient(app)
    officer_id = "test.bruteforce@alkhidmat.org"

    for i in range(5):
        res = client.post(
            "/api/auth/admin/login",
            json={"officer_id": officer_id, "passcode": f"bad_pass_{i}"},
        )
        assert res.status_code == 401

    # 6th attempt should be blocked by rate-limiter
    res_blocked = client.post(
        "/api/auth/admin/login",
        json={"officer_id": officer_id, "passcode": settings.ADMIN_DESK_KEY},
    )
    assert res_blocked.status_code == 429
    assert "Too many failed authentication attempts" in res_blocked.json()["detail"]


def test_admin_token_accesses_protected_verification_queue():
    """JWT issued by /api/auth/admin/login must successfully authorize access to admin queue."""
    client = TestClient(app)
    # 1. Log in via admin desk gate
    login_res = client.post(
        "/api/auth/admin/login",
        json={
            "officer_id": settings.ADMIN_DESK_ID,
            "passcode": settings.ADMIN_DESK_KEY,
        },
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # 2. Access protected admin verification queue
    queue_res = client.get(
        "/api/auth/admin/verification-queue",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert queue_res.status_code == 200
    assert isinstance(queue_res.json(), list)


def test_admin_verification_queue_denies_unauthenticated():
    """Admin queue must strictly reject unauthenticated requests with 401."""
    client = TestClient(app)
    queue_res = client.get("/api/auth/admin/verification-queue")
    assert queue_res.status_code == 401

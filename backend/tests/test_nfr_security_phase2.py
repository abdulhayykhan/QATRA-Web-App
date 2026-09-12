"""Phase 2 Comprehensive Test Suite for Non-Functional Requirements & Security.

Owner: Nimra Iftikhar (PRD Section 7)
Covers:
1. NFR 2.6: Rate limiting engine, sliding-window throttling, 429 response, Retry-After header.
2. NFR 2.1 & 2.2: AES-256-GCM vault field encryption, decryption, tampering rejection, and data isolation.
3. NFR 2.5: Audit logging trail, compliance persistence, and admin audit log retrieval API.
4. NFR 2.3: Contact privacy, phone number masking (+92-300-***-1234), and CNIC masking.
5. NFR 2.4: System-wide Role-Based Access Control (RBAC) enforcement across all modules.
6. NFR 1.2, 1.3, 1.4: In-memory performance caching, feed cache invalidation, and health resilience fallback diagnostics.
"""
import time
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.rate_limit import limiter
from app.core.database import SessionLocal
from app.core.security import encrypt_field, decrypt_field, create_access_token
from app.services.audit import log_audit_event, query_audit_logs
from app.services.privacy import (
    mask_phone_number,
    mask_cnic_number,
    is_aes256_encrypted,
    sanitize_public_payload,
)
from app.services.cache import cache, set_cached_feed, get_cached_feed, invalidate_feed_cache
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.enums import UserRole

client = TestClient(app)


# ==============================================================================
# Helper Fixtures & Tokens
# ==============================================================================

def get_test_token(role: str, user_id: int = 9999) -> str:
    """Generate authenticated session JWT for specific role."""
    return create_access_token({
        "sub": str(user_id),
        "email": f"test_{role}_{user_id}@qatra.pk",
        "role": role,
    })


# ==============================================================================
# 1. Rate Limiting Tests (NFR 2.6)
# ==============================================================================

def test_rate_limiter_allows_under_limit_and_blocks_excess():
    """Verify rate limiter permits requests within quota and enforces 429 once exceeded."""
    limiter.clear()
    limiter.enabled = True

    # Temporarily set tight rule for testing
    original_rules = limiter.rules
    limiter.rules = [("/api/auth/firebase-login", 3, 60)]

    try:
        # First 3 requests should pass through rate limiter
        for _ in range(3):
            res = client.post("/api/auth/firebase-login", json={"firebase_id_token": "dummy_token"})
            assert res.status_code != 429

        # 4th request must be rejected with HTTP 429 Too Many Requests
        res_blocked = client.post("/api/auth/firebase-login", json={"firebase_id_token": "dummy_token"})
        assert res_blocked.status_code == 429
        assert "Retry-After" in res_blocked.headers
        data = res_blocked.json()
        assert "Rate limit exceeded" in data["detail"]
        assert data["retry_after"] > 0
    finally:
        limiter.rules = original_rules
        limiter.clear()


def test_rate_limiter_exempt_paths():
    """Verify health check and root endpoints are exempt from rate limiting."""
    limiter.clear()
    original_rules = limiter.rules
    limiter.rules = [("/api/", 2, 60)]

    try:
        # Health check must never return 429 even under repeated calls
        for _ in range(10):
            res = client.get("/api/health")
            assert res.status_code == 200
    finally:
        limiter.rules = original_rules
        limiter.clear()


def test_rate_limiter_bypass_header():
    """Verify test bypass header allows requests through when specified."""
    limiter.clear()
    original_rules = limiter.rules
    limiter.rules = [("/api/auth/firebase-login", 1, 60)]

    try:
        # First request consumes quota
        client.post("/api/auth/firebase-login", json={"firebase_id_token": "token1"})

        # Subsequent request with bypass header must not get 429
        res_bypass = client.post(
            "/api/auth/firebase-login",
            headers={"X-Bypass-Rate-Limit": "true"},
            json={"firebase_id_token": "token2"},
        )
        assert res_bypass.status_code != 429
    finally:
        limiter.rules = original_rules
        limiter.clear()


# ==============================================================================
# 2. AES-256 Vault Encryption & Data Isolation Tests (NFR 2.1 & 2.2)
# ==============================================================================

def test_aes256_encryption_and_decryption_integrity():
    """Verify AES-256-GCM encrypts sensitive fields with distinct nonces and decrypts reliably."""
    sensitive_cnic = "4210112345671"
    cipher1 = encrypt_field(sensitive_cnic)
    cipher2 = encrypt_field(sensitive_cnic)

    # Distinct nonces produce distinct ciphertexts for identical plaintext
    assert cipher1 != cipher2
    assert cipher1 != sensitive_cnic

    # Decryption recovers exact plaintext
    assert decrypt_field(cipher1) == sensitive_cnic
    assert decrypt_field(cipher2) == sensitive_cnic


def test_aes256_tampered_ciphertext_rejection():
    """Verify corrupted ciphertext gracefully returns None without crashing."""
    corrupted = "corrupted_base64_ciphertext_that_is_not_valid_gcm"
    decrypted = decrypt_field(corrupted)
    assert decrypted is None


def test_is_aes256_encrypted_helper():
    """Verify detection of properly encrypted vault strings."""
    encrypted = encrypt_field("sensitive_health_data_answer")
    assert is_aes256_encrypted(encrypted) is True
    assert is_aes256_encrypted("plain_text_not_encrypted") is False
    assert is_aes256_encrypted(None) is False


# ==============================================================================
# 3. Contact Privacy & Phone Number Masking Tests (NFR 2.3)
# ==============================================================================

def test_phone_number_masking_formats():
    """Verify Pakistani phone formats are masked to hide middle digits."""
    assert mask_phone_number("+923001234567") == "+92-300-***-4567"
    assert mask_phone_number("03001234567") == "0300-***-4567"
    assert mask_phone_number("03219876543") == "0321-***-6543"
    assert mask_phone_number(None) is None


def test_cnic_masking():
    """Verify 13-digit Pakistani CNIC numbers are masked for public/masked view."""
    assert mask_cnic_number("4210112345671") == "42101-*******-1"
    assert mask_cnic_number("3520198765432") == "35201-*******-2"
    assert mask_cnic_number(None) is None


def test_sanitize_public_payload_strips_sensitive_data():
    """Verify recursive payload sanitizer cleans sensitive contact and vault data."""
    raw_payload = {
        "donor_name": "Hamza Tariq",
        "phone_number": "+923001234567",
        "cnic_number": "4210112345671",
        "cnic_encrypted": "encrypted_blob",
        "secret_key": "some_secret",
        "nested": {
            "contact": "03001234567",
        },
    }
    sanitized = sanitize_public_payload(raw_payload)

    assert sanitized["donor_name"] == "Hamza Tariq"
    assert sanitized["phone_number"] == "+92-300-***-4567"
    assert sanitized["cnic_number"] == "42101-*******-1"
    assert "cnic_encrypted" not in sanitized
    assert "secret_key" not in sanitized
    assert sanitized["nested"]["contact"] == "0300-***-4567"


# ==============================================================================
# 4. Audit Logging & Compliance Tests (NFR 2.5)
# ==============================================================================

def test_audit_logging_persistence_and_query():
    """Verify audit events are written to the database and queryable with filters."""
    db = SessionLocal()
    try:
        action_name = f"TEST_AUDIT_{int(time.time())}"
        log_entry = log_audit_event(
            db=db,
            action=action_name,
            target_resource="users",
            target_id="101",
            user_id=1,
            details="Test audit event for compliance verification",
            ip_address="127.0.0.1",
        )
        assert log_entry.id is not None

        total, logs = query_audit_logs(db, action=action_name)
        assert total >= 1
        assert logs[0].action == action_name
        assert logs[0].target_resource == "users"
        assert logs[0].details == "Test audit event for compliance verification"
    finally:
        db.close()


def test_admin_audit_logs_endpoint_rbac():
    """Verify GET /api/auth/admin/audit-logs is strictly restricted to admins."""
    # 1. Unauthenticated -> 401
    res_unauth = client.get("/api/auth/admin/audit-logs", headers={"X-Bypass-Rate-Limit": "true"})
    assert res_unauth.status_code == 401

    # 2. Non-admin guest / verified user -> 403 Forbidden
    uid_non_admin = f"test_non_admin_audit_{int(time.time())}"
    res_login = client.post(
        "/api/auth/firebase-login",
        json={"firebase_id_token": uid_non_admin},
        headers={"X-Bypass-Rate-Limit": "true"},
    )
    assert res_login.status_code == 200
    non_admin_token = res_login.json()["access_token"]
    user_id = res_login.json()["user"]["id"]

    res_forbidden = client.get(
        "/api/auth/admin/audit-logs",
        headers={"Authorization": f"Bearer {non_admin_token}", "X-Bypass-Rate-Limit": "true"},
    )
    assert res_forbidden.status_code == 403

    # 3. Promote user to Admin -> 200 OK
    db = SessionLocal()
    user_in_db = db.query(User).filter(User.id == user_id).first()
    user_in_db.role = "admin"
    db.commit()
    db.close()

    # Re-login to get updated JWT
    res_admin = client.post(
        "/api/auth/firebase-login",
        json={"firebase_id_token": uid_non_admin},
        headers={"X-Bypass-Rate-Limit": "true"},
    )
    admin_token = res_admin.json()["access_token"]

    res_ok = client.get(
        "/api/auth/admin/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}", "X-Bypass-Rate-Limit": "true"},
    )
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)


# ==============================================================================
# 5. Role-Based Access Control (RBAC) System-Wide Tests (NFR 2.4)
# ==============================================================================

def test_rbac_boundary_enforcement():
    """Verify unauthorized roles cannot execute restricted operations across modules."""
    uid_guest = f"test_guest_rbac_{int(time.time())}"
    res_login = client.post(
        "/api/auth/firebase-login",
        json={"firebase_id_token": uid_guest},
        headers={"X-Bypass-Rate-Limit": "true"},
    )
    assert res_login.status_code == 200
    guest_token = res_login.json()["access_token"]

    # Guest trying to access admin verification queue -> 403
    res_admin_queue = client.get(
        "/api/auth/admin/verification-queue",
        headers={"Authorization": f"Bearer {guest_token}", "X-Bypass-Rate-Limit": "true"},
    )
    assert res_admin_queue.status_code == 403



# ==============================================================================
# 6. Performance Caching & Health Fallback Resilience Tests (NFR 1.2, 1.3, 1.4)
# ==============================================================================

def test_cache_ttl_and_invalidation():
    """Verify in-memory cache sets, retrieves, and clears keys properly."""
    cache.clear()

    # Set and retrieve
    set_cached_feed("test_query", {"results": [1, 2, 3]}, ttl=10)
    cached = get_cached_feed("test_query")
    assert cached == {"results": [1, 2, 3]}

    # Invalidate feed cache
    deleted_count = invalidate_feed_cache()
    assert deleted_count >= 1
    assert get_cached_feed("test_query") is None


def test_health_check_deep_diagnostics_and_fallback_mode():
    """Verify GET /api/health returns operational status and fallback flags."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] in ["healthy", "degraded"]
    assert "dependencies" in data
    assert "database" in data["dependencies"]
    assert "cache" in data["dependencies"]
    assert "storage" in data["dependencies"]
    assert "fallback_mode" in data
    assert "feed_only_mode" in data
    assert isinstance(data["fallback_mode"], bool)

"""Security, encryption, JWT session management, and RBAC authorization helpers."""
import os
import base64
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List, Union

import jwt
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.services.firebase_auth import verify_firebase_token


# ==============================================================================
# 1. AES-256 Field Encryption / Decryption Helper (NFR 2.1)
# ==============================================================================

def get_aes_key() -> bytes:
    """Derive 32-byte (256-bit) encryption key from configuration."""
    raw_key = getattr(settings, "ENCRYPTION_KEY_AES256", None) or settings.SECRET_KEY
    if not raw_key:
        raw_key = "qatra-emergency-blood-default-aes256-key-32b"

    if isinstance(raw_key, str):
        try:
            key_bytes = bytes.fromhex(raw_key)
            if len(key_bytes) >= 32:
                return key_bytes[:32]
        except ValueError:
            pass
        return hashlib.sha256(raw_key.encode("utf-8")).digest()
    return hashlib.sha256(str(raw_key).encode("utf-8")).digest()


def encrypt_field(plain_text: Optional[str]) -> Optional[str]:
    """
    Encrypt sensitive string (e.g. CNIC number, private health answers) using AES-256-GCM.
    Returns URL-safe base64 string combining nonce and ciphertext.
    """
    if not plain_text:
        return plain_text
    key = get_aes_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # Standard 96-bit nonce for GCM
    ciphertext = aesgcm.encrypt(nonce, plain_text.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_field(cipher_text: Optional[str]) -> Optional[str]:
    """
    Decrypt AES-256-GCM encrypted string back to plaintext.
    """
    if not cipher_text:
        return cipher_text
    try:
        key = get_aes_key()
        aesgcm = AESGCM(key)
        raw_data = base64.b64decode(cipher_text.encode("utf-8"))
        if len(raw_data) < 12:
            return None
        nonce = raw_data[:12]
        ciphertext = raw_data[12:]
        decrypted = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted.decode("utf-8")
    except Exception:
        return None


# ==============================================================================
# 2. Application-Level Session JWT Handling
# ==============================================================================

ALGORITHM = "HS256"
DEFAULT_EXPIRE_SECONDS = 86400  # 24 hours


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed JWT token containing subject user ID and claims."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(seconds=DEFAULT_EXPIRE_SECONDS)

    to_encode.update({
        "iat": now,
        "exp": expire,
        "iss": "qatra-api",
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate application JWT token.
    Raises HTTPException(401) on invalid or expired token.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM], issuer="qatra-api")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid session token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ==============================================================================
# 3. Authentication & RBAC FastAPI Dependencies
# ==============================================================================

async def get_current_user(
    authorization: Optional[str] = Header(None, description="Bearer <app_jwt_or_firebase_id_token>"),
    db: Session = Depends(get_db),
) -> User:
    """
    Unified authentication dependency.
    Extracts Bearer token and resolves user:
    1. First tries internal application JWT.
    2. Fallback to Firebase ID Token (for direct client calls).
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    user: Optional[User] = None

    # Step 1: Try decoding as application JWT
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is not None:
            user = db.query(User).filter(User.id == int(user_id)).first()
    except HTTPException:
        # Step 2: Fallback to verifying as Firebase ID token
        try:
            fb_payload = verify_firebase_token(token)
            firebase_uid = fb_payload.get("uid")
            if firebase_uid:
                user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user


def require_role(allowed_roles: Union[List[str], str]):
    """
    Role-Based Access Control (RBAC) dependency factory.
    Enforces role authorization from:
    - 'guest'
    - 'verified_seeker'
    - 'verified_donor'
    - 'organizer'
    - 'admin'
    Note: 'admin' role automatically possesses superuser privileges across protected routes.
    """
    if isinstance(allowed_roles, str):
        roles = [allowed_roles]
    else:
        roles = list(allowed_roles)

    # Allow admins everywhere except if explicitly restricted
    if "admin" not in roles:
        roles.append("admin")

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of {roles}, but your role is '{current_user.role}'.",
            )
        return current_user

    return role_checker

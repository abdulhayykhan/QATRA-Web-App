"""Authentication, Verification, and RBAC router (Feature 2 - Saghir Ahmed)."""
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    require_role,
    encrypt_field,
    decrypt_field,
)
from app.models.user import User
from app.models.donor import Donor
from app.models.request import Request
from app.schemas.enums import UserRole
from app.schemas.user import UserResponse, CNICSubmission
from app.services.firebase_auth import verify_firebase_token
from app.services.audit import log_audit_event


router = APIRouter(tags=["Auth & Verification"])


# ------------------------------------------------------------------------------
# Request & Response Schemas for Auth Module
# ------------------------------------------------------------------------------

class FirebaseLoginRequest(BaseModel):
    firebase_id_token: str = Field(..., description="Firebase Google Sign-In ID Token")


class UserLoginData(BaseModel):
    id: int
    firebase_uid: str
    email: str
    full_name: str
    role: str
    is_verified: bool
    cnic_verified: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400
    user: UserLoginData


# ==============================================================================
# 3.1 POST /api/auth/firebase-login
# ==============================================================================

@router.post(
    "/firebase-login",
    response_model=TokenResponse,
    summary="Firebase Google Sign-In Identity Synchronization",
    description="Verifies Firebase ID token from Google Sign-In, syncs/creates user in Supabase, and returns an application JWT session.",
)
async def firebase_login(
    payload: FirebaseLoginRequest,
    db: Session = Depends(get_db),
):
    """
    1. Verify Firebase ID token.
    2. Sync user profile in PostgreSQL database.
    3. Issue application-level session JWT.
    """
    id_token = payload.firebase_id_token

    # Allow mock/test tokens in non-production for testing reliability
    if (settings.DEBUG or settings.ENVIRONMENT == "development" or settings.ENVIRONMENT == "test") and (
        id_token.startswith("mock_token_") or id_token.startswith("test_token_")
    ):
        fb_user = {
            "uid": id_token,
            "email": f"{id_token.replace(':', '_')}@example.com",
            "name": "Test User",
        }
    else:
        fb_user = verify_firebase_token(id_token)

    firebase_uid = fb_user.get("uid")
    email = fb_user.get("email")
    full_name = fb_user.get("name") or (email.split("@")[0] if email else "QATRA User")

    if not firebase_uid or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase token missing required user identity fields (uid, email)",
        )

    # Sync user with database
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        # Check if email is already taken by another account
        existing_email_user = db.query(User).filter(User.email == email).first()
        if existing_email_user:
            # Bind firebase_uid if signing in with same verified email
            existing_email_user.firebase_uid = firebase_uid
            user = existing_email_user
        else:
            user = User(
                firebase_uid=firebase_uid,
                email=email,
                full_name=full_name,
                role=UserRole.GUEST.value,
                is_active=True,
                is_verified=False,
                cnic_verified=False,
            )
            db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update details if changed
        updated = False
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            updated = True
        if email and user.email != email:
            user.email = email
            updated = True
        if updated:
            db.commit()
            db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact support.",
        )

    # Generate internal application session JWT (24h validity)
    access_token = create_access_token({
        "sub": str(user.id),
        "firebase_uid": user.firebase_uid,
        "email": user.email,
        "role": user.role,
    })

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=86400,
        user=UserLoginData(
            id=user.id,
            firebase_uid=user.firebase_uid,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_verified=user.is_verified,
            cnic_verified=user.cnic_verified,
        ),
    )


# ==============================================================================
# 3.2 GET /api/auth/me
# ==============================================================================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Authenticated User Profile",
    description="Fetches authenticated user profile, roles, and verification status.",
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Returns the current authenticated user's profile and roles."""
    return current_user

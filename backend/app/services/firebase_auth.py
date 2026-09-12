"""Firebase Authentication Service using Firebase Admin SDK."""
import os
from pathlib import Path
from typing import Dict, Any, Optional

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import Header, HTTPException, status

from app.core.config import settings

_firebase_app: Optional[firebase_admin.App] = None


def get_firebase_app() -> firebase_admin.App:
    """Initialize and retrieve singleton Firebase Admin App instance."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    # Check if already initialized by default
    if firebase_admin._apps:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app

    cred = None

    # Priority 1: Service account JSON file path
    service_account_paths = [
        settings.FIREBASE_CREDENTIALS_PATH,
        "backend/firebase-service-account.json",
        "firebase-service-account.json",
        str(Path(__file__).resolve().parent.parent.parent / "firebase-service-account.json"),
    ]

    for p in service_account_paths:
        if p and os.path.exists(p):
            cred = credentials.Certificate(p)
            break

    # Priority 2: In-memory credentials from environment variables
    if cred is None and settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL:
        cert_dict = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID or "qatra-web-app",
            "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        cred = credentials.Certificate(cert_dict)

    if cred is not None:
        _firebase_app = firebase_admin.initialize_app(cred)
    else:
        # Fallback to default application credentials if available
        try:
            _firebase_app = firebase_admin.initialize_app()
        except Exception as e:
            # Allow startup in development even if credentials aren't set yet
            print(f"Warning: Firebase Admin initialization deferred: {e}")
            return None

    return _firebase_app


def verify_firebase_token(id_token: str) -> Dict[str, Any]:
    """
    Verify Google Sign-In Firebase ID token.
    Returns decoded token dictionary containing 'uid', 'email', 'name', etc.
    Raises HTTPException(401) on invalid/expired tokens.
    """
    app = get_firebase_app()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firebase Admin is not configured on the server",
        )

    try:
        decoded_token = firebase_auth.verify_id_token(id_token, app=app)
        return decoded_token
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase ID token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except firebase_auth.InvalidIdTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase ID token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_firebase_user(
    authorization: Optional[str] = Header(None, description="Bearer <Firebase ID Token>"),
) -> Dict[str, Any]:
    """FastAPI dependency to extract and verify Firebase user from Authorization header."""
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
    return verify_firebase_token(token)

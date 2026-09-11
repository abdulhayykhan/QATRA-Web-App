"""Storage service for hospital admission slips and verification documents (FR 2.2).

Supports persistent cloud object storage via Supabase Storage ('admission-slips' bucket)
with local cache fallback, ensuring reliability on serverless environments like Vercel.
"""
import os
import re
import uuid
import mimetypes
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger("qatra.storage")

SUPABASE_BUCKET_NAME = "admission-slips"

# Local media storage directory for caching/offline development
BASE_DIR = Path(__file__).resolve().parent.parent.parent
SLIPS_DIR = BASE_DIR / "media" / "slips"
try:
    SLIPS_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    # On serverless read-only filesystems, fallback to /tmp
    SLIPS_DIR = Path("/tmp/qatra_slips")
    try:
        SLIPS_DIR.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename to prevent path traversal and unsafe characters."""
    clean = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", clean)
    return clean or "admission_slip.jpg"


def get_mime_type(filename: str) -> str:
    """Detect mime type from filename or default to binary stream."""
    mime, _ = mimetypes.guess_type(filename)
    if not mime:
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".pdf":
            return "application/pdf"
        elif ext in [".jpg", ".jpeg"]:
            return "image/jpeg"
        elif ext == ".png":
            return "image/png"
        return "application/octet-stream"
    return mime


async def upload_to_supabase_storage_async(file_bytes: bytes, saved_filename: str, content_type: str) -> bool:
    """Upload document to Supabase Storage bucket asynchronously."""
    supabase_url = settings.SUPABASE_URL
    api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    if not supabase_url or not api_key:
        logger.warning("Supabase storage credentials not configured. Skipping remote object upload.")
        return False

    upload_url = f"{supabase_url}/storage/v1/object/{SUPABASE_BUCKET_NAME}/{saved_filename}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "apikey": api_key,
        "Content-Type": content_type,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(upload_url, content=file_bytes, headers=headers)
            if res.status_code in [200, 201]:
                logger.info(f"Successfully uploaded {saved_filename} to Supabase Storage.")
                return True
            else:
                logger.warning(f"Supabase storage upload returned status {res.status_code}: {res.text}")
                return False
    except Exception as exc:
        logger.error(f"Error uploading to Supabase storage: {exc}")
        return False


def upload_to_supabase_storage_sync(file_bytes: bytes, saved_filename: str, content_type: str) -> bool:
    """Upload document to Supabase Storage bucket synchronously."""
    supabase_url = settings.SUPABASE_URL
    api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    if not supabase_url or not api_key:
        return False

    upload_url = f"{supabase_url}/storage/v1/object/{SUPABASE_BUCKET_NAME}/{saved_filename}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "apikey": api_key,
        "Content-Type": content_type,
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            res = client.post(upload_url, content=file_bytes, headers=headers)
            return res.status_code in [200, 201]
    except Exception as exc:
        logger.error(f"Error uploading to Supabase storage: {exc}")
        return False


async def save_slip_file_async(file_bytes: bytes, original_filename: str, user_id: int) -> Tuple[str, str, str]:
    """
    Save uploaded hospital slip bytes to Supabase Storage and cache to disk.
    Returns:
        (saved_filename: str, file_url: str, storage_ref: str)
    """
    clean_name = sanitize_filename(original_filename)
    timestamp = int(datetime.now(timezone.utc).timestamp())
    random_suffix = uuid.uuid4().hex[:8]
    ext = os.path.splitext(clean_name)[1].lower() or ".jpg"
    
    saved_filename = f"slip_{user_id}_{timestamp}_{random_suffix}{ext}"
    content_type = get_mime_type(saved_filename)

    # 1. Primary cloud object store: Supabase Storage
    await upload_to_supabase_storage_async(file_bytes, saved_filename, content_type)

    # 2. Local disk cache (best effort; gracefully ignores read-only environments)
    try:
        full_path = SLIPS_DIR / saved_filename
        with open(full_path, "wb") as f:
            f.write(file_bytes)
    except OSError:
        pass

    file_url = f"/api/auth/slips/{saved_filename}"
    return saved_filename, file_url, saved_filename


def save_slip_file(file_bytes: bytes, original_filename: str, user_id: int) -> Tuple[str, str, str]:
    """Synchronous version of save_slip_file."""
    clean_name = sanitize_filename(original_filename)
    timestamp = int(datetime.now(timezone.utc).timestamp())
    random_suffix = uuid.uuid4().hex[:8]
    ext = os.path.splitext(clean_name)[1].lower() or ".jpg"
    
    saved_filename = f"slip_{user_id}_{timestamp}_{random_suffix}{ext}"
    content_type = get_mime_type(saved_filename)

    # 1. Upload to Supabase Storage
    upload_to_supabase_storage_sync(file_bytes, saved_filename, content_type)

    # 2. Local disk cache
    try:
        full_path = SLIPS_DIR / saved_filename
        with open(full_path, "wb") as f:
            f.write(file_bytes)
    except OSError:
        pass

    file_url = f"/api/auth/slips/{saved_filename}"
    return saved_filename, file_url, saved_filename


async def get_slip_file_data_async(saved_filename: str) -> Optional[Tuple[bytes, str]]:
    """
    Retrieve hospital slip document bytes and MIME type.
    1. Checks local filesystem cache.
    2. Fetches from Supabase Storage if not cached locally (e.g. on serverless Vercel instances).
    """
    clean_name = sanitize_filename(saved_filename)
    content_type = get_mime_type(clean_name)

    # 1. Check local cache
    try:
        local_path = SLIPS_DIR / clean_name
        if local_path.exists() and local_path.is_file():
            with open(local_path, "rb") as f:
                data = f.read()
            if data:
                return data, content_type
    except OSError:
        pass

    # 2. Fetch from Supabase Storage
    supabase_url = settings.SUPABASE_URL
    api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    if supabase_url and api_key:
        download_url = f"{supabase_url}/storage/v1/object/{SUPABASE_BUCKET_NAME}/{clean_name}"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "apikey": api_key,
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(download_url, headers=headers)
                if res.status_code == 200:
                    retrieved_type = res.headers.get("content-type", content_type)
                    # Cache locally if possible
                    try:
                        with open(SLIPS_DIR / clean_name, "wb") as f:
                            f.write(res.content)
                    except OSError:
                        pass
                    return res.content, retrieved_type
        except Exception as exc:
            logger.error(f"Failed to retrieve file from Supabase Storage: {exc}")

    return None


def get_slip_file_path(saved_filename: str) -> Optional[Path]:
    """Retrieve absolute path for a saved slip file if present on local disk."""
    clean_name = sanitize_filename(saved_filename)
    target_path = SLIPS_DIR / clean_name
    if target_path.exists() and target_path.is_file():
        return target_path
    return None

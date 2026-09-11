"""Storage service for hospital admission slips and verification documents (FR 2.2)."""
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple, Optional


# Media storage root (shared media directory)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
SLIPS_DIR = BASE_DIR / "media" / "slips"
if not SLIPS_DIR.exists():
    # Also check repo root media folder
    REPO_ROOT_SLIPS = BASE_DIR.parent / "media" / "slips"
    SLIPS_DIR = REPO_ROOT_SLIPS

SLIPS_DIR.mkdir(parents=True, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename to prevent path traversal and unsafe characters."""
    clean = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", clean)
    return clean or "admission_slip.jpg"


def save_slip_file(file_bytes: bytes, original_filename: str, user_id: int) -> Tuple[str, str, str]:
    """
    Save uploaded hospital slip bytes to disk securely.
    Returns:
        (saved_filename: str, file_url: str, full_file_path: str)
    """
    clean_name = sanitize_filename(original_filename)
    timestamp = int(datetime.now(timezone.utc).timestamp())
    random_suffix = uuid.uuid4().hex[:8]
    ext = os.path.splitext(clean_name)[1].lower() or ".jpg"
    
    saved_filename = f"slip_{user_id}_{timestamp}_{random_suffix}{ext}"
    full_path = SLIPS_DIR / saved_filename

    with open(full_path, "wb") as f:
        f.write(file_bytes)

    file_url = f"/api/auth/slips/{saved_filename}"
    return saved_filename, file_url, str(full_path)


def get_slip_file_path(saved_filename: str) -> Optional[Path]:
    """Retrieve absolute path for a saved slip file, ensuring safe containment."""
    clean_name = os.path.basename(saved_filename)
    target_path = SLIPS_DIR / clean_name
    if target_path.exists() and target_path.is_file():
        return target_path
    return None

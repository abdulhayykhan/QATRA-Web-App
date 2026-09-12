"""Contact privacy, phone masking, and sensitive data vault helpers (NFR 2.1 - 2.4).

Owner: Nimra Iftikhar
Ensures compliance with:
- NFR 2.1: AES-256 vault encryption verification for sensitive data at rest.
- NFR 2.2: Isolation of sensitive fields from public-facing payloads.
- NFR 2.3: Contact Privacy & phone number masking across API responses.
- NFR 2.4: Role-Based Access Control validation.
"""
import re
from typing import Optional, Dict, Any

from app.core.security import decrypt_field, get_aes_key


def mask_phone_number(phone: Optional[str]) -> Optional[str]:
    """
    Mask phone numbers per NFR 2.3 so raw numbers are never exposed outside masked proxy chat.
    Examples:
    - '+923001234567' -> '+92-300-***-4567'
    - '03001234567'   -> '0300-***-4567'
    - '1234567890'    -> '1234***7890'
    """
    if not phone:
        return phone

    clean_phone = re.sub(r"[^\d+]", "", phone)
    if clean_phone.startswith("+92") and len(clean_phone) >= 12:
        prefix = clean_phone[:6]  # +92300
        suffix = clean_phone[-4:]  # 4567
        return f"{prefix[:3]}-{prefix[3:]}-***-{suffix}"
    elif clean_phone.startswith("03") and len(clean_phone) >= 11:
        prefix = clean_phone[:4]  # 0300
        suffix = clean_phone[-4:]  # 4567
        return f"{prefix}-***-{suffix}"
    elif len(clean_phone) >= 10:
        prefix = clean_phone[:4]
        suffix = clean_phone[-4:]
        return f"{prefix}***{suffix}"

    return "***-***-****"


def mask_cnic_number(cnic: Optional[str]) -> Optional[str]:
    """
    Mask 13-digit Pakistani CNIC number (e.g. 42101-*******-1 or 42101*******1)
    to protect citizen identity during display.
    """
    if not cnic:
        return cnic

    clean_cnic = re.sub(r"\D", "", cnic)
    if len(clean_cnic) == 13:
        # Province/Division: first 5 digits, Gender/Check: last 1 digit
        return f"{clean_cnic[:5]}-*******-{clean_cnic[-1]}"
    return "************"


def is_aes256_encrypted(cipher_text: Optional[str]) -> bool:
    """
    Verifies that a stored string is an authentic AES-256-GCM encrypted ciphertext
    that can be successfully decrypted with the configured key.
    """
    if not cipher_text:
        return False
    try:
        decrypted = decrypt_field(cipher_text)
        return decrypted is not None
    except Exception:
        return False


def sanitize_public_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Scans and sanitizes response dictionaries before sending to public clients:
    - Masks any phone number fields
    - Masks any CNIC fields
    - Removes raw encrypted columns if present
    """
    sanitized = {}
    for k, v in payload.items():
        if k in ("phone", "phone_number", "contact", "contact_number"):
            sanitized[k] = mask_phone_number(str(v)) if v else None
        elif k in ("cnic", "cnic_number", "national_id"):
            sanitized[k] = mask_cnic_number(str(v)) if v else None
        elif k in ("cnic_encrypted", "secret_key", "internal_notes"):
            continue
        elif isinstance(v, dict):
            sanitized[k] = sanitize_public_payload(v)
        elif isinstance(v, list) and v and isinstance(v[0], dict):
            sanitized[k] = [sanitize_public_payload(item) for item in v]
        else:
            sanitized[k] = v
    return sanitized

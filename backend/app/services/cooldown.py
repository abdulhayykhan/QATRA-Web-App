"""Automated 90-day cooldown engine and pre-screening checklist scoring (FR 2.4, FR 2.5).

Provides reusable services for donor readiness that can be queried by Map, Feed, and Auth modules.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

from app.models.donor import Donor


COOLDOWN_DAYS = 90


def calculate_donor_cooldown(donor: Optional[Donor]) -> Dict[str, Any]:
    """
    Computes real-time 90-day cooldown status for a donor profile (FR 2.4).
    Returns cooldown window, remaining days, and status string.
    """
    if not donor or not donor.last_donation_date:
        return {
            "is_on_cooldown": False,
            "last_donation_date": None,
            "cooldown_until": None,
            "days_remaining": 0,
            "status": "Eligible & Active",
        }

    last_date = donor.last_donation_date
    if last_date.tzinfo is None:
        last_date = last_date.replace(tzinfo=timezone.utc)

    cooldown_target = last_date + timedelta(days=COOLDOWN_DAYS)
    now = datetime.now(timezone.utc)

    if now < cooldown_target:
        delta = cooldown_target - now
        days_remaining = max(1, delta.days + (1 if delta.seconds > 0 else 0))
        return {
            "is_on_cooldown": True,
            "last_donation_date": last_date.isoformat(),
            "cooldown_until": cooldown_target.isoformat(),
            "days_remaining": days_remaining,
            "status": f"In Cooldown ({days_remaining} days remaining)",
        }

    return {
        "is_on_cooldown": False,
        "last_donation_date": last_date.isoformat(),
        "cooldown_until": cooldown_target.isoformat(),
        "days_remaining": 0,
        "status": "Eligible & Active",
    }


def is_donor_eligible_for_dispatch(donor: Optional[Donor]) -> bool:
    """
    Reusable check queried by Map & Feed dispatch engines (FR 1.3.2):
    - Donor availability must be ON
    - Pre-screening must be PASSED
    - Must NOT be in 90-day cooldown
    """
    if not donor or not donor.is_available or not donor.pre_screening_passed:
        return False

    cooldown_info = calculate_donor_cooldown(donor)
    return not cooldown_info["is_on_cooldown"]


def evaluate_donor_prescreen(
    age: int,
    weight_kg: float,
    hemoglobin_g_dl: Optional[float] = None,
    has_recent_illness: bool = False,
    has_recent_tattoo_or_surgery: bool = False,
) -> Dict[str, Any]:
    """
    Interactive pre-screening scoring engine (FR 2.5).
    Standard Thresholds:
    - Age: 18 - 65 years
    - Weight: >= 50 kg
    - Hemoglobin: >= 12.5 g/dL
    - Recent illness / antibiotics (last 14 days): 14-day hold
    - Surgery / tattoo (last 6 months): 6-month hold
    """
    reasons = []

    # 1. Age check
    if age < 18:
        reasons.append("Donor must be at least 18 years old.")
    elif age > 65:
        reasons.append("Donor must be 65 years old or younger.")

    # 2. Weight check
    if weight_kg < 50.0:
        reasons.append("Minimum weight requirement is 50.0 kg.")

    # 3. Recent illness check
    if has_recent_illness:
        reasons.append("Recent illness or antibiotic use reported. Temporary 14-day hold applied.")

    # 4. Tattoo or surgery check
    if has_recent_tattoo_or_surgery:
        reasons.append("Tattoo or surgical procedure in last 6 months. 6-month deferral applies.")

    # 5. Hemoglobin check (soft flag / field test advisory)
    hb_warning = False
    if hemoglobin_g_dl is not None and hemoglobin_g_dl < 12.5:
        hb_warning = True
        reasons.append("Hemoglobin is below 12.5 g/dL. Requires on-site clinical confirmation.")

    if len(reasons) > 0 and not (len(reasons) == 1 and hb_warning):
        return {
            "passed": False,
            "eligibility": "not_eligible",
            "message": "Pre-screening not passed: " + "; ".join(reasons),
            "reasons": reasons,
        }
    elif hb_warning:
        return {
            "passed": True,
            "eligibility": "may_need_confirmation",
            "message": "Preliminary pass. On-site hemoglobin confirmation required.",
            "reasons": reasons,
        }
    else:
        return {
            "passed": True,
            "eligibility": "eligible",
            "message": "Pre-screening passed. You are active in the donor matching pool.",
            "reasons": [],
        }

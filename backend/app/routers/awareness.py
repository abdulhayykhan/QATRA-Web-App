"""Awareness Sessions & Eligibility Module Router (Feature 4).

Owner: Yumna Abbasi
Reference:
- PRD Section 6 (Awareness Sessions & Eligibility Module)
- API Contract Section 6
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.schemas.awareness import (
    EligibilityCheckRequest,
    EligibilityCheckResponse,
)

router = APIRouter(tags=["Awareness & Eligibility"])


# ==============================================================================
# 6.1 POST /api/awareness/eligibility-check (FR 4.1)
# ==============================================================================

@router.post(
    "/eligibility-check",
    response_model=EligibilityCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Interactive 4-Step Donor Eligibility Checker",
    description="Stateless screening quiz evaluating age, weight, recent illness, and 90-day cooldown status with statutory medical disclaimer.",
)
async def evaluate_eligibility(payload: EligibilityCheckRequest) -> EligibilityCheckResponse:
    """
    Stateless 4-step eligibility evaluation (FR 4.1):
    - Step 1: Core criteria (Age: 18-65, Weight >= 50kg)
    - Step 2: Recent health conditions (Recent illness, fever, or antibiotic usage in past 14 days)
    - Step 3: Recovery & cooldown status (Donation within past 90 days)
    - Step 4: Final structured result and statutory medical disclaimer
    """
    disclaimer = (
        "This quiz is for preliminary screening only. Final eligibility is determined on-site by qualified medical staff."
    )

    age = payload.step1_age
    weight = payload.step1_weight_kg
    has_recent_illness = payload.step2_has_recent_illness
    donated_within_90_days = payload.step3_donated_within_90_days

    # Detailed step tracking for frontend stepper indicators
    step_details: Dict[str, Any] = {
        "step1_core_criteria": {
            "passed": (18 <= age <= 65) and (weight >= 50.0),
            "age": age,
            "weight_kg": weight,
        },
        "step2_health_condition": {
            "passed": not has_recent_illness,
            "has_recent_illness": has_recent_illness,
        },
        "step3_cooldown": {
            "passed": not donated_within_90_days,
            "donated_within_90_days": donated_within_90_days,
        },
    }

    # Step 1 Check: Age under 18
    if age < 18:
        return EligibilityCheckResponse(
            result="not_eligible",
            summary="Age Criteria Not Met",
            message="Donors must be at least 18 years of age to donate blood in accordance with national health guidelines.",
            disclaimer=disclaimer,
            details=step_details,
        )

    # Step 1 Check: Age over 65
    if age > 65:
        return EligibilityCheckResponse(
            result="not_eligible",
            summary="Age Upper Limit Exceeded",
            message="Standard donor age limit is 65 years. Please consult medical staff on-site for special assessment.",
            disclaimer=disclaimer,
            details=step_details,
        )

    # Step 1 Check: Weight under 50 kg
    if weight < 50.0:
        return EligibilityCheckResponse(
            result="not_eligible",
            summary="Weight Below Minimum Threshold",
            message="Minimum body weight for blood donation is 50 kg (110 lbs) to ensure donor safety and volume tolerance.",
            disclaimer=disclaimer,
            details=step_details,
        )

    # Step 3 Check: Cooldown period (90 days)
    if donated_within_90_days:
        return EligibilityCheckResponse(
            result="not_eligible",
            summary="Active Cooldown Window",
            message="A mandatory 90-day recovery interval is required between donations to allow full red blood cell and iron replenishment.",
            disclaimer=disclaimer,
            details=step_details,
        )

    # Step 2 Check: Recent illness / infection
    if has_recent_illness:
        return EligibilityCheckResponse(
            result="may_need_confirmation",
            summary="Medical Confirmation Required",
            message="Recent illness, fever, or antibiotic treatment may require a temporary deferral. On-site medical staff will perform a physical screening and vitals check to confirm your eligibility.",
            disclaimer=disclaimer,
            details=step_details,
        )

    # All criteria satisfied
    return EligibilityCheckResponse(
        result="eligible",
        summary="Eligible to Proceed",
        message="Based on your preliminary answers, you meet initial donor criteria.",
        disclaimer=disclaimer,
        details=step_details,
    )

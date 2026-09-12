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

from app.core.database import get_db, engine
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.awareness import AwarenessContent
from app.services.audit import log_audit_event
from app.schemas.awareness import (
    EligibilityCheckRequest,
    EligibilityCheckResponse,
    AwarenessContentCreate,
    AwarenessContentUpdate,
    AwarenessContentResponse,
)

# Ensure database table exists in Supabase PostgreSQL
AwarenessContent.__table__.create(bind=engine, checkfirst=True)

router = APIRouter(tags=["Awareness & Eligibility"])


# ==============================================================================
# Seed Data for Educational Content Library (PRD Section 6.2)
# ==============================================================================

SEED_AWARENESS_CONTENT = [
    {
        "title": "Does donating blood cause permanent weakness?",
        "category": "myths_facts",
        "content_type": "myth_vs_fact",
        "content_url": "https://www.youtube.com/watch?v=example",
        "myth": "Donating blood permanently decreases stamina and weakens immunity.",
        "fact": "The body replenishes fluid volume in 24-48 hours and red cells within weeks. Regular donation is healthy for adults.",
        "summary": "Evidence-based debunking of common weakness myths.",
        "body_text": "A standard blood donation of 450-500ml represents less than 10% of total adult blood volume. The circulatory system rapidly restores plasma fluid levels within hours when well hydrated, and bone marrow accelerates erythrocyte production to return hemoglobin to baseline within 3 to 4 weeks.",
        "read_time_minutes": 2,
    },
    {
        "title": "Can you contract infectious diseases by donating blood?",
        "category": "myths_facts",
        "content_type": "myth_vs_fact",
        "content_url": None,
        "myth": "Donating blood puts you at risk of contracting HIV or Hepatitis.",
        "fact": "Every single needle, sterile tube, and collection kit is 100% brand new, factory sealed, single-use, and incinerated immediately after collection. Donors cannot contract infections during donation.",
        "summary": "Clinical sterilization protocols and certified donor safety standards.",
        "body_text": "Certified blood banks operate under strict WHO biosafety standards. Sterile venipuncture equipment touches only the individual donor once before safe biohazard disposal. It is impossible to contract bloodborne pathogens from donation equipment.",
        "read_time_minutes": 2,
    },
    {
        "title": "Universal Donors & The Golden Hour: Why O-Negative Matters",
        "category": "basics",
        "content_type": "article",
        "content_url": None,
        "myth": None,
        "fact": "O-negative red blood cells lack A, B, and Rh surface antigens, making them safely transfusable to any patient in trauma resuscitations before cross-matching.",
        "summary": "Comprehensive guide to blood group compatibility and emergency transfusions.",
        "body_text": "In critical trauma situations where a patient is hemorrhaging and blood-typing would delay life-saving intervention, emergency physicians reach for O-negative whole blood or PRBCs. Donors with O-negative blood represent less than 5% of Pakistan's population, making proactive registry membership critical.",
        "read_time_minutes": 3,
    },
    {
        "title": "Pre-Donation Checklist: How to Prepare Your Body",
        "category": "health_prep",
        "content_type": "faq",
        "content_url": None,
        "myth": None,
        "fact": "Proper hydration and a light carbohydrate-rich meal within 2-3 hours of donating drastically reduces lightheadedness and vasovagal reactions.",
        "summary": "Essential hydration, sleep, and dietary guidelines before attending a drive.",
        "body_text": "1. Drink 500ml of water 30 minutes before donating.\n2. Avoid fatty or oily foods within 4 hours, as fat can cloud plasma testing.\n3. Get at least 6-8 hours of restful sleep the night before.\n4. Avoid smoking or heavy physical exercise for 2 hours beforehand.",
        "read_time_minutes": 2,
    },
    {
        "title": "Breaking Cultural & Gender Barriers in Voluntary Blood Donation",
        "category": "cultural",
        "content_type": "article",
        "content_url": None,
        "myth": "Women and young adults should not donate blood due to physiological vulnerability.",
        "fact": "Healthy women with hemoglobin >= 12.0 g/dL and weight >= 50 kg can safely donate every 3-4 months without any hormonal or physical adverse impact.",
        "summary": "Encouraging widespread community and campus female participation across Pakistan.",
        "body_text": "Volunteerism in Pakistan is deeply rooted in our community values. Modern blood collection uses sterile calibrated systems that protect the donor's physiological well-being. Normalizing voluntary donations in colleges and universities creates self-sufficient community blood safety nets.",
        "read_time_minutes": 4,
    },
    {
        "title": "The Journey of a Donated Blood Bag: From Vein to Life Saved",
        "category": "basics",
        "content_type": "video",
        "content_url": "https://www.youtube.com/watch?v=qatra-journey",
        "myth": None,
        "fact": "A single pint of whole blood can be centrifuged into packed red cells, platelets, and fresh frozen plasma, saving up to three distinct patients.",
        "summary": "Video walkthrough of lab screening, component separation, and cold-chain hospital dispatch.",
        "body_text": "Follow the journey of a unit of donated blood: from automated sterile phlebotomy, barcode tracking, NAT viral nucleic testing, refrigerated centrifugation, to emergency bed dispatch.",
        "read_time_minutes": 5,
    },
]


def ensure_seed_content(db: Session) -> None:
    """Initialize default awareness content library if empty."""
    try:
        count = db.query(AwarenessContent).count()
        if count == 0:
            for item_data in SEED_AWARENESS_CONTENT:
                item = AwarenessContent(**item_data, is_published=True)
                db.add(item)
            db.commit()
    except Exception:
        db.rollback()


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


# ==============================================================================
# 6.2 Educational Content Library CRUD (FR 4.2)
# ==============================================================================

@router.get(
    "/content",
    response_model=List[AwarenessContentResponse],
    status_code=status.HTTP_200_OK,
    summary="Browse Educational Awareness Library",
    description="Browse educational library including articles, videos, FAQs, and myths vs facts with category and type filtering.",
)
async def list_awareness_content(
    category: Optional[str] = Query(
        None,
        description="Filter by category: basics, myths_facts, health_prep, cultural",
    ),
    content_type: Optional[str] = Query(
        None,
        description="Filter by type: article, video, faq, myth_vs_fact",
    ),
    db: Session = Depends(get_db),
) -> List[AwarenessContentResponse]:
    """Retrieve published educational library items with optional categorization filters."""
    ensure_seed_content(db)

    query = db.query(AwarenessContent).filter(AwarenessContent.is_published == True)

    if category:
        query = query.filter(AwarenessContent.category == category.lower().strip())
    if content_type:
        query = query.filter(AwarenessContent.content_type == content_type.lower().strip())

    items = query.order_by(AwarenessContent.id.asc()).all()
    return items


@router.get(
    "/content/{content_id}",
    response_model=AwarenessContentResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve Single Awareness Content Item",
    description="Returns detailed educational content by unique ID.",
)
async def get_awareness_content(
    content_id: int,
    db: Session = Depends(get_db),
) -> AwarenessContentResponse:
    """Fetch single educational item by ID."""
    ensure_seed_content(db)

    item = db.query(AwarenessContent).filter(AwarenessContent.id == content_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Awareness content item #{content_id} not found.",
        )
    return item


@router.post(
    "/content",
    response_model=AwarenessContentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Educational Awareness Content Item",
    description="Creates a new article, video, FAQ, or myth-vs-fact in the awareness library. Restricted to admin and organizer roles.",
)
async def create_awareness_content(
    payload: AwarenessContentCreate,
    current_user: User = Depends(require_role(["admin", "organizer"])),
    db: Session = Depends(get_db),
) -> AwarenessContentResponse:
    """Create new awareness resource."""
    new_item = AwarenessContent(
        title=payload.title,
        category=payload.category.lower().strip(),
        content_type=payload.content_type.lower().strip(),
        content_url=payload.content_url,
        myth=payload.myth,
        fact=payload.fact,
        summary=payload.summary,
        body_text=payload.body_text,
        read_time_minutes=payload.read_time_minutes,
        is_published=payload.is_published,
        author_id=current_user.id,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="create_awareness_content",
        target_resource="awareness_contents",
        target_id=str(new_item.id),
        details=f"Created awareness content '{new_item.title}' in category '{new_item.category}'",
    )

    return new_item


@router.put(
    "/content/{content_id}",
    response_model=AwarenessContentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Awareness Content Item",
    description="Updates existing educational resource. Restricted to admin and organizer roles.",
)
async def update_awareness_content(
    content_id: int,
    payload: AwarenessContentUpdate,
    current_user: User = Depends(require_role(["admin", "organizer"])),
    db: Session = Depends(get_db),
) -> AwarenessContentResponse:
    """Update existing awareness resource."""
    item = db.query(AwarenessContent).filter(AwarenessContent.id == content_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Awareness content item #{content_id} not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field in ("category", "content_type") and isinstance(val, str):
            setattr(item, field, val.lower().strip())
        else:
            setattr(item, field, val)

    db.commit()
    db.refresh(item)

    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="update_awareness_content",
        target_resource="awareness_contents",
        target_id=str(item.id),
        details=f"Updated awareness content #{item.id} ('{item.title}')",
    )

    return item


@router.delete(
    "/content/{content_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Awareness Content Item",
    description="Permanently removes an educational content item. Restricted to admin and organizer roles.",
)
async def delete_awareness_content(
    content_id: int,
    current_user: User = Depends(require_role(["admin", "organizer"])),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Delete educational resource."""
    item = db.query(AwarenessContent).filter(AwarenessContent.id == content_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Awareness content item #{content_id} not found.",
        )

    title = item.title
    db.delete(item)
    db.commit()

    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="delete_awareness_content",
        target_resource="awareness_contents",
        target_id=str(content_id),
        details=f"Deleted awareness content #{content_id} ('{title}')",
    )

    return {"message": "Content item deleted successfully", "id": content_id}

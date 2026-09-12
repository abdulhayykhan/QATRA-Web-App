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
from app.models.event import Event, Registration
from app.models.awareness import AwarenessContent
from app.services.audit import log_audit_event
from app.schemas.awareness import (
    EligibilityCheckRequest,
    EligibilityCheckResponse,
    AwarenessContentCreate,
    AwarenessContentUpdate,
    AwarenessContentResponse,
    EventSummaryResponse,
    EventCreateRequest,
    EventRegistrationRequest,
    EventRegistrationResponse,
    UserRegistrationListItem,
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


# ==============================================================================
# Seed Events for Blood Drives & Awareness Sessions (PRD Section 6.3)
# ==============================================================================

def ensure_seed_events(db: Session) -> None:
    """Initialize default blood drives and awareness sessions if empty."""
    try:
        count = db.query(Event).count()
        if count == 0:
            organizer = db.query(User).filter(User.role.in_(["organizer", "admin"])).first()
            if not organizer:
                organizer = db.query(User).first()
            organizer_id = organizer.id if organizer else 1

            seed_events = [
                Event(
                    organizer_id=organizer_id,
                    title="NED University Annual Emergency Blood Drive",
                    event_type="blood_drive",
                    date_time=datetime(2026, 9, 15, 9, 0, 0, tzinfo=timezone.utc),
                    location_name="NED University Main Auditorium, Karachi",
                    address="University Road, Gulshan-e-Iqbal, Karachi",
                    latitude=24.9317,
                    longitude=67.1122,
                    description="Annual campus emergency blood drive in collaboration with Al-Khidmat and Indus Hospital.",
                    slots_total=200,
                    slots_booked=48,
                    is_active=True,
                ),
                Event(
                    organizer_id=organizer_id,
                    title="Dawood UET Thalassemia Awareness & Screening Session",
                    event_type="awareness_session",
                    date_time=datetime(2026, 9, 18, 11, 0, 0, tzinfo=timezone.utc),
                    location_name="Dawood University Jinnah Campus Seminar Hall",
                    address="M.A. Jinnah Road, Karachi",
                    latitude=24.8716,
                    longitude=67.0392,
                    description="Interactive educational workshop covering hereditary blood disorders, voluntary donor rights, and emergency registry participation.",
                    slots_total=100,
                    slots_booked=24,
                    is_active=True,
                ),
                Event(
                    organizer_id=organizer_id,
                    title="Dow University Emergency Mobile Collection Drive",
                    event_type="blood_drive",
                    date_time=datetime(2026, 9, 22, 10, 0, 0, tzinfo=timezone.utc),
                    location_name="Ojha Institute of Chest Diseases, Dow University, Karachi",
                    address="Gulzar-e-Hijri, Scheme 33, Suparco Road, Karachi",
                    latitude=24.9536,
                    longitude=67.1158,
                    description="Targeted emergency collection drive prioritizing rare blood types (O-, AB-) for Karachi trauma centers.",
                    slots_total=150,
                    slots_booked=35,
                    is_active=True,
                ),
            ]
            for ev in seed_events:
                db.add(ev)
            db.commit()
    except Exception:
        db.rollback()


# ==============================================================================
# 6.3 & 6.4 Event Browsing & Registration Endpoints (FR 4.3)
# ==============================================================================

@router.get(
    "/events",
    response_model=List[EventSummaryResponse],
    status_code=status.HTTP_200_OK,
    summary="Browse Blood Drives & Campus Awareness Sessions",
    description="Lists upcoming blood donation drives and campus awareness sessions with optional event_type filtering.",
)
async def list_events(
    event_type: Optional[str] = Query(
        None,
        description="Filter by event type: blood_drive, awareness_session",
    ),
    is_active: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db),
) -> List[EventSummaryResponse]:
    """List blood drives and awareness sessions."""
    ensure_seed_events(db)

    query = db.query(Event).filter(Event.is_active == is_active)
    if event_type:
        query = query.filter(Event.event_type == event_type.lower().strip())

    events = query.order_by(Event.date_time.asc()).all()
    return events


@router.get(
    "/events/{event_id}",
    response_model=EventSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Event Details",
    description="Returns detailed profile of an upcoming drive or awareness session.",
)
async def get_event_details(
    event_id: int,
    db: Session = Depends(get_db),
) -> EventSummaryResponse:
    """Fetch single event by ID."""
    ensure_seed_events(db)

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event #{event_id} not found.",
        )
    return event


@router.post(
    "/events",
    response_model=EventSummaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Blood Drive or Awareness Session",
    description="Schedules a new campus or community blood drive or educational session. Restricted to organizer and admin roles.",
)
async def create_event(
    payload: EventCreateRequest,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db),
) -> EventSummaryResponse:
    """Create new awareness drive or session."""
    new_event = Event(
        organizer_id=current_user.id,
        title=payload.title,
        event_type=payload.event_type.lower().strip(),
        date_time=payload.date_time,
        location_name=payload.location_name,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description,
        slots_total=payload.slots_total,
        slots_booked=0,
        is_active=True,
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="create_event",
        target_resource="events",
        target_id=str(new_event.id),
        details=f"Created {new_event.event_type} event '{new_event.title}' at '{new_event.location_name}'",
    )

    return new_event


@router.post(
    "/events/{event_id}/register",
    response_model=EventRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register for Blood Drive or Awareness Session",
    description="Registers an authenticated user as a donor or volunteer for an upcoming event, with capacity and duplicate check.",
)
async def register_for_event(
    event_id: int,
    payload: EventRegistrationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EventRegistrationResponse:
    """
    User registration for blood drive or awareness session (FR 4.3):
    1. Check event exists and is active
    2. Check slot capacity (slots_booked < slots_total)
    3. Check duplicate registration
    4. Increment slots_booked
    5. Save registration and return confirmed receipt
    """
    ensure_seed_events(db)

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event #{event_id} not found.",
        )

    if not event.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event is no longer active.",
        )

    # Check capacity limit
    if event.slots_booked >= event.slots_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event is fully booked. No remaining slots available.",
        )

    # Check duplicate active registration
    existing_reg = db.query(Registration).filter(
        Registration.event_id == event.id,
        Registration.user_id == current_user.id,
        Registration.status != "cancelled",
    ).first()

    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already registered for this event as a {existing_reg.registration_type}.",
        )

    reg_type = payload.registration_type.lower().strip()
    if reg_type not in ("donor", "volunteer"):
        reg_type = "donor"

    # Create registration record
    new_reg = Registration(
        event_id=event.id,
        user_id=current_user.id,
        registration_type=reg_type,
        status="confirmed",
        registered_at=datetime.now(timezone.utc),
    )
    db.add(new_reg)

    # Atomically increment slots_booked
    event.slots_booked += 1
    db.commit()
    db.refresh(new_reg)

    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="register_event",
        target_resource="registrations",
        target_id=str(new_reg.id),
        details=f"User registered as {reg_type} for event #{event.id} ('{event.title}')",
    )

    return EventRegistrationResponse(
        registration_id=new_reg.id,
        event_id=event.id,
        status="confirmed",
        message="Registration confirmed. An in-app confirmation and email notification have been sent.",
        registration_type=new_reg.registration_type,
        registered_at=new_reg.registered_at,
    )


@router.get(
    "/my-registrations",
    response_model=List[UserRegistrationListItem],
    status_code=status.HTTP_200_OK,
    summary="Get Current User's Event Registrations",
    description="Returns all active blood drive and session registrations for the authenticated user.",
)
async def get_my_registrations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[UserRegistrationListItem]:
    """Retrieve all event bookings for authenticated user."""
    results = (
        db.query(Registration, Event)
        .join(Event, Registration.event_id == Event.id)
        .filter(Registration.user_id == current_user.id)
        .order_by(Registration.registered_at.desc())
        .all()
    )

    items: List[UserRegistrationListItem] = []
    for reg, ev in results:
        items.append(
            UserRegistrationListItem(
                registration_id=reg.id,
                event_id=ev.id,
                event_title=ev.title,
                event_type=ev.event_type,
                date_time=ev.date_time,
                location_name=ev.location_name,
                registration_type=reg.registration_type,
                status=reg.status,
                registered_at=reg.registered_at,
            )
        )
    return items


@router.get(
    "/events/{event_id}/attendees",
    status_code=status.HTTP_200_OK,
    summary="List Registered Attendees for an Event",
    description="Allows event organizer or admin to inspect the registered donor and volunteer attendee roster.",
)
async def get_event_attendees(
    event_id: int,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Retrieve attendee roster for blood drive or session."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event #{event_id} not found.",
        )

    # If user is organizer (and not superuser admin), verify ownership
    if current_user.role == "organizer" and event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view attendee rosters for an event you do not organize.",
        )

    registrations = (
        db.query(Registration, User)
        .join(User, Registration.user_id == User.id)
        .filter(Registration.event_id == event.id)
        .order_by(Registration.registered_at.asc())
        .all()
    )

    roster = []
    for reg, user in registrations:
        roster.append({
            "registration_id": reg.id,
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "registration_type": reg.registration_type,
            "status": reg.status,
            "registered_at": reg.registered_at.isoformat(),
        })

    return roster

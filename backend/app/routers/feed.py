"""Feature 3: Social & Urgent Request Feed API Router (PRD Section 5).

Owner: Mahrukh Baig
Endpoints:
- GET  /api/feed                   - Public feed with query filters (FR 3.1, FR 3.2)
- GET  /api/feed/{request_id}      - Single request details (FR 3.1)
- POST /api/feed/{request_id}/respond - 'I Can Donate' one-tap response (FR 3.3)
- GET  /api/feed/{request_id}/share   - Share link & WhatsApp text generation (FR 3.3)
- POST /api/feed/{request_id}/close   - Manual override to close active request (FR 3.4)
"""
import logging
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, case

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.donor import Donor
from app.models.request import Request
from app.models.event import Event
from app.models.notification import Notification
from app.schemas.enums import UserRole, NotificationType
from app.services.cooldown import calculate_donor_cooldown
from app.services.audit import log_audit_event
from app.services.cache import get_cached_feed, set_cached_feed, invalidate_feed_cache
from app.schemas.feed import (
    FeedItemResponse,
    FeedListResponse,
    FeedDetailResponse,
    FeedResponseAction,
    FeedShareResponse,
    FeedCloseRequest,
    FeedCloseResponse,
)

logger = logging.getLogger("qatra.feed")

router = APIRouter(tags=["Urgent Request & Social Feed"])


# ------------------------------------------------------------------------------
# Helpers: Structured Post Creation / Formatting (FR 3.1)
# ------------------------------------------------------------------------------

def format_request_as_feed_item(req: Request) -> FeedItemResponse:
    """Formats a verified Request ORM model into a structured public feed card (FR 3.1)."""
    return FeedItemResponse(
        request_id=req.id,
        patient_name=req.patient_name,
        hospital_name=req.hospital_name,
        blood_group=req.blood_group,
        component_type=req.component_type,
        units_needed=req.units_needed,
        units_fulfilled=req.units_fulfilled,
        urgency=req.urgency,
        status=req.status,
        created_at=req.created_at,
        item_type="request",
    )


def format_event_as_feed_item(event: Event) -> FeedItemResponse:
    """Formats an upcoming blood drive Event ORM model into a feed card (FR 3.2)."""
    return FeedItemResponse(
        created_at=event.created_at,
        item_type="blood_drive",
        event_id=event.id,
        title=event.title,
        event_type=event.event_type,
        location_name=event.location_name,
        date_time=event.date_time,
        slots_total=event.slots_total,
        slots_booked=event.slots_booked,
    )


# ==============================================================================
# 5.1 GET /api/feed
# ==============================================================================

@router.get(
    "",
    response_model=FeedListResponse,
    summary="Public Feed with Multi-Parameter Query Filters",
    description="Public feed returning verified emergency blood requests and optional blood drive events filterable by blood group, urgency, and location (FR 3.1, FR 3.2).",
)
@router.get(
    "/",
    response_model=FeedListResponse,
    include_in_schema=False,
)
def get_feed(
    blood_group: Optional[str] = Query(None, description="Filter by blood group, e.g. A+, O-"),
    urgency: Optional[str] = Query(None, description="Filter by urgency tier: within_2_hours, within_24_hours"),
    location: Optional[str] = Query(None, description="Filter by city, district, or hospital name"),
    include_drive_events: bool = Query(False, description="Toggles blood drive events alongside emergency requests"),
    event_id: Optional[int] = Query(None, description="Filters requests or drive events associated with a specific event ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    1. Filter verified/active emergency requests (never unverified/pending or cancelled/fulfilled).
    2. Apply blood group, urgency, and location filters at SQL query level.
    3. Include active blood drives if include_drive_events is True.
    4. Sort requests by urgency (within_2_hours first) and recency.
    5. Paginate and return structured items.
    """
    # Check cache (NFR 1.2 & NFR 1.3 - sub-2-second performance)
    cache_key = f"{blood_group}:{urgency}:{location}:{include_drive_events}:{event_id}:{page}:{limit}"
    cached_result = get_cached_feed(cache_key)
    if cached_result is not None:
        return cached_result

    # Active emergency requests must be verified (or matched and still in need of units)
    query = db.query(Request).filter(
        Request.status.in_(["verified", "matched"]),
        Request.units_fulfilled < Request.units_needed,
    )

    if blood_group:
        query = query.filter(Request.blood_group == blood_group.strip().upper())

    if urgency:
        query = query.filter(Request.urgency == urgency.strip())

    if location:
        loc_term = f"%{location.strip()}%"
        query = query.filter(
            or_(
                Request.hospital_name.ilike(loc_term),
                Request.hospital_address.ilike(loc_term),
            )
        )

    # Sort urgency: within_2_hours prioritized first, then creation time descending
    urgency_order = case(
        (Request.urgency == "within_2_hours", 1),
        else_=2,
    )
    requests = query.order_by(urgency_order, Request.created_at.desc()).all()

    items: List[FeedItemResponse] = [format_request_as_feed_item(r) for r in requests]

    # Include blood drive events if requested (FR 3.2)
    if include_drive_events:
        event_query = db.query(Event).filter(
            Event.is_active.is_(True),
            Event.event_type == "blood_drive",
        )
        if event_id:
            event_query = event_query.filter(Event.id == event_id)
        if location:
            loc_term = f"%{location.strip()}%"
            event_query = event_query.filter(
                or_(
                    Event.location_name.ilike(loc_term),
                    Event.address.ilike(loc_term),
                )
            )
        events = event_query.order_by(Event.date_time.asc()).all()
        for ev in events:
            items.append(format_event_as_feed_item(ev))

    # Unified ranking: Within 2 hours priority first, then newest first
    def get_feed_sort_key(item: FeedItemResponse):
        is_urgent_2h = item.urgency == "within_2_hours"
        created = item.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        ts = created.timestamp() if created else 0.0
        return (0 if is_urgent_2h else 1, -ts)

    items.sort(key=get_feed_sort_key)

    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    paginated_items = items[start:end]

    feed_response = FeedListResponse(
        total=total,
        page=page,
        limit=limit,
        items=paginated_items,
    )
    set_cached_feed(cache_key, feed_response, ttl=30)
    return feed_response


# ==============================================================================
# 5.2 GET /api/feed/{request_id}
# ==============================================================================

@router.get(
    "/{request_id}",
    response_model=FeedDetailResponse,
    summary="Retrieve Single Emergency Request Details",
    description="Retrieves full verified request card details for public view and donor review (FR 3.1).",
)
def get_feed_item_detail(
    request_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieves full details of a verified blood request.
    Restricted to non-pending, non-cancelled requests.
    """
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood request #{request_id} not found.",
        )

    # Public visibility check: pending verification or cancelled requests are not visible
    if req.status in ["pending_verification", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood request #{request_id} is not publicly available.",
        )

    return FeedDetailResponse(
        request_id=req.id,
        patient_name=req.patient_name,
        hospital_name=req.hospital_name,
        hospital_address=req.hospital_address,
        hospital_latitude=req.hospital_latitude,
        hospital_longitude=req.hospital_longitude,
        blood_group=req.blood_group,
        component_type=req.component_type,
        units_needed=req.units_needed,
        units_fulfilled=req.units_fulfilled,
        urgency=req.urgency,
        status=req.status,
        search_radius_km=req.search_radius_km,
        created_at=req.created_at,
    )


# ==============================================================================
# 5.3 POST /api/feed/{request_id}/respond
# ==============================================================================

@router.post(
    "/{request_id}/respond",
    response_model=FeedResponseAction,
    summary="One-Tap 'I Can Donate' Response",
    description="Registers an immediate donor response to an active verified emergency request (FR 3.3).",
)
def respond_to_feed_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    1. Authenticate user: Must be a verified donor or admin.
    2. Validate request existence and active verified state.
    3. Check donor eligibility and 90-day cooldown status.
    4. Record in-app notification to the seeker.
    5. Update request state to 'matched' if currently 'verified'.
    6. Log compliance audit event.
    """
    # Role check: verified donor or admin
    if current_user.role not in [UserRole.VERIFIED_DONOR.value, UserRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only verified donors can respond to emergency blood requests.",
        )

    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood request #{request_id} not found.",
        )

    if req.status in ["fulfilled", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot respond to blood request #{request_id} because it is already {req.status}.",
        )

    if req.status == "pending_verification":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot respond to blood request #{request_id} while it is pending verification.",
        )

    # Validate donor profile and cooldown
    donor = db.query(Donor).filter(Donor.user_id == current_user.id).first()
    if donor:
        cooldown_info = calculate_donor_cooldown(donor)
        if cooldown_info.get("is_on_cooldown"):
            days = cooldown_info.get("days_remaining", 0)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Donor is currently on a 90-day cooldown ({days} days remaining) and cannot donate at this time.",
            )

    # Transition to matched if verified
    if req.status == "verified":
        req.status = "matched"

    # Send in-app notification to seeker
    seeker_notif = Notification(
        user_id=req.seeker_id,
        request_id=req.id,
        title="Donor Responded: I Can Donate",
        message=f"Verified donor {current_user.full_name} has responded 'I Can Donate' to your emergency request for {req.patient_name} at {req.hospital_name}.",
        notification_type=NotificationType.SYSTEM.value,
        is_read=False,
        sent_at=datetime.now(timezone.utc),
    )
    db.add(seeker_notif)

    # Log audit event
    log_audit_event(
        db=db,
        action="DONOR_FEED_RESPONSE",
        target_resource="requests",
        target_id=str(req.id),
        user_id=current_user.id,
        details=f"Donor {current_user.id} responded to request {req.id} (Status -> {req.status})",
    )

    db.commit()
    db.refresh(req)
    invalidate_feed_cache()

    return FeedResponseAction(
        request_id=req.id,
        response_recorded=True,
        message="Thank you! The seeker has been notified.",
    )


# ==============================================================================
# 5.4 GET /api/feed/{request_id}/share
# ==============================================================================

@router.get(
    "/{request_id}/share",
    response_model=FeedShareResponse,
    summary="Generate Structured Share Link and WhatsApp Message",
    description="Generates a structured URL and WhatsApp-formatted message without losing details or formatting (FR 3.3).",
)
def get_feed_share_details(
    request_id: int,
    db: Session = Depends(get_db),
):
    """
    Generates structured shareable link and clean WhatsApp broadcast text.
    """
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood request #{request_id} not found.",
        )

    # Format human-readable urgency text
    urgency_text = "Within 2 Hours" if req.urgency == "within_2_hours" else "Within 24 Hours"
    share_url = f"https://qatra.pk/requests/{req.id}"

    whatsapp_text = (
        f"🚨 *URGENT BLOOD NEEDED (QATRA)*\n"
        f"Blood Group: *{req.blood_group}*\n"
        f"Hospital: *{req.hospital_name}*\n"
        f"Units Needed: *{req.units_needed}*\n"
        f"Urgency: *{urgency_text}*\n"
        f"Verify & Respond: {share_url}"
    )

    return FeedShareResponse(
        request_id=req.id,
        share_url=share_url,
        whatsapp_text=whatsapp_text,
    )


# ==============================================================================
# 5.5 POST /api/feed/{request_id}/close
# ==============================================================================

@router.post(
    "/{request_id}/close",
    response_model=FeedCloseResponse,
    summary="Manual Override to Close an Active Blood Request",
    description="Manual override allowing the request owner (seeker) or an admin to close an active request (FR 3.4).",
)
def close_feed_request(
    request_id: int,
    payload: FeedCloseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    1. Authenticate user: Must be verified seeker or admin.
    2. Enforce strict ownership: Seeker can only close their own request.
    3. Validate request existence and active state.
    4. Transition status to 'fulfilled'.
    5. Discard/notify donors and seeker.
    6. Log compliance audit event.
    """
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood request #{request_id} not found.",
        )

    # Ownership check: seeker must own the request, or user must be admin
    is_admin = current_user.role == UserRole.ADMIN.value
    is_owner = req.seeker_id == current_user.id

    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only close your own blood requests.",
        )

    if req.status in ["fulfilled", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot close blood request #{request_id} because it is already {req.status}.",
        )

    old_status = req.status
    req.status = "fulfilled"
    # Ensure units_fulfilled reflects fulfillment
    if req.units_fulfilled < req.units_needed:
        req.units_fulfilled = req.units_needed

    close_note = f"Closed by user #{current_user.id} ({current_user.role}): {payload.reason}"
    req.admin_notes = f"{req.admin_notes}\n{close_note}" if req.admin_notes else close_note

    # Log compliance audit event
    log_audit_event(
        db=db,
        action="MANUAL_REQUEST_CLOSE",
        target_resource="requests",
        target_id=str(req.id),
        user_id=current_user.id,
        details=f"Closed with reason: {payload.reason} (Status: {old_status} -> fulfilled)",
    )

    # Notify seeker
    seeker_notif = Notification(
        user_id=req.seeker_id,
        request_id=req.id,
        title="Blood Request Closed",
        message=f"Your emergency request for {req.patient_name} has been closed: {payload.reason}.",
        notification_type=NotificationType.SYSTEM.value,
        is_read=False,
        sent_at=datetime.now(timezone.utc),
    )
    db.add(seeker_notif)

    # Notify donors who received alerts or responded for this request
    related_notifs = (
        db.query(Notification)
        .filter(
            Notification.request_id == req.id,
            Notification.user_id != req.seeker_id,
        )
        .all()
    )
    donor_user_ids = {n.user_id for n in related_notifs}
    for uid in donor_user_ids:
        db.add(
            Notification(
                user_id=uid,
                request_id=req.id,
                title="Blood Request Closed",
                message=f"The blood request for {req.patient_name} at {req.hospital_name} has been closed: {payload.reason}.",
                notification_type=NotificationType.SYSTEM.value,
                is_read=False,
                sent_at=datetime.now(timezone.utc),
            )
        )

    db.commit()
    db.refresh(req)
    invalidate_feed_cache()

    return FeedCloseResponse(
        request_id=req.id,
        status="fulfilled",
        message="Request closed. Donors have been notified.",
    )

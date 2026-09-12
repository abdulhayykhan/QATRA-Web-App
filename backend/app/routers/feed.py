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
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_, case

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.donor import Donor
from app.models.request import Request
from app.models.event import Event
from app.models.notification import Notification
from app.schemas.enums import UserRole, RequestStatus, NotificationType
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
            Event.is_active == True,
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

    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    paginated_items = items[start:end]

    return FeedListResponse(
        total=total,
        page=page,
        limit=limit,
        items=paginated_items,
    )


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

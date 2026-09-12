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
from sqlalchemy import desc, or_, and_

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

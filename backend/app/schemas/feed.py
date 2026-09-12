"""Social & Urgent Request Feed Pydantic schemas (PRD Section 5, Contract Section 5).

Owner: Mahrukh Baig (Feature 3: Social & Urgent Request Feed)
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class FeedItemResponse(BaseModel):
    """Feed card item representing a verified blood request or upcoming blood drive event."""

    request_id: Optional[int] = None
    patient_name: Optional[str] = None
    hospital_name: Optional[str] = None
    blood_group: Optional[str] = None
    component_type: Optional[str] = None
    units_needed: Optional[int] = None
    units_fulfilled: Optional[int] = None
    urgency: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime

    # Drive event fields when include_drive_events is toggled
    item_type: str = "request"  # "request" | "blood_drive"
    event_id: Optional[int] = None
    title: Optional[str] = None
    event_type: Optional[str] = None
    location_name: Optional[str] = None
    date_time: Optional[datetime] = None
    slots_total: Optional[int] = None
    slots_booked: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class FeedListResponse(BaseModel):
    """Paginated container for public feed listings."""

    total: int
    page: int
    limit: int
    items: List[FeedItemResponse]


class FeedDetailResponse(BaseModel):
    """Detailed emergency request card returned by GET /api/feed/{request_id}."""

    request_id: int
    patient_name: str
    hospital_name: str
    hospital_address: Optional[str] = None
    hospital_latitude: float
    hospital_longitude: float
    blood_group: str
    component_type: str
    units_needed: int
    units_fulfilled: int
    urgency: str
    status: str
    search_radius_km: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeedResponseAction(BaseModel):
    """Response payload for one-tap 'I Can Donate' action."""

    request_id: int
    response_recorded: bool = True
    message: str


class FeedShareResponse(BaseModel):
    """Structured sharing payload for direct links and WhatsApp forwards without garbled text."""

    request_id: int
    share_url: str
    whatsapp_text: str


class FeedCloseRequest(BaseModel):
    """Payload for manual override closure of an active emergency request."""

    reason: str = Field(..., min_length=2, max_length=500, description="Reason for closing request")


class FeedCloseResponse(BaseModel):
    """Response returned upon request closure."""

    request_id: int
    status: str = "fulfilled"
    message: str = "Request closed. Donors have been notified."

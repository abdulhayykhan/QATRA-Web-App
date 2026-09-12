"""Event and Registration Pydantic schemas."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.enums import EventType, RegistrationType


class EventBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    event_type: EventType = EventType.BLOOD_DRIVE
    date_time: datetime
    location_name: str = Field(..., min_length=2, max_length=255)
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    slots_total: int = Field(100, ge=1)


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: int
    organizer_id: int
    slots_booked: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RegistrationCreate(BaseModel):
    event_id: int
    registration_type: RegistrationType = RegistrationType.DONOR


class RegistrationResponse(BaseModel):
    id: int
    event_id: int
    user_id: int
    registration_type: RegistrationType
    status: str
    registered_at: datetime

    class Config:
        from_attributes = True

"""Donor Pydantic schemas."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.enums import BloodGroup


class DonorBase(BaseModel):
    blood_group: BloodGroup
    is_available: bool = False


class DonorLocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class DonorAvailabilityToggle(BaseModel):
    is_available: bool


class DonorPreScreenSubmit(BaseModel):
    age: int = Field(..., ge=16, le=100)
    weight_kg: float = Field(..., ge=30.0, le=300.0)
    hemoglobin_g_dl: Optional[float] = Field(None, ge=5.0, le=25.0)
    has_recent_illness: bool = Field(False, description="Fever, flu, or antibiotic usage in past 14 days")
    has_recent_tattoo_or_surgery: bool = Field(False, description="Major surgical procedures or tattooing in last 6 months")


class DonorResponse(DonorBase):
    id: int
    user_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_updated_at: Optional[datetime] = None
    last_donation_date: Optional[datetime] = None
    cooldown_until: Optional[datetime] = None
    pre_screening_passed: bool
    donation_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DonorMatchResponse(BaseModel):
    donor_id: int
    blood_group: BloodGroup
    distance_km: float
    estimated_arrival_minutes: Optional[int] = None
    is_available: bool

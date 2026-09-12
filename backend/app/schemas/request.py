"""Emergency Blood Request Pydantic schemas."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from app.schemas.enums import BloodGroup, ComponentType, UrgencyTier, RequestStatus


class RequestBase(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=255)
    patient_mrn: Optional[str] = Field(None, max_length=100)
    hospital_name: str = Field(..., min_length=2, max_length=255)
    hospital_address: Optional[str] = Field(None, max_length=500)
    hospital_latitude: float = Field(..., ge=-90.0, le=90.0)
    hospital_longitude: float = Field(..., ge=-180.0, le=180.0)
    blood_group: BloodGroup
    component_type: ComponentType = ComponentType.WHOLE_BLOOD
    units_needed: int = Field(1, ge=1, le=20)
    urgency: UrgencyTier = UrgencyTier.WITHIN_24_HOURS
    search_radius_km: float = Field(10.0, ge=1.0, le=50.0)


class RequestCreate(RequestBase):
    admission_slip_url: Optional[str] = None


class RequestUpdate(BaseModel):
    units_fulfilled: Optional[int] = Field(None, ge=0)
    status: Optional[RequestStatus] = None
    search_radius_km: Optional[float] = None
    admin_notes: Optional[str] = None


class RequestResponse(RequestBase):
    id: int
    request_id: Optional[int] = None
    seeker_id: int
    units_fulfilled: int
    status: RequestStatus
    expansion_count: int
    admission_slip_url: Optional[str] = None
    ocr_confidence: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def sync_request_id(self):
        if self.request_id is None:
            self.request_id = self.id
        return self

    class Config:
        from_attributes = True


class RequestStatusResponse(BaseModel):
    request_id: int
    status: RequestStatus
    units_needed: int
    units_fulfilled: int
    donors_alerted_count: int = 0
    donors_accepted_count: int = 0
    current_radius_km: float

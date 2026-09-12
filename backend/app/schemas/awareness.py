"""Awareness Sessions & Eligibility Pydantic schemas (Feature 4)."""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.enums import EligibilityStatus, EventType, RegistrationType


# ==============================================================================
# 1. Eligibility Checker Schemas (FR 4.1)
# ==============================================================================

class EligibilityCheckRequest(BaseModel):
    """4-step interactive eligibility checker request payload."""
    step1_age: int = Field(..., ge=1, le=120, description="Donor age in years")
    step1_weight_kg: float = Field(..., ge=10.0, le=300.0, description="Donor body weight in kilograms")
    step2_has_recent_illness: bool = Field(
        False,
        description="True if experiencing fever, active infection, flu, or antibiotic usage within the last 14 days",
    )
    step3_donated_within_90_days: bool = Field(
        False,
        description="True if donor gave blood within the last 90 days",
    )


class EligibilityCheckResponse(BaseModel):
    """Stateless eligibility evaluation output with statutory medical disclaimer."""
    result: str = Field(
        ...,
        description="'eligible', 'may_need_confirmation', or 'not_eligible'",
    )
    summary: str = Field(..., description="High-level result status headline")
    message: str = Field(..., description="Actionable screening explanation and donor guidance")
    disclaimer: str = Field(
        "This quiz is for preliminary screening only. Final eligibility is determined on-site by qualified medical staff.",
        description="Mandatory statutory medical disclaimer per PRD FR 4.1",
    )
    details: Optional[Dict[str, Any]] = Field(
        None,
        description="Structured evaluation results per step for frontend visualization",
    )


# ==============================================================================
# 2. Awareness Content Schemas (FR 4.2)
# ==============================================================================

class AwarenessContentBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    category: str = Field(
        ...,
        description="Category: basics, myths_facts, health_prep, cultural",
    )
    content_type: str = Field(
        "article",
        description="Content type: article, video, faq, myth_vs_fact",
    )
    content_url: Optional[str] = Field(None, max_length=500)
    myth: Optional[str] = None
    fact: Optional[str] = None
    summary: Optional[str] = None
    body_text: Optional[str] = None
    read_time_minutes: int = Field(2, ge=1, le=60)
    is_published: bool = True


class AwarenessContentCreate(AwarenessContentBase):
    pass


class AwarenessContentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    category: Optional[str] = None
    content_type: Optional[str] = None
    content_url: Optional[str] = None
    myth: Optional[str] = None
    fact: Optional[str] = None
    summary: Optional[str] = None
    body_text: Optional[str] = None
    read_time_minutes: Optional[int] = Field(None, ge=1, le=60)
    is_published: Optional[bool] = None


class AwarenessContentResponse(AwarenessContentBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==============================================================================
# 3. Event & Registration Schemas (FR 4.3)
# ==============================================================================

class EventSummaryResponse(BaseModel):
    id: int
    title: str
    event_type: str
    date_time: datetime
    location_name: str
    slots_total: int
    slots_booked: int
    address: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class EventRegistrationRequest(BaseModel):
    event_id: Optional[int] = None
    registration_type: str = Field("donor", description="Registration role: donor or volunteer")


class EventRegistrationResponse(BaseModel):
    registration_id: int
    event_id: int
    status: str = "confirmed"
    message: str = "Registration confirmed. An in-app confirmation and email notification have been sent."
    registration_type: str = "donor"
    registered_at: datetime


# ==============================================================================
# 4. Post-Donation Health Feedback Schemas (FR 4.4)
# ==============================================================================

class HealthFeedbackResponse(BaseModel):
    last_donation_date: Optional[datetime] = None
    screening_outcome: str = "Passed"
    post_donation_instructions: List[str]
    next_eligible_date: Optional[datetime] = None
    donation_count: int = 0


class HealthFeedbackCreateRequest(BaseModel):
    donor_id: int
    screening_outcome: str = Field("Passed", description="Passed, Deferred, or Under Observation")
    notes: Optional[str] = None
    donation_completed: bool = Field(True, description="Whether the donation was successfully drawn")
    custom_instructions: Optional[List[str]] = None

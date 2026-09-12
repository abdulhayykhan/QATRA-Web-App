"""Emergency Blood Request ORM model."""
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.notification import Notification


class Request(Base, TimestampMixin):
    """Emergency blood request entity created by verified seekers and verified via hospital slips."""

    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    seeker_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    patient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    patient_mrn: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Hospital MRN
    hospital_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hospital_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Hospital Geolocation
    hospital_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    hospital_longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Medical Requirements
    blood_group: Mapped[str] = mapped_column(String(5), index=True, nullable=False)
    component_type: Mapped[str] = mapped_column(String(50), default="Whole Blood", nullable=False)
    units_needed: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    units_fulfilled: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Urgency & Status
    urgency: Mapped[str] = mapped_column(String(50), default="within_24_hours", index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending_verification", index=True, nullable=False)

    # Matching parameters
    search_radius_km: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    expansion_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Verification details
    admission_slip_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    ocr_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ocr_extracted_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    seeker: Mapped["User"] = relationship("User", back_populates="requests")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="request")

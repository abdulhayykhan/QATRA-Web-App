"""Donor ORM model."""
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Boolean, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Donor(Base, TimestampMixin):
    """Donor profile tracking availability, spatial coordinates, and 90-day cooldown status."""

    __tablename__ = "donors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    blood_group: Mapped[str] = mapped_column(String(5), index=True, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    # Location (Spatial coordinates for haversine proximity queries)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Cooldown & Screening
    last_donation_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cooldown_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True, nullable=True)
    pre_screening_passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pre_screening_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    donation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="donor_profile")

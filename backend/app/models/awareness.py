"""AwarenessContent and HealthFeedback ORM models for Feature 4 (Awareness Sessions & Eligibility)."""
from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.donor import Donor


class AwarenessContent(Base, TimestampMixin):
    """Educational content item (article, video, FAQ, myth vs fact)."""

    __tablename__ = "awareness_contents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
        comment="basics, myths_facts, health_prep, cultural",
    )
    content_type: Mapped[str] = mapped_column(
        String(50),
        default="article",
        index=True,
        nullable=False,
        comment="article, video, faq, myth_vs_fact",
    )
    content_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    myth: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fact: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    read_time_minutes: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class HealthFeedback(Base, TimestampMixin):
    """Post-donation health screening feedback record tied to donor and donation event."""

    __tablename__ = "health_feedbacks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    donor_id: Mapped[int] = mapped_column(ForeignKey("donors.id", ondelete="CASCADE"), nullable=False, index=True)

    donation_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    screening_outcome: Mapped[str] = mapped_column(
        String(50),
        default="Passed",
        nullable=False,
        comment="Passed, Deferred, Under Observation",
    )
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recorded_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

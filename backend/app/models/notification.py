"""Notification ORM model."""
from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.request import Request


class Notification(Base):
    """Notification entity storing user alerts across proximity, rare groups, and cooldowns."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    request_id: Mapped[Optional[int]] = mapped_column(ForeignKey("requests.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(
        String(50),
        default="system",
        nullable=False,
        comment="proximity_alert, rare_blood_alert, cooldown_reset, system",
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")
    request: Mapped[Optional["Request"]] = relationship("Request", back_populates="notifications")

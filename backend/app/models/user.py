"""User ORM model."""
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.donor import Donor
    from app.models.request import Request
    from app.models.notification import Notification
    from app.models.event import Registration
    from app.models.audit import AuditLog


class User(Base, TimestampMixin):
    """User account entity, authenticated via Firebase Google Sign-In."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Masked/Encrypted

    role: Mapped[str] = mapped_column(
        String(50),
        default="guest",
        nullable=False,
        comment="guest, verified_seeker, verified_donor, organizer, admin",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # CNIC Vault data (hashed for duplication checks, encrypted at rest)
    cnic_hash: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)
    cnic_encrypted: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    cnic_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    donor_profile: Mapped[Optional["Donor"]] = relationship("Donor", back_populates="user", uselist=False)
    requests: Mapped[List["Request"]] = relationship("Request", back_populates="seeker")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user")
    registrations: Mapped[List["Registration"]] = relationship("Registration", back_populates="user")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user")

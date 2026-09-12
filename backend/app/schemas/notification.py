"""Notification Pydantic schemas."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.schemas.enums import NotificationType


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    request_id: Optional[int] = None
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    sent_at: datetime

    class Config:
        from_attributes = True

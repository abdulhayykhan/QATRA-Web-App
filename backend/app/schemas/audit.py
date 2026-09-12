"""AuditLog Pydantic schemas."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class AuditLogCreate(BaseModel):
    action: str = Field(..., max_length=100)
    target_resource: str = Field(..., max_length=100)
    target_id: Optional[str] = Field(None, max_length=100)
    details: Optional[str] = None
    ip_address: Optional[str] = Field(None, max_length=45)


class AuditLogResponse(AuditLogCreate):
    id: int
    user_id: Optional[int] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[AuditLogResponse]

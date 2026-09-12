"""User Pydantic schemas."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.enums import UserRole


class UserBase(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="User email address")
    full_name: str = Field(..., min_length=2, max_length=255)


class UserCreate(UserBase):
    firebase_uid: str = Field(..., description="Firebase Google Auth UID")
    phone_number: Optional[str] = Field(None, max_length=20)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)


class UserResponse(UserBase):
    id: int
    firebase_uid: str
    role: UserRole
    is_active: bool
    is_verified: bool
    cnic_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CNICSubmission(BaseModel):
    cnic_number: str = Field(..., pattern=r"^\d{13}$", description="13-digit Pakistani CNIC number without hyphens")
    front_image_url: str = Field(..., description="Uploaded CNIC front image URL or key")
    back_image_url: str = Field(..., description="Uploaded CNIC back image URL or key")

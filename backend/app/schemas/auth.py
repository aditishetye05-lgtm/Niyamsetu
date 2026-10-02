from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserSignup(BaseModel):
    email: EmailStr = Field(..., description="User corporate or official email address")
    password: str = Field(..., min_length=6, description="Account password (min 6 chars)")
    full_name: str = Field(..., min_length=2, max_length=255, description="Full name of representative")


class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="Account password")


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

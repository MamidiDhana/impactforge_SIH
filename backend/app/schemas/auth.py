from datetime import datetime
import re
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)+$")


def validate_email_format(v: str) -> str:
    cleaned = v.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError(f"Invalid email address format: '{v}'")
    return cleaned


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(default="citizen")
    organization_name: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_format(v)

    @field_validator("role")
    @classmethod
    def check_role(cls, v: str) -> str:
        role_cleaned = v.strip().lower()
        if role_cleaned == "faculty":
            raise ValueError("Public registration for faculty is disabled. Faculty accounts are provisioned via institutional invitation under the University Portal.")
        return role_cleaned


class UserLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str
    role: Optional[str] = None

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_format(v)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    organization_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    office_location: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

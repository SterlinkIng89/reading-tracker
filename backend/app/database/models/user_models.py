from pydantic import BaseModel, Field, SecretStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    username: str = Field(
        ..., min_length=3, max_length=50, description="Username for the user"
    )
    password: SecretStr = Field(..., min_length=8, description="Password for the user")


class UserDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Hashed password")
    refresh_token: Optional[str] = Field(None, description="JWT refresh token")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Account creation date"
    )
    updated_at: Optional[datetime] = Field(None, description="Last update date")

    model_config = {
        "validate_by_name": True,  # Keep for alias support
    }


class UserOut(BaseModel):
    id: str = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    created_at: datetime = Field(..., description="Account creation date")


class UserLoginResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")
    user: UserOut = Field(..., description="User information")

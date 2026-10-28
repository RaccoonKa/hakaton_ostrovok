"""Pydantic schemas for authentication and authorization."""

from pydantic import BaseModel, ConfigDict


class AuthUser(BaseModel):
    """Authenticated user profile representation."""

    model_config = ConfigDict(extra="forbid")

    id: str
    email: str
    full_name: str
    phone: str | None = None
    is_guest: bool = False
    created_at: str


class LoginRequest(BaseModel):
    """Payload for user login."""

    model_config = ConfigDict(extra="forbid")

    email: str
    password: str
    guest_token: str | None = None


class RegisterRequest(BaseModel):
    """Payload for user registration."""

    model_config = ConfigDict(extra="forbid")

    email: str
    password: str
    full_name: str
    phone: str | None = None
    guest_token: str | None = None


class AuthSessionResponse(BaseModel):
    """Session response with access token and user profile."""

    model_config = ConfigDict(extra="forbid")

    token: str
    user: AuthUser


class GuestSessionResponse(BaseModel):
    """Guest session response with access token and guest user profile."""

    model_config = ConfigDict(extra="forbid")

    token: str
    user: AuthUser

"""Authentication dependencies and user identity extraction."""

import logging
from datetime import UTC, datetime
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict

from core.auth_crypto import decode_access_token
from core.settings import settings

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(
    description="Bearer JWT access token or admin master key (AUTH_SECRET).",
    auto_error=False,
)


class CurrentUser(BaseModel):
    """Authenticated user context for request lifecycle."""

    model_config = ConfigDict(extra="forbid")

    id: str
    email: str = ""
    is_guest: bool = False
    is_admin: bool = False
    created_at: str = ""


async def get_current_user(
    http_auth: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> CurrentUser:
    """Validate Bearer JWT or master key and return CurrentUser."""
    if not http_auth or not http_auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = http_auth.credentials.strip()

    # 1. Master key (admin bypass) check
    if settings.AUTH_SECRET:
        master_secret = settings.AUTH_SECRET.get_secret_value()
        if master_secret and token == master_secret:
            return CurrentUser(
                id="admin",
                email="admin@corvax.internal",
                is_guest=False,
                is_admin=True,
                created_at="",
            )

    # 2. JWT access token validation
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError as e:
        logger.debug("JWT verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    is_guest = bool(payload.get("is_guest", False))
    email = str(payload.get("email", ""))
    iat = payload.get("iat")
    created_at = ""
    if iat:
        try:
            created_at = datetime.fromtimestamp(iat, tz=UTC).isoformat()
        except Exception:
            created_at = ""

    return CurrentUser(
        id=str(sub),
        email=email,
        is_guest=is_guest,
        is_admin=False,
        created_at=created_at,
    )

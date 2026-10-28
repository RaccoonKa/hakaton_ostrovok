"""Authentication cryptography and token utilities."""

import time
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from core.settings import settings

DEFAULT_DEV_SECRET = "corvax-dev-secret-key-32-chars-minimum-safe!"
JWT_ALGORITHM = "HS256"
DEFAULT_EXPIRATION_DAYS = 14


def get_auth_secret() -> str:
    """Return JWT secret key with fallback for dev environment."""
    if settings.AUTH_SECRET:
        secret_val = settings.AUTH_SECRET.get_secret_value()
        if secret_val:
            return secret_val
    return DEFAULT_DEV_SECRET


def hash_password(password: str) -> str:
    """Hash password using pure bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(
    user_id: str,
    email: str = "",
    is_guest: bool = False,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Create signed JWT access token valid for 14 days."""
    now = datetime.now(UTC)
    expire = now + (expires_delta if expires_delta else timedelta(days=DEFAULT_EXPIRATION_DAYS))

    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "is_guest": is_guest,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, get_auth_secret(), algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify JWT access token."""
    return jwt.decode(token, get_auth_secret(), algorithms=[JWT_ALGORITHM])


class LoginRateLimiter:
    """In-memory sliding window rate limiter for login attempts."""

    def __init__(self, max_attempts: int = 5, window_seconds: float = 60.0):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._records: dict[str, list[float]] = {}

    def check(self, key: str) -> bool:
        """Check if request under key is allowed. Records attempt if under limit."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        history = [ts for ts in self._records.get(key, []) if ts > cutoff]

        if len(history) >= self.max_attempts:
            self._records[key] = history
            return False

        history.append(now)
        self._records[key] = history
        return True

    def reset(self) -> None:
        """Clear rate limit history."""
        self._records.clear()


login_rate_limiter = LoginRateLimiter(max_attempts=5, window_seconds=60.0)

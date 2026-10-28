"""Authentication endpoints for guest sessions, registration, login and me."""

import logging
from datetime import UTC, datetime
from uuid import uuid4

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status

from core.auth_crypto import (
    create_access_token,
    decode_access_token,
    hash_password,
    login_rate_limiter,
    verify_password,
)
from memory import user_storage
from schema.auth import (
    AuthSessionResponse,
    AuthUser,
    GuestSessionResponse,
    LoginRequest,
    RegisterRequest,
)
from service.dependencies import CurrentUser, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/guest", response_model=GuestSessionResponse)
async def create_guest_session() -> GuestSessionResponse:
    """Create stateless guest session token without database writes."""
    guest_id = f"guest_{uuid4()}"
    now_str = datetime.now(UTC).isoformat()
    token = create_access_token(user_id=guest_id, is_guest=True)

    user = AuthUser(
        id=guest_id,
        email="",
        full_name="Гость",
        phone=None,
        is_guest=True,
        created_at=now_str,
    )
    return GuestSessionResponse(token=token, user=user)


@router.post("/register", response_model=AuthSessionResponse)
async def register(body: RegisterRequest) -> AuthSessionResponse:
    """Register new user account and migrate guest threads if valid token provided."""
    clean_email = body.email.strip()
    if not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email cannot be empty",
        )
    if not body.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot be empty",
        )
    if not body.full_name or not body.full_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name cannot be empty",
        )

    existing = await user_storage.get_user_by_email(clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    user_id = f"usr_{uuid4()}"
    now_str = datetime.now(UTC).isoformat()
    pwd_hash = hash_password(body.password)

    await user_storage.create_user(
        id=user_id,
        email=clean_email,
        password_hash=pwd_hash,
        full_name=body.full_name.strip(),
        phone=body.phone,
        created_at=now_str,
    )

    # Migrate guest threads if guest_token is provided and valid
    if body.guest_token:
        try:
            payload = decode_access_token(body.guest_token)
            if payload.get("is_guest") is True and payload.get("sub"):
                guest_id = str(payload["sub"])
                if guest_id.startswith("guest_"):
                    await user_storage.migrate_guest_threads(guest_id, user_id)
        except jwt.PyJWTError as e:
            logger.warning("Invalid guest_token during registration: %s", e)

    token = create_access_token(user_id=user_id, email=clean_email, is_guest=False)
    user = AuthUser(
        id=user_id,
        email=clean_email,
        full_name=body.full_name.strip(),
        phone=body.phone,
        is_guest=False,
        created_at=now_str,
    )
    return AuthSessionResponse(token=token, user=user)


@router.post("/login", response_model=AuthSessionResponse)
async def login(request: Request, body: LoginRequest) -> AuthSessionResponse:
    """Authenticate existing user with brute-force rate limit protection."""
    clean_email = body.email.strip()
    if not clean_email or not body.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password cannot be empty",
        )

    client_ip = request.client.host if request.client else "unknown"
    limiter_key = f"{client_ip}:{clean_email.lower()}"

    if not login_rate_limiter.check(limiter_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )

    user_dict = await user_storage.get_user_by_email(clean_email)
    if not user_dict or not verify_password(body.password, user_dict["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user_id = user_dict["id"]

    # Migrate guest threads if guest_token is provided and valid
    if body.guest_token:
        try:
            payload = decode_access_token(body.guest_token)
            if payload.get("is_guest") is True and payload.get("sub"):
                guest_id = str(payload["sub"])
                if guest_id.startswith("guest_"):
                    await user_storage.migrate_guest_threads(guest_id, user_id)
        except jwt.PyJWTError as e:
            logger.warning("Invalid guest_token during login: %s", e)

    token = create_access_token(user_id=user_id, email=user_dict["email"], is_guest=False)
    user = AuthUser(
        id=user_id,
        email=user_dict["email"],
        full_name=user_dict["full_name"],
        phone=user_dict.get("phone"),
        is_guest=False,
        created_at=user_dict["created_at"],
    )
    return AuthSessionResponse(token=token, user=user)


@router.get("/me", response_model=AuthUser)
async def get_me(current_user: CurrentUser = Depends(get_current_user)) -> AuthUser:
    """Return profile of currently authenticated user."""
    if current_user.is_guest:
        return AuthUser(
            id=current_user.id,
            email="",
            full_name="Гость",
            phone=None,
            is_guest=True,
            created_at=current_user.created_at or datetime.now(UTC).isoformat(),
        )

    user_dict = await user_storage.get_user_by_id(current_user.id)
    if user_dict:
        return AuthUser(
            id=user_dict["id"],
            email=user_dict["email"],
            full_name=user_dict["full_name"],
            phone=user_dict.get("phone"),
            is_guest=False,
            created_at=user_dict["created_at"],
        )

    return AuthUser(
        id=current_user.id,
        email=current_user.email,
        full_name="Пользователь",
        phone=None,
        is_guest=False,
        created_at=current_user.created_at or datetime.now(UTC).isoformat(),
    )

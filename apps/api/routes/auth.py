"""Authentication routes — login (with lockout) and session identity."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import AuditLog, User, get_db
from services.auth import (
    LOCKOUT_MINUTES,
    create_access_token,
    get_current_user,
    register_failed_attempt,
    register_successful_login,
    verify_password,
    _locked_seconds_remaining,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str


class MeResponse(BaseModel):
    id: int
    username: str
    role: str
    name: str
    mse_id: int | None = None


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user and issue a signed JWT.

    Enforces a lockout after repeated failures (default: 5 tries → 15 min).
    """
    username = payload.username.strip().lower()
    user = db.query(User).filter(User.username == username).first()

    # Generic error for unknown users (don't reveal which usernames exist).
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Already locked?
    locked_secs = _locked_seconds_remaining(user)
    if locked_secs > 0:
        mins = max(1, round(locked_secs / 60))
        raise HTTPException(
            status_code=429,
            detail=f"Account locked after too many attempts. Try again in {mins} min.",
            headers={"Retry-After": str(locked_secs)},
        )

    # Wrong password → count the failure, maybe lock.
    if not verify_password(payload.password, user.hashed_password):
        remaining = register_failed_attempt(user, db)
        if remaining == 0:
            raise HTTPException(
                status_code=429,
                detail=f"Too many failed attempts. Account locked for {LOCKOUT_MINUTES} min.",
            )
        raise HTTPException(
            status_code=401,
            detail=f"Invalid credentials. {remaining} attempt(s) left before lockout.",
        )

    # Success.
    register_successful_login(user, db)
    db.add(AuditLog(
        action="user_login",
        entity_type="user",
        entity_id=user.id,
        details=f"{user.role} login: {user.username}",
        performed_by=user.username,
    ))
    db.commit()

    token = create_access_token(user)
    return LoginResponse(access_token=token, role=user.role, name=user.display_name or user.username)


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)):
    """Return the currently authenticated user (validates the token)."""
    return MeResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        name=user.display_name or user.username,
        mse_id=user.mse_id,
    )

"""Authentication routes — login (with lockout) and session identity."""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
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


class ResendRequest(BaseModel):
    username: str


@router.post("/resend-passcode")
def resend_passcode(
    payload: ResendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Public self-service: email a fresh one-time passcode to a registered MSE.

    Always returns the same generic message (never reveals whether an account
    exists — anti-enumeration). Issuing a new passcode invalidates the old one.
    Rate-limited via the 'login' bucket. The passcode is delivered ONLY by email.
    """
    import secrets

    from services.auth import hash_password

    generic = {"message": "If that email is registered, a new passcode has been sent to it."}
    username = payload.username.strip().lower()
    if not username:
        return generic
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active or user.role != "mse":
        return generic

    new_passcode = f"{secrets.randbelow(10**6):06d}"
    user.hashed_password = hash_password(new_passcode)
    user.failed_attempts = 0
    user.locked_until = None
    db.add(AuditLog(
        action="passcode_resent",
        entity_type="user",
        entity_id=user.id,
        details=f"One-time passcode re-issued for {user.username}",
        performed_by="self-service",
    ))
    db.commit()

    business_name = None
    if user.mse_id:
        from database import MSE
        mse = db.query(MSE).get(user.mse_id)
        if mse:
            business_name = mse.name

    from services.email import send_registration_passcode
    background_tasks.add_task(
        send_registration_passcode,
        to_email=user.username,
        login_id=user.username,
        passcode=new_passcode,
        business_name=business_name,
        entrepreneur_name=user.display_name,
    )
    return generic


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

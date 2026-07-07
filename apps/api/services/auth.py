"""Authentication & RBAC — signed JWTs, bcrypt passwords, DB-backed lockout.

Security model (replaces the old client-only localStorage gate):
- Passwords are bcrypt-hashed; plaintext never stored.
- On success the server issues a short-lived HS256 JWT carrying the role.
  The role is *signed* — a client cannot forge admin access by editing storage.
- Login lockout is stored on the user row in Postgres (shared across all
  workers, zero extra infra/cost): after MAX_LOGIN_ATTEMPTS failures the
  account is locked for LOCKOUT_MINUTES.
"""

import logging
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import User, get_db

logger = logging.getLogger(__name__)

# ── Config (override via env in production) ────────────────────────────
_JWT_SECRET = os.getenv("JWT_SECRET", "")
if not _JWT_SECRET:
    _JWT_SECRET = "dev-insecure-secret-change-me"
    logger.critical(
        "JWT_SECRET not set — using an insecure dev default. "
        "Set JWT_SECRET in production or all tokens are forgeable."
    )

JWT_ALG = "HS256"
JWT_TTL_MIN = int(os.getenv("JWT_TTL_MIN", "720"))          # 12 hours
MAX_LOGIN_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
LOCKOUT_MINUTES = int(os.getenv("LOCKOUT_MINUTES", "15"))


# ── Password hashing ──────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ── JWT ────────────────────────────────────────────────────────────────

def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "name": user.display_name or user.username,
        "mse_id": user.mse_id,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_TTL_MIN),
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=JWT_ALG)


# ── Login lockout (DB-backed) ─────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _locked_seconds_remaining(user: User) -> int:
    """Seconds left on an active lock, or 0 if not locked."""
    if not user.locked_until:
        return 0
    locked_until = user.locked_until
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    remaining = (locked_until - _now()).total_seconds()
    return int(remaining) if remaining > 0 else 0


def register_failed_attempt(user: User, db: Session) -> int:
    """Increment failures; lock the account if the limit is hit.

    Returns the number of attempts remaining before lockout (0 = now locked).
    """
    user.failed_attempts = (user.failed_attempts or 0) + 1
    remaining = MAX_LOGIN_ATTEMPTS - user.failed_attempts
    if user.failed_attempts >= MAX_LOGIN_ATTEMPTS:
        user.locked_until = _now() + timedelta(minutes=LOCKOUT_MINUTES)
        user.failed_attempts = 0
        remaining = 0
    db.commit()
    return max(0, remaining)


def register_successful_login(user: User, db: Session) -> None:
    user.failed_attempts = 0
    user.locked_until = None
    user.last_login_at = _now()
    db.commit()


# ── FastAPI dependencies ──────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Validate the Bearer token and return the live user record."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(credentials.credentials, _JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please sign in again")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Account not found or disabled")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Gate a route to NSIC administrators only."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user

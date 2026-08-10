"""Enterprise-facing notification feed.

Scoping is the whole security story here: a notification names an
enterprise's approval status, its allocated SNP and its officer's notes, so
one owner must never read another's. Every query is filtered by the mse_id
carried on the authenticated user record — never by a client-supplied id.

Admins have no mse_id of their own. They may read a specific enterprise's
feed by passing ?mse_id=, which is a support/oversight affordance consistent
with their existing access to /audit and /mse.
"""

from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import MSE, AuditLog, Notification, User, get_db
from services.auth import get_current_user, require_admin
from services.notifications import notify

router = APIRouter()


class NotificationItem(BaseModel):
    id: int
    event: str
    title_en: str
    title_hi: Optional[str] = None
    body_en: Optional[str] = None
    body_hi: Optional[str] = None
    href: Optional[str] = None
    is_read: bool
    created_at: Optional[datetime] = None

    # Pydantic v2 style, matching MSEResponse and the rest of this codebase.
    # `class Config` is the deprecated v1 spelling.
    model_config = {"from_attributes": True}


class NotificationFeed(BaseModel):
    items: list[NotificationItem]
    unread: int


def _scope_mse_id(user: User, mse_id: Optional[int]) -> Optional[int]:
    """Which enterprise's feed this caller is allowed to read.

    MSE users are pinned to their own record and a supplied mse_id is ignored
    rather than honoured — trusting it would turn the feed into an enumeration
    oracle over every enterprise on the platform.
    """
    if user.role == "admin":
        return mse_id
    return user.mse_id


@router.get("/", response_model=NotificationFeed)
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
    mse_id: Optional[int] = Query(None, description="Admin only — read one enterprise's feed"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Newest-first feed for the calling enterprise, plus an unread count.

    An MSE user with no linked enterprise (an account created before its
    profile, or an admin without ?mse_id=) gets an empty feed rather than a
    404 — the bell is chrome on every portal page and must never error there.
    """
    scoped = _scope_mse_id(user, mse_id)
    if not scoped:
        return NotificationFeed(items=[], unread=0)

    q = db.query(Notification).filter(Notification.mse_id == scoped)
    if unread_only:
        q = q.filter(Notification.is_read.is_(False))

    items = q.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit).all()
    unread = (
        db.query(Notification)
        .filter(Notification.mse_id == scoped, Notification.is_read.is_(False))
        .count()
    )
    return NotificationFeed(
        items=[NotificationItem.model_validate(n) for n in items],
        unread=unread,
    )


@router.post("/{notification_id}/read", response_model=NotificationItem)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark one notification read.

    Returns 404 rather than 403 when it belongs to someone else: a 403 would
    confirm the row exists, which is itself a leak across enterprises.
    """
    row = db.query(Notification).filter(Notification.id == notification_id).first()
    scoped = _scope_mse_id(user, row.mse_id if row else None)
    if not row or row.mse_id != scoped:
        raise HTTPException(status_code=404, detail="Notification not found")

    if not row.is_read:
        row.is_read = True
        row.read_at = datetime.utcnow()
        db.commit()
        db.refresh(row)
    return NotificationItem.model_validate(row)


class BroadcastRequest(BaseModel):
    """An announcement fans out to every registered owner and can send email,
    so the input is constrained at the schema rather than checked ad hoc:
    a 422 from Pydantic is cheaper than a bad broadcast that cannot be recalled.

    Lengths mirror the columns (title VARCHAR(200), href VARCHAR(200)) so an
    over-long value fails validation instead of the INSERT.
    """

    title_en: str = Field(min_length=3, max_length=200)
    body_en: str = Field(min_length=3, max_length=2000)
    title_hi: Optional[str] = Field(default=None, max_length=200)
    body_hi: Optional[str] = Field(default=None, max_length=2000)
    # In-app destination only. An absolute URL here would turn an officer
    # broadcast into an open redirect delivered straight to owners' inboxes.
    href: Optional[str] = Field(default=None, max_length=200, pattern=r"^/[A-Za-z0-9/_\-?=&]*$")
    # Who hears it. "registered" = enterprises with a real sign-in account,
    # which is the only audience that can act on the news.
    audience: Literal["registered", "allocated"] = "registered"
    send_email: bool = False


@router.post("/broadcast")
def broadcast(
    payload: BroadcastRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Announce a feature launch or platform change to enterprise owners.

    Scoped to enterprises that actually have a login by default. The `mses`
    table holds thousands of registry-derived profiles that nobody can sign in
    to; writing announcements to those would be pure noise, and emailing them
    would be worse — those addresses never opted into anything.

    Email is opt-in per broadcast (`send_email`) because a launch note is the
    one notification class that is genuinely optional for the recipient.
    """
    # `audience` is a Literal, so Pydantic already rejects anything else with
    # a 422 before this body runs — no hand-rolled check needed.
    q = (
        db.query(MSE.id, MSE.name, MSE.email)
        .join(User, User.mse_id == MSE.id)
        .filter(User.role == "mse", User.is_active.is_(True))
    )
    if payload.audience == "allocated":
        q = q.filter(MSE.assigned_snp_id.isnot(None))

    recipients = q.all()
    emailed = 0
    for mse_id, name, email in recipients:
        notify(
            db,
            mse_id,
            "announcement",
            title_en=payload.title_en,
            title_hi=payload.title_hi,
            body_en=payload.body_en,
            body_hi=payload.body_hi,
            href=payload.href,
            background_tasks=background_tasks if payload.send_email else None,
            email_to=email if payload.send_email else None,
            business_name=name,
        )
        if payload.send_email and email:
            emailed += 1

    db.add(AuditLog(
        action="notification_broadcast",
        entity_type="notification",
        entity_id=None,
        details=(f"Announcement to {len(recipients)} enterprise(s) "
                 f"[{payload.audience}], emailed={emailed}: {payload.title_en}"),
        performed_by=user.username,
    ))
    db.commit()
    return {"notified": len(recipients), "emailed": emailed}


@router.post("/read-all")
def mark_all_read(
    mse_id: Optional[int] = Query(None, description="Admin only"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Clear the badge in one call — the bell's 'mark all as read'."""
    scoped = _scope_mse_id(user, mse_id)
    if not scoped:
        return {"updated": 0}

    updated = (
        db.query(Notification)
        .filter(Notification.mse_id == scoped, Notification.is_read.is_(False))
        .update(
            {Notification.is_read: True, Notification.read_at: datetime.utcnow()},
            synchronize_session=False,
        )
    )
    db.commit()
    return {"updated": updated}

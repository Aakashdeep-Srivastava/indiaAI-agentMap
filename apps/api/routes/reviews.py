"""App review routes — public product feedback (submit) + admin read.

POST is public (anyone can rate the application); it is rate-limited per IP by
the sliding-window middleware ('default' bucket). GET is admin-only (NSIC
oversight) — the read gate is enforced per-route via require_admin.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import AppReview, User, get_db
from services.auth import require_admin

router = APIRouter()


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    persona: Optional[str] = None  # mse | officer | visitor


class ReviewResponse(BaseModel):
    id: int
    rating: int
    comment: Optional[str] = None
    name: Optional[str] = None
    persona: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewSummary(BaseModel):
    count: int
    average: float
    distribution: dict[int, int]  # stars → how many
    reviews: list[ReviewResponse]


def _clip(value: Optional[str], length: int) -> Optional[str]:
    v = (value or "").strip()[:length]
    return v or None


@router.post("/", response_model=ReviewResponse, status_code=201)
def submit_review(payload: ReviewCreate, request: Request, db: Session = Depends(get_db)):
    """Public: submit a rating (1–5) + optional comment about the application."""
    review = AppReview(
        rating=payload.rating,
        comment=_clip(payload.comment, 2000),
        name=_clip(payload.name, 200),
        email=_clip(payload.email, 200),
        persona=_clip(payload.persona, 40),
        source="web",
        user_agent=_clip(request.headers.get("user-agent"), 400),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/", response_model=ReviewSummary)
def list_reviews(
    limit: int = Query(default=100, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),  # bulk feedback (may carry PII) — admins only
):
    """Admin: read submitted reviews, newest first, with an aggregate summary."""
    rows = (
        db.query(AppReview)
        .order_by(AppReview.created_at.desc())
        .limit(limit)
        .all()
    )
    count = db.query(func.count(AppReview.id)).scalar() or 0
    avg = db.query(func.avg(AppReview.rating)).scalar()
    dist_rows = (
        db.query(AppReview.rating, func.count(AppReview.id))
        .group_by(AppReview.rating)
        .all()
    )
    distribution = {star: 0 for star in range(1, 6)}
    for star, n in dist_rows:
        distribution[int(star)] = int(n)

    return ReviewSummary(
        count=int(count),
        average=round(float(avg), 2) if avg is not None else 0.0,
        distribution=distribution,
        reviews=rows,
    )

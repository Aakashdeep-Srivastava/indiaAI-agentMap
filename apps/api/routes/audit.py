"""Audit Trail routes — immutable log of all AI decisions."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import AuditLog, get_db

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: int
    action: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    details: Optional[str]
    performed_by: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[AuditLogResponse])
def list_audit_logs(
    limit: int = Query(default=50, le=200),
    action: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Return recent audit logs, newest first."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()

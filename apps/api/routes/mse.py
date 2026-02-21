"""MSE (Micro/Small Enterprise) CRUD routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import MSE, AuditLog, get_db

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────

class MSECreate(BaseModel):
    udyam_number: str
    name: str
    description: str
    district: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    nic_code: Optional[str] = None
    language: str = "en"


class MSEResponse(BaseModel):
    id: int
    udyam_number: str
    name: str
    description: str
    district: Optional[str]
    state: Optional[str]
    pin_code: Optional[str]
    nic_code: Optional[str]
    language: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────

@router.post("/", response_model=MSEResponse, status_code=201)
def register_mse(payload: MSECreate, db: Session = Depends(get_db)):
    """Register a new Micro/Small Enterprise for onboarding."""
    existing = db.query(MSE).filter(MSE.udyam_number == payload.udyam_number).first()
    if existing:
        raise HTTPException(status_code=409, detail="MSE with this Udyam number already exists")

    mse = MSE(**payload.model_dump())
    db.add(mse)
    db.flush()

    db.add(AuditLog(
        action="mse_registered",
        entity_type="mse",
        entity_id=mse.id,
        details=f"Registered {payload.name} ({payload.udyam_number})",
        performed_by="system",
    ))
    db.commit()
    db.refresh(mse)
    return mse


@router.get("/", response_model=list[MSEResponse])
def list_mses(
    state: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List MSEs with optional state filter."""
    query = db.query(MSE)
    if state:
        query = query.filter(MSE.state == state)
    return query.offset(skip).limit(limit).all()


@router.get("/{mse_id}", response_model=MSEResponse)
def get_mse(mse_id: int, db: Session = Depends(get_db)):
    """Retrieve a single MSE by ID."""
    mse = db.query(MSE).get(mse_id)
    if not mse:
        raise HTTPException(status_code=404, detail="MSE not found")
    return mse

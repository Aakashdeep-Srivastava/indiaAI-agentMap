"""MSE (Micro/Small Enterprise) CRUD routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import MSE, AuditLog, ClassificationResult, MatchResult, User, get_db
from services.auth import get_current_user, require_admin

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
    turnover_band: Optional[str] = None
    mobile_number: Optional[str] = None
    products: Optional[str] = None
    # Official NSIC MSME TEAM registration form fields
    entrepreneur_name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    org_type: Optional[str] = None
    major_activity: Optional[str] = None
    transaction_type: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    turnover_prev_fy: Optional[str] = None
    ondc_awareness: bool = True
    wish_snp: bool = True
    # DPDP Act 2023: explicit consent to process the enterprise's data.
    consent_given: bool = False


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
    turnover_band: Optional[str]
    mobile_number: Optional[str]
    products: Optional[str]
    entrepreneur_name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    org_type: Optional[str] = None
    major_activity: Optional[str] = None
    transaction_type: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    turnover_prev_fy: Optional[str] = None
    ondc_awareness: Optional[bool] = None
    wish_snp: Optional[bool] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────

@router.post("/", response_model=MSEResponse, status_code=201)
def register_mse(
    payload: MSECreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Register a new Micro/Small Enterprise for onboarding."""
    if not payload.consent_given:
        raise HTTPException(
            status_code=422,
            detail="Consent to process enterprise data is required (DPDP Act 2023).",
        )
    existing = db.query(MSE).filter(MSE.udyam_number == payload.udyam_number).first()
    if existing:
        raise HTTPException(status_code=409, detail="MSE with this Udyam number already exists")

    data = payload.model_dump()
    data.pop("consent_given", None)
    # Convert empty strings to None for enum/nullable fields
    for key in (
        "turnover_band", "nic_code", "org_type", "major_activity",
        "transaction_type", "gst_number", "pan_number", "turnover_prev_fy",
        "entrepreneur_name", "email", "address",
    ):
        if key in data and data[key] == "":
            data[key] = None
    mse = MSE(**data, consent_given=True, consent_at=datetime.utcnow())
    db.add(mse)
    db.flush()

    db.add(AuditLog(
        action="mse_registered",
        entity_type="mse",
        entity_id=mse.id,
        details=f"Registered {payload.name} ({payload.udyam_number}), consent recorded",
        performed_by=user.username,
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
    user: User = Depends(require_admin),  # bulk PII — NSIC admins only
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


@router.delete("/{mse_id}", status_code=204)
def erase_mse(
    mse_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    """DPDP right-to-erasure: delete an MSE and all derived AI results."""
    mse = db.query(MSE).get(mse_id)
    if not mse:
        raise HTTPException(status_code=404, detail="MSE not found")

    db.query(ClassificationResult).filter(ClassificationResult.mse_id == mse_id).delete()
    db.query(MatchResult).filter(MatchResult.mse_id == mse_id).delete()
    db.delete(mse)
    db.add(AuditLog(
        action="mse_erased",
        entity_type="mse",
        entity_id=mse_id,
        details="DPDP erasure: profile and derived AI results deleted",
        performed_by=user.username,
    ))
    db.commit()

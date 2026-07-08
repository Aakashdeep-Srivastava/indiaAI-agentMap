"""MSE (Micro/Small Enterprise) CRUD routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import MSE, AuditLog, ClassificationResult, MatchResult, User, get_db
from services.auth import get_current_user, get_optional_user, require_admin

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
    user: User | None = Depends(get_optional_user),
):
    """Register a new MSE. Public (PS2 voice-first onboarding), rate-limited per IP."""
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
        performed_by=user.username if user else "public-registration",
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
def get_mse(
    mse_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),  # profile PII — signed-in only
):
    """Retrieve a single MSE by ID."""
    mse = db.query(MSE).get(mse_id)
    if not mse:
        raise HTTPException(status_code=404, detail="MSE not found")
    return mse


class ClusterBubble(BaseModel):
    state: str
    count: int
    lat: float
    lng: float


class ClusterDistrict(BaseModel):
    district: str
    state: str
    count: int


class DistrictBubble(BaseModel):
    district: str
    state: str
    count: int
    lat: float
    lng: float


class ClusterResponse(BaseModel):
    industry_label: str
    total_similar: int
    your_state: Optional[str] = None
    your_district: Optional[str] = None
    your_location: Optional[list[float]] = None  # [lat, lng]
    by_state: list[ClusterBubble]
    # District-level bubbles with real OSM-geocoded coordinates
    by_district: list[DistrictBubble]
    top_districts: list[ClusterDistrict]
    insights: list[str]


@router.get("/{mse_id}/clusters", response_model=ClusterResponse)
def mse_clusters(
    mse_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Cluster of similar businesses (same NIC industry) across India —
    geographic insight for the MSE (PS2: clustering & capability assessment)."""
    from sqlalchemy import func

    from database import SNP
    from services.geo import state_centroid

    mse = db.query(MSE).get(mse_id)
    if not mse:
        raise HTTPException(status_code=404, detail="MSE not found")

    # Similar = same 2-digit NIC industry; fall back to the whole corpus.
    nic2 = (mse.nic_code or "")[:2]
    q = db.query(MSE.state, MSE.district, func.count(MSE.id))
    if nic2:
        q = q.filter(MSE.nic_code.like(f"{nic2}%"))
        industry_label = f"NIC {nic2} industry peers"
    else:
        industry_label = "registered MSEs"
    rows = q.group_by(MSE.state, MSE.district).all()

    state_counts: dict[str, int] = {}
    district_counts: dict[tuple[str, str], int] = {}
    total = 0
    for state, district, count in rows:
        total += count
        if state:
            state_counts[state] = state_counts.get(state, 0) + count
        if district and state:
            district_counts[(district, state)] = (
                district_counts.get((district, state), 0) + count
            )

    by_state = []
    for state, count in sorted(state_counts.items(), key=lambda x: -x[1]):
        coords = state_centroid(state)
        if coords:
            by_state.append(ClusterBubble(state=state, count=count, lat=coords[0], lng=coords[1]))

    # District bubbles using the OSM-geocoded gazetteer (geo_districts)
    from sqlalchemy import text as _text
    gazetteer: dict[tuple[str, str], tuple[float, float]] = {}
    try:
        for d, s, lat, lng in db.execute(
            _text("SELECT district, state, lat, lng FROM geo_districts")
        ).fetchall():
            gazetteer[(d.lower(), s.lower())] = (lat, lng)
    except Exception:
        pass  # gazetteer table empty/unavailable — state bubbles still work

    by_district: list[DistrictBubble] = []
    your_location = None
    for (district, state), count in sorted(district_counts.items(), key=lambda x: -x[1]):
        coords = gazetteer.get((district.lower(), (state or "").lower()))
        if coords:
            by_district.append(DistrictBubble(
                district=district, state=state, count=count,
                lat=coords[0], lng=coords[1],
            ))
    if mse.district and mse.state:
        own = gazetteer.get((mse.district.lower(), mse.state.lower()))
        if own:
            your_location = [own[0], own[1]]

    top_districts = [
        ClusterDistrict(district=d, state=s, count=c)
        for (d, s), c in sorted(district_counts.items(), key=lambda x: -x[1])[:8]
    ]

    # SNP coverage of the MSE's own state
    snp_cover = 0
    if mse.state:
        state_l = mse.state.lower()
        for (geo,) in db.query(SNP.geo_coverage).all():
            g = (geo or "").lower()
            if state_l in g or "pan" in g or "all" in g:
                snp_cover += 1

    insights: list[str] = []
    own_district_count = next(
        (c for (d, s), c in district_counts.items()
         if mse.district and d.lower() == mse.district.lower()),
        0,
    )
    if own_district_count > 1:
        insights.append(
            f"You are one of {own_district_count} similar businesses in "
            f"{mse.district} — a local cluster that seller platforms actively target."
        )
    elif mse.district:
        insights.append(
            f"You'd be an early mover for this category in {mse.district} — "
            f"less local competition on ONDC."
        )
    if top_districts:
        t = top_districts[0]
        insights.append(
            f"The largest cluster of similar businesses is {t.district}, "
            f"{t.state} ({t.count}) — pricing and catalogue benchmarks to watch."
        )
    if len(by_state) >= 3:
        top3 = ", ".join(b.state for b in by_state[:3])
        insights.append(f"This industry is concentrated in {top3}.")
    if snp_cover:
        insights.append(
            f"{snp_cover} seller platforms cover your state — strong onboarding options."
        )

    return ClusterResponse(
        industry_label=industry_label,
        total_similar=total,
        your_state=mse.state,
        your_district=mse.district,
        your_location=your_location,
        by_state=by_state,
        by_district=by_district,
        top_districts=top_districts,
        insights=insights,
    )


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

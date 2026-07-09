"""Match route – IndicBERT-based MSE-to-SNP matching with multi-factor scoring."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import MSE, SNP, AuditLog, ClassificationResult, MatchResult, User, get_db
from services.auth import get_current_user
from services.matcher import compute_match_scores, readiness_nudges
from services.explainer import generate_explainer

router = APIRouter()

MODEL_VERSION = "weighted-multifactor-v2"


class MatchRequest(BaseModel):
    mse_id: int
    top_k: int = 5


class FactorBreakdown(BaseModel):
    domain_score: float
    geo_score: float
    commission_score: float
    history_score: float
    sentiment_score: float


class MatchItem(BaseModel):
    snp_id: int
    snp_name: str
    composite_score: float
    confidence_band: str
    # Qualitative per-factor bands (high/medium/low) — safe for all roles.
    factor_bands: dict[str, str]
    # Human-readable reasons this SNP fits (qualitative, all roles).
    fit_reasons: list[str] = []
    # Raw factor scores are NSIC-admin only; never sent to MSE clients.
    factors: Optional[FactorBreakdown] = None
    explainer_en: str
    explainer_hi: str


class MatchResponse(BaseModel):
    mse_id: int
    mse_name: str
    predicted_domain: Optional[str]
    matches: list[MatchItem]
    # Capability-gap suggestions that improve onboarding odds.
    nudges: list[str] = []


@router.post("/", response_model=MatchResponse, response_model_exclude_none=True)
def match_mse_to_snps(
    payload: MatchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Find the best SNP matches for an MSE using the multi-factor scoring algorithm."""
    mse = db.query(MSE).get(payload.mse_id)
    if not mse:
        raise HTTPException(status_code=404, detail="MSE not found")

    # Get latest classification
    classification = (
        db.query(ClassificationResult)
        .filter(ClassificationResult.mse_id == mse.id)
        .order_by(ClassificationResult.created_at.desc())
        .first()
    )

    predicted_domain = classification.predicted_domain if classification else None

    # Fetch candidate SNPs
    snps = db.query(SNP).all()
    if not snps:
        raise HTTPException(status_code=404, detail="No SNPs available in the system")

    # Compute match scores
    scored = compute_match_scores(mse, snps, predicted_domain)
    top_matches = sorted(scored, key=lambda s: s["composite"], reverse=True)[: payload.top_k]

    items: list[MatchItem] = []
    for m in top_matches:
        snp = m["snp"]
        band = _confidence_band(m["composite"])
        explainer = generate_explainer(mse, snp, m, band)

        result = MatchResult(
            mse_id=mse.id,
            snp_id=snp.id,
            composite_score=m["composite"],
            domain_score=m["domain"],
            geo_score=m["geo"],
            commission_score=m["commission"],
            history_score=m["history"],
            sentiment_score=m["sentiment"],
            confidence_band=band,
            explainer_en=explainer["en"],
            explainer_hi=explainer["hi"],
            model_version=MODEL_VERSION,
        )
        db.add(result)

        items.append(MatchItem(
            snp_id=snp.id,
            snp_name=snp.name,
            composite_score=round(m["composite"], 4),
            confidence_band=band,
            factor_bands={
                "domain": _factor_band(m["domain"]),
                "geo": _factor_band(m["geo"]),
                "commission": _factor_band(m["commission"]),
                "history": _factor_band(m["history"]),
                "sentiment": _factor_band(m["sentiment"]),
            },
            fit_reasons=m.get("fit_reasons", []),
            factors=FactorBreakdown(
                domain_score=round(m["domain"], 4),
                geo_score=round(m["geo"], 4),
                commission_score=round(m["commission"], 4),
                history_score=round(m["history"], 4),
                sentiment_score=round(m["sentiment"], 4),
            ) if user.role == "admin" else None,
            explainer_en=explainer["en"],
            explainer_hi=explainer["hi"],
        ))

    db.add(AuditLog(
        action="mse_matched",
        entity_type="mse",
        entity_id=mse.id,
        details=f"Matched to {len(items)} SNPs, top={items[0].snp_name if items else 'none'} ({MODEL_VERSION})",
        performed_by=user.username,
    ))
    db.commit()

    return MatchResponse(
        mse_id=mse.id,
        mse_name=mse.name,
        predicted_domain=predicted_domain,
        matches=items,
        nudges=readiness_nudges(mse),
    )


def _confidence_band(score: float) -> str:
    """Route score to Green / Yellow / Red confidence band."""
    if score >= 0.85:
        return "green"
    elif score >= 0.60:
        return "yellow"
    return "red"


def _factor_band(score: float) -> str:
    """Qualitative factor strength — the only per-factor signal MSE clients see."""
    if score >= 0.75:
        return "high"
    elif score >= 0.45:
        return "medium"
    return "low"

"""Match route – IndicBERT-based MSE-to-SNP matching with multi-factor scoring."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import MSE, SNP, AuditLog, ClassificationResult, MatchResult, get_db
from services.matcher import compute_match_scores
from services.explainer import generate_explainer

router = APIRouter()


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
    factors: FactorBreakdown
    explainer_en: str
    explainer_hi: str


class MatchResponse(BaseModel):
    mse_id: int
    mse_name: str
    predicted_domain: Optional[str]
    matches: list[MatchItem]


@router.post("/", response_model=MatchResponse)
def match_mse_to_snps(payload: MatchRequest, db: Session = Depends(get_db)):
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
        )
        db.add(result)

        items.append(MatchItem(
            snp_id=snp.id,
            snp_name=snp.name,
            composite_score=round(m["composite"], 4),
            confidence_band=band,
            factors=FactorBreakdown(
                domain_score=round(m["domain"], 4),
                geo_score=round(m["geo"], 4),
                commission_score=round(m["commission"], 4),
                history_score=round(m["history"], 4),
                sentiment_score=round(m["sentiment"], 4),
            ),
            explainer_en=explainer["en"],
            explainer_hi=explainer["hi"],
        ))

    db.add(AuditLog(
        action="mse_matched",
        entity_type="mse",
        entity_id=mse.id,
        details=f"Matched to {len(items)} SNPs, top={items[0].snp_name if items else 'none'}",
        performed_by="indicbert-v1",
    ))
    db.commit()

    return MatchResponse(
        mse_id=mse.id,
        mse_name=mse.name,
        predicted_domain=predicted_domain,
        matches=items,
    )


def _confidence_band(score: float) -> str:
    """Route score to Green / Yellow / Red confidence band."""
    if score >= 0.85:
        return "green"
    elif score >= 0.60:
        return "yellow"
    return "red"

"""Claim-Verification Copilot — NSIC officer tooling for MSME TEAM incentive claims.

The TEAM scheme pays Seller Network Participants milestone incentives per
onboarded MSE (Rs 450 digital-marketing; catalogue at Rs 50/SKU up to 50 B2C
or Rs 125/SKU up to 20 B2B, capped Rs 2,500; account management up to
Rs 5,000 transaction-linked). NSIC verifies every claim manually today — the
exact pain IndiaAI PS2 names ("labour-intensive claim verification").

Claims live in the `snp_claims` table. Demo rows are stamped
`source=simulated-claims-demo`; a future TEAM-portal feed writes the same
table with its own source tag. The rule engine below automates the officer's
documented checklist and risk-scores each claim for review-by-exception
(precedents: GSTN BIFA risk scoring, Udyam PAN/GST auto-validation,
income-tax faceless risk allocation). Decisions are persisted on the claim
row AND in the immutable audit trail — the human officer stays the authority.
"""

import json
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from database import AuditLog, ClassificationResult, SNPClaim, get_db
from services.auth import User, require_admin

router = APIRouter()

UDYAM_RE = re.compile(r"^UDYAM-[A-Z]{2}-\d{2}-\d{7}$")

# TEAM SOP incentive parameters (public scheme guidelines)
RATE_ONBOARDING = 450
RATE_SKU_B2C, CAP_SKU_B2C = 50, 50
RATE_SKU_B2B, CAP_SKU_B2B = 125, 20
CAP_CATALOGUE = 2500


class RuleCheck(BaseModel):
    rule: str
    label: str
    passed: bool
    note: str


def compute_amount(claim: SNPClaim) -> int:
    """The scheme's own arithmetic — the officer's reference figure."""
    if claim.claim_type == "onboarding":
        return RATE_ONBOARDING
    if claim.channel == "B2B":
        return min(min(claim.sku_count, CAP_SKU_B2B) * RATE_SKU_B2B, CAP_CATALOGUE)
    return min(min(claim.sku_count, CAP_SKU_B2C) * RATE_SKU_B2C, CAP_CATALOGUE)


def verify_claim(
    claim: SNPClaim,
    mse_claim_counts: dict[int, int],
    classified_ids: set[int],
) -> dict:
    """Run the documented NSIC checklist on one stored claim."""
    m, s = claim.mse, claim.snp
    checks: list[RuleCheck] = []

    udyam_ok = bool(m.udyam_number and UDYAM_RE.match(m.udyam_number))
    checks.append(RuleCheck(
        rule="udyam_valid", label="Udyam number format valid",
        passed=udyam_ok, note=m.udyam_number or "missing",
    ))

    size_ok = (m.turnover_band or "micro") in ("micro", "small")
    checks.append(RuleCheck(
        rule="micro_small", label="Enterprise is Micro or Small",
        passed=size_ok, note=(m.turnover_band or "micro").capitalize(),
    ))

    act = (m.major_activity or "Manufacturing").capitalize()
    act_ok = act in ("Manufacturing", "Services")
    checks.append(RuleCheck(
        rule="activity", label="Major activity Manufacturing/Services",
        passed=act_ok, note=act,
    ))

    dup = mse_claim_counts.get(claim.mse_id, 1) > 1
    checks.append(RuleCheck(
        rule="one_snp", label="No other SNP has claimed this MSE",
        passed=not dup,
        note="Duplicate claim detected across SNPs" if dup else "Unique across network",
    ))

    live = claim.mse_id in classified_ids
    checks.append(RuleCheck(
        rule="catalogue_live", label="Catalogue live on ONDC (observability)",
        passed=live,
        note="on_search returns items" if live else "No live catalogue evidence yet",
    ))

    if claim.claim_type == "catalogue":
        cap = CAP_SKU_B2B if claim.channel == "B2B" else CAP_SKU_B2C
        checks.append(RuleCheck(
            rule="sku_cap", label=f"SKU count within {claim.channel} cap ({cap})",
            passed=claim.sku_count <= cap, note=f"{claim.sku_count} SKUs claimed",
        ))

    computed = compute_amount(claim)
    amt_ok = claim.claimed_amount <= computed
    checks.append(RuleCheck(
        rule="amount", label="Claimed amount within scheme computation",
        passed=amt_ok,
        note=f"claimed ₹{claim.claimed_amount:,} vs computed ₹{computed:,}",
    ))

    anomalies: list[str] = []
    if claim.claim_type == "catalogue" and claim.sku_count in (CAP_SKU_B2C, CAP_SKU_B2B):
        anomalies.append("SKU count sits exactly at the incentive cap")
    if dup:
        anomalies.append("Same MSE claimed by more than one SNP")
    if not live:
        anomalies.append("Catalogue not observable on the network")
    if not amt_ok:
        anomalies.append("Over-billing beyond the scheme cap")
    if s.geo_coverage and m.state and "pan india" not in s.geo_coverage.lower() \
            and m.state.lower() not in s.geo_coverage.lower():
        anomalies.append("MSE state outside SNP's declared coverage")

    failed = sum(1 for c in checks if not c.passed)
    risk = min(1.0, failed * 0.22 + len(anomalies) * 0.12)
    band = "green" if risk < 0.2 else "yellow" if risk < 0.55 else "red"

    return {
        "claim_id": claim.claim_ref,
        "claim_type": claim.claim_type,
        "mse_id": claim.mse_id,
        "mse_name": m.name,
        "udyam_number": m.udyam_number or "",
        "state": m.state,
        "snp_id": claim.snp_id,
        "snp_name": s.name,
        "channel": claim.channel,
        "sku_count": claim.sku_count,
        "claimed_amount": claim.claimed_amount,
        "computed_amount": computed,
        "submitted_at": (claim.submitted_at or claim.created_at or datetime.utcnow()).isoformat(),
        "checks": [c.model_dump() for c in checks],
        "passed_all": failed == 0,
        "risk_score": round(risk, 2),
        "risk_band": band,
        "anomalies": anomalies,
        "decision": None if claim.status == "pending" else (
            "approve" if claim.status == "approved" else "flag"
        ),
        "decided_by": claim.decided_by,
        "source": claim.source,
    }


@router.get("/queue")
def claim_queue(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    rows = (
        db.query(SNPClaim)
        .options(joinedload(SNPClaim.mse), joinedload(SNPClaim.snp))
        .order_by(SNPClaim.submitted_at.desc())
        .limit(200)
        .all()
    )
    if not rows:
        return {
            "source": "empty",
            "note": "No claims in the queue yet.",
            "stats": {"total": 0, "pending": 0, "auto_clearable": 0,
                      "flagged_red": 0, "amount_pending": 0, "amount_at_risk": 0},
            "claims": [],
        }

    # Cross-claim context needed by the rules
    counts: dict[int, int] = {}
    for r in rows:
        counts[r.mse_id] = counts.get(r.mse_id, 0) + 1
    classified_ids = {
        c[0]
        for c in db.query(ClassificationResult.mse_id)
        .filter(ClassificationResult.mse_id.in_(list(counts)))
        .all()
    }

    claims = [verify_claim(r, counts, classified_ids) for r in rows]
    claims.sort(key=lambda c: (c["decision"] is not None, -c["risk_score"]))

    pending = [c for c in claims if not c["decision"]]
    demo = all(c["source"] == "simulated-claims-demo" for c in claims)
    return {
        "source": "simulated-claims-demo" if demo else "mixed",
        "note": (
            "Deterministic demo queue seeded from registered MSEs + real registry "
            "SNPs — pending TEAM portal claims-feed integration."
            if demo else ""
        ),
        "stats": {
            "total": len(claims),
            "pending": len(pending),
            "auto_clearable": sum(1 for c in pending if c["risk_band"] == "green" and c["passed_all"]),
            "flagged_red": sum(1 for c in pending if c["risk_band"] == "red"),
            "amount_pending": sum(c["claimed_amount"] for c in pending),
            "amount_at_risk": sum(c["claimed_amount"] for c in pending if c["risk_band"] == "red"),
        },
        "claims": claims,
    }


class DecideBody(BaseModel):
    claim_id: str
    decision: str  # approve | flag
    note: Optional[str] = None


@router.post("/decide")
def decide_claim(
    body: DecideBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    if body.decision not in ("approve", "flag"):
        raise HTTPException(422, "decision must be approve or flag")
    claim = db.query(SNPClaim).filter(SNPClaim.claim_ref == body.claim_id).first()
    if not claim:
        raise HTTPException(404, "claim not found")
    if claim.status != "pending":
        raise HTTPException(409, f"claim already {claim.status}")

    claim.status = "approved" if body.decision == "approve" else "flagged"
    claim.decided_by = user.username
    claim.decided_at = datetime.utcnow()
    claim.decision_note = body.note

    db.add(AuditLog(
        action="claim_decision",
        entity_type="team_claim",
        entity_id=claim.id,
        details=json.dumps({
            "claim_id": claim.claim_ref,
            "decision": body.decision,
            "note": body.note or "",
        }),
        performed_by=user.username,
        created_at=datetime.utcnow(),
    ))
    db.commit()
    return {"ok": True, "claim_id": claim.claim_ref, "decision": body.decision}

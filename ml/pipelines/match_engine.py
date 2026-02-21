"""IndicBERT embedding & multi-factor scoring engine.

Generates dense embeddings using ai4bharat/IndicBERTv2-MLM-Sam-TLM for
MSE descriptions and SNP capability profiles, then computes the composite
matching score:

    M(mse, snp) = 0.35*D + 0.20*G + 0.15*C + 0.20*H + 0.10*S

Where D (Domain alignment) uses cosine similarity of IndicBERT embeddings.

Usage:
    python -m ml.pipelines.match_engine --mse_text "handloom sarees from Varanasi"
"""

import argparse
import logging
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)

INDICBERT_MODEL = "ai4bharat/IndicBERTv2-MLM-Sam-TLM"

# ── Weights ───────────────────────────────────────────────────────────

W_DOMAIN = 0.35
W_GEO = 0.20
W_COMMISSION = 0.15
W_HISTORY = 0.20
W_SENTIMENT = 0.10


@dataclass
class SNPProfile:
    """Structured SNP profile for scoring."""
    id: int
    name: str
    description: str
    domains: list[str]
    geo_states: list[str]
    commission_pct: float
    rating: float
    support_level: str  # full / partial / none
    languages: list[str]


@dataclass
class MatchScore:
    """Full score breakdown for one MSE–SNP pair."""
    snp_id: int
    snp_name: str
    composite: float
    domain: float
    geo: float
    commission: float
    history: float
    sentiment: float
    band: str


class MatchEngine:
    """Embedding-based MSE-to-SNP matcher."""

    def __init__(self, model_name: str = INDICBERT_MODEL, device: str = "cpu"):
        self._model_name = model_name
        self._device = device
        self._model = None
        self._tokenizer = None

    def _load_model(self):
        if self._model is not None:
            return
        try:
            from transformers import AutoModel, AutoTokenizer
            import torch

            logger.info(f"Loading IndicBERT: {self._model_name}")
            self._tokenizer = AutoTokenizer.from_pretrained(self._model_name)
            self._model = AutoModel.from_pretrained(self._model_name).to(self._device)
            self._model.eval()
        except ImportError:
            logger.warning("transformers not installed — using mock embeddings")
            self._model = "mock"

    def embed(self, text: str) -> np.ndarray:
        """Get mean-pooled embedding for a text string."""
        self._load_model()

        if self._model == "mock":
            rng = np.random.default_rng(hash(text) % (2**31))
            vec = rng.standard_normal(768).astype(np.float32)
            return vec / np.linalg.norm(vec)

        import torch

        inputs = self._tokenizer(
            text, return_tensors="pt", truncation=True, max_length=128, padding=True
        ).to(self._device)

        with torch.no_grad():
            outputs = self._model(**inputs)

        # Mean pooling over token dimension
        mask = inputs["attention_mask"].unsqueeze(-1).float()
        pooled = (outputs.last_hidden_state * mask).sum(dim=1) / mask.sum(dim=1)
        vec = pooled.squeeze().cpu().numpy()
        return vec / np.linalg.norm(vec)

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b))

    def score(
        self,
        mse_text: str,
        mse_state: str,
        mse_lang: str,
        snp: SNPProfile,
    ) -> MatchScore:
        """Compute the multi-factor match score for one MSE–SNP pair."""
        # D — Domain alignment via embedding similarity
        mse_emb = self.embed(mse_text)
        snp_emb = self.embed(snp.description)
        d = max(self.cosine_similarity(mse_emb, snp_emb), 0.0)

        # G — Geographic proximity
        if mse_state.lower() in [s.lower() for s in snp.geo_states]:
            g = 1.0
        elif "pan-india" in [s.lower() for s in snp.geo_states]:
            g = 0.4
        else:
            g = 0.2

        # C — Commission competitiveness (lower = better)
        c = max(1.0 - (snp.commission_pct / 15.0), 0.0)

        # H — Historical performance (rating / 5)
        h = min(snp.rating / 5.0, 1.0)

        # S — Sentiment / support quality
        support_map = {"full": 1.0, "partial": 0.5, "none": 0.1}
        support = support_map.get(snp.support_level, 0.1)
        lang_match = 1.0 if mse_lang.lower() in [l.lower() for l in snp.languages] else 0.3
        s = 0.6 * support + 0.4 * lang_match

        composite = W_DOMAIN * d + W_GEO * g + W_COMMISSION * c + W_HISTORY * h + W_SENTIMENT * s

        band = "green" if composite >= 0.85 else "yellow" if composite >= 0.60 else "red"

        return MatchScore(
            snp_id=snp.id,
            snp_name=snp.name,
            composite=round(composite, 4),
            domain=round(d, 4),
            geo=round(g, 4),
            commission=round(c, 4),
            history=round(h, 4),
            sentiment=round(s, 4),
            band=band,
        )

    def rank(
        self,
        mse_text: str,
        mse_state: str,
        mse_lang: str,
        snps: list[SNPProfile],
        top_k: int = 5,
    ) -> list[MatchScore]:
        """Score and rank all SNPs for a given MSE, return top-k."""
        scores = [self.score(mse_text, mse_state, mse_lang, snp) for snp in snps]
        scores.sort(key=lambda s: s.composite, reverse=True)
        return scores[:top_k]


def main():
    parser = argparse.ArgumentParser(description="IndicBERT match engine")
    parser.add_argument("--mse_text", type=str, required=True)
    parser.add_argument("--mse_state", type=str, default="Maharashtra")
    parser.add_argument("--mse_lang", type=str, default="en")
    parser.add_argument("--device", type=str, default="cpu")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    # Demo SNPs
    demo_snps = [
        SNPProfile(1, "TextileHub India", "Fashion garments and sarees marketplace", ["RET12"], ["Maharashtra", "Gujarat"], 3.5, 4.2, "full", ["en", "hi"]),
        SNPProfile(2, "KiranaKart", "Grocery and daily essentials delivery", ["RET10"], ["Pan-India"], 5.0, 3.8, "partial", ["en", "hi"]),
        SNPProfile(3, "CraftBazaar", "Handicrafts and home decor platform", ["RET16"], ["Rajasthan", "UP"], 4.0, 4.5, "full", ["en", "hi", "ta"]),
    ]

    engine = MatchEngine(device=args.device)
    results = engine.rank(args.mse_text, args.mse_state, args.mse_lang, demo_snps)

    for r in results:
        print(f"\n#{r.snp_id} {r.snp_name} — {r.band.upper()} ({r.composite:.2%})")
        print(f"  D={r.domain:.2f} G={r.geo:.2f} C={r.commission:.2f} H={r.history:.2f} S={r.sentiment:.2f}")


if __name__ == "__main__":
    main()

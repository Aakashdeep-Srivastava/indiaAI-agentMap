# AgentMap AI

**Sovereign AI mapping layer for ONDC MSE-to-SNP onboarding**

Built for the **IndiaAI Innovation Challenge 2026** (Problem Statement 2) — an AI-native system that classifies Micro/Small Enterprises into ONDC domains and matches them with the best Seller Network Participants using multi-factor scoring.

---

## Sovereign AI Rationale

This project is **Sovereign-Ready** and compliant with the **DPDP Act 2023**:

| Principle | Implementation |
|-----------|---------------|
| No foreign-hosted LLM APIs | All AI models (MuRIL, IndicBERT, Llama 3.1 8B) are self-hosted open-weights |
| Indian-origin services | Sarvam AI for voice ASR and translation |
| Data residency | PostgreSQL hosted on Indian infrastructure, no data leaves Indian jurisdiction |
| Explainability | Every match generates vernacular explainers (EN/HI) for Responsible AI |
| Audit trail | Immutable audit logs for all classification and matching decisions |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                         │
│   Dashboard  │  MSE Registration  │  NSIC Review  │  Audit     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
┌──────────────────────────┴──────────────────────────────────────┐
│                       FastAPI Backend                            │
│   /mse  │  /classify (MuRIL)  │  /match (IndicBERT Scoring)    │
│                    Services Layer                                │
│   Classifier  │  Matcher  │  Explainer  │  Audit Logger         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
    │ PostgreSQL │   │   Redis   │   │ ML Models │
    │  (Data)    │   │  (Cache)  │   │ (MuRIL +  │
    │            │   │           │   │ IndicBERT)│
    └───────────┘   └───────────┘   └───────────┘
```

## Scoring Formula

```
M(mse, snp) = 0.35·D + 0.20·G + 0.15·C + 0.20·H + 0.10·S
```

| Factor | Weight | Description |
|--------|--------|-------------|
| **D** — Domain | 0.35 | IndicBERT cosine similarity between MSE description and SNP capability embeddings |
| **G** — Geo | 0.20 | Geographic proximity (district > state > national) |
| **C** — Commission | 0.15 | Commission competitiveness (lower is better for MSE) |
| **H** — History | 0.20 | SNP historical rating and performance |
| **S** — Sentiment | 0.10 | Onboarding support quality + language match |

### Confidence Bands

| Band | Score Range | Action |
|------|-------------|--------|
| Green | >= 0.85 | Auto-recommend to MSE |
| Yellow | 0.60 – 0.85 | Present with caveats, NSIC review optional |
| Red | < 0.60 | Flag for manual NSIC review |

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend/ML dev)

### Run with Docker

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Local Development

**Backend:**
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd apps/web
npm install
npm run dev
```

**ML Training (optional):**
```bash
cd ml
pip install -r requirements.txt

# Train MuRIL classifier with synthetic data
python -m ml.pipelines.train_vargbot --epochs 5

# Run baseline evaluation
python -m ml.evaluation.baseline

# Test match engine
python -m ml.pipelines.match_engine --mse_text "handloom cotton sarees from Varanasi"
```

---

## Project Structure

```
agentmap-ai/
├── apps/
│   ├── web/                    # Next.js Frontend
│   │   ├── app/
│   │   │   ├── (dashboard)/    # Admin & NSIC review views
│   │   │   ├── register/       # Voice-simulated onboarding
│   │   │   └── layout.tsx      # Government-themed UI
│   │   └── components/
│   │       ├── SNPCard.tsx      # Match card with factor breakdowns
│   │       └── ConfidenceBadge.tsx
│   └── api/                    # FastAPI Backend
│       ├── routes/             # /mse, /classify, /match
│       ├── services/           # Scoring logic & Sarvam/Llama mocks
│       └── database.py         # SQLAlchemy models
├── ml/                         # Machine Learning Core
│   ├── pipelines/
│   │   ├── train_vargbot.py    # MuRIL fine-tuning (LoRA)
│   │   └── match_engine.py     # IndicBERT embedding & scoring
│   └── evaluation/
│       ├── baseline.py         # Rule-based vs AI benchmark
│       └── metrics.py          # NDCG@3, MRR, Accuracy
├── infra/
│   └── init.sql                # Seed data (50 SNPs, 20 MSEs)
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/mse/` | Register a new MSE |
| `GET` | `/mse/` | List MSEs (with state filter) |
| `GET` | `/mse/{id}` | Get MSE by ID |
| `POST` | `/classify/` | Classify MSE into ONDC domain (MuRIL) |
| `POST` | `/match/` | Find top-k SNP matches (IndicBERT scoring) |

---

## Evaluation Metrics

| Metric | Target (Phase 1) | Description |
|--------|-------------------|-------------|
| Accuracy@1 | > 0.70 | Top-1 classification accuracy |
| Accuracy@3 | > 0.90 | Correct domain in top-3 predictions |
| MRR | > 0.75 | Mean Reciprocal Rank for matching |
| NDCG@3 | > 0.80 | Normalised DCG for ranked match quality |

---

## Tech Stack

- **Frontend:** Next.js 15, Tailwind CSS, Framer Motion
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL 16, Redis 7
- **AI Models:** MuRIL (LoRA fine-tuned), IndicBERT, Llama 3.1 8B
- **ML:** PyTorch, HuggingFace Transformers, PEFT, sentence-transformers
- **Infra:** Docker Compose, with Kubernetes-ready architecture

---

## License

Built for the IndiaAI Innovation Challenge 2026. All rights reserved.

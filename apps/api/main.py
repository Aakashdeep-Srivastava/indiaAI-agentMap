"""AgentMap AI – FastAPI Application Entry Point."""

import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.mse import router as mse_router
from routes.classify import router as classify_router
from routes.match import router as match_router
from routes.health import router as health_router
from routes.stt import router as stt_router
from routes.ocr import router as ocr_router
from routes.tts import router as tts_router
from routes.domains import router as domains_router
from routes.audit import router as audit_router
from routes.ner import router as ner_router
from services.auth import get_current_user, require_admin
from services.classifier import init_classifier
from services.ratelimit import rate_limit_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    init_classifier()
    yield


app = FastAPI(
    title="AgentMap AI",
    description="Sovereign AI mapping layer for ONDC MSE-to-SNP matching",
    version="0.1.0",
    lifespan=lifespan,
)

_default_origins = "http://localhost:3000,http://localhost:3001"
_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sliding-window rate limits: login brute-force + LLM proxy quota protection.
app.middleware("http")(rate_limit_middleware)

# Dependency bundles: authed = any valid token; admin_only = NSIC admins.
authed = [Depends(get_current_user)]
admin_only = [Depends(require_admin)]

# ── Public (no token) ──────────────────────────────────────────────────
app.include_router(health_router, tags=["Health"])           # load balancer probe
app.include_router(auth_router, prefix="/auth", tags=["Auth"])  # login / me
app.include_router(domains_router, prefix="/domains", tags=["Domains"])  # public taxonomy

# ── Authenticated (valid signed token required) ─────────────────────────
app.include_router(mse_router, prefix="/mse", tags=["MSE"], dependencies=authed)
app.include_router(classify_router, prefix="/classify", tags=["Classification"], dependencies=authed)
app.include_router(match_router, prefix="/match", tags=["Matching"], dependencies=authed)
app.include_router(stt_router, prefix="/stt", tags=["STT"], dependencies=authed)
app.include_router(ocr_router, prefix="/ocr", tags=["OCR"], dependencies=authed)
app.include_router(tts_router, prefix="/tts", tags=["TTS"], dependencies=authed)
app.include_router(ner_router, prefix="/ner", tags=["NER"], dependencies=authed)

# ── Admin only (NSIC oversight) ─────────────────────────────────────────
app.include_router(audit_router, prefix="/audit", tags=["Audit"], dependencies=admin_only)

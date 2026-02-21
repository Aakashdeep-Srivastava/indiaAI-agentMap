"""AgentMap AI – FastAPI Application Entry Point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.mse import router as mse_router
from routes.classify import router as classify_router
from routes.match import router as match_router
from routes.health import router as health_router

app = FastAPI(
    title="AgentMap AI",
    description="Sovereign AI mapping layer for ONDC MSE-to-SNP matching",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, tags=["Health"])
app.include_router(mse_router, prefix="/mse", tags=["MSE"])
app.include_router(classify_router, prefix="/classify", tags=["Classification"])
app.include_router(match_router, prefix="/match", tags=["Matching"])

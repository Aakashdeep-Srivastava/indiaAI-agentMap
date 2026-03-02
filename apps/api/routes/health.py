"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "service": "agentmap-ai", "version": "0.1.0"}


@router.get("/health/gemini")
def gemini_status():
    """Show Gemini API rate limit usage across all services (STT + NER)."""
    from services.gemini_limiter import gemini_limiter
    return {"gemini_usage": gemini_limiter.status()}

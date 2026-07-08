"""Sliding-window rate limiting — protects login and the LLM-backed endpoints.

Zero-dependency, in-memory per worker. Buckets:
- login:   brute-force guard on /auth/login (per client IP)
- llm:     endpoints that proxy to paid/quota'd AI services (per token, else IP)
- default: everything else (per token, else IP)

Limits are env-tunable. For multi-worker deployments move the counters to
Redis (REDIS_URL is already provisioned) — the interface below stays the same.
"""

import os
import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse

WINDOW_SECONDS = 60

LOGIN_LIMIT = int(os.getenv("RATE_LIMIT_LOGIN", "10"))      # per IP / min
# Voice sessions burst (each turn = STT + NER + TTS), so keep real headroom.
LLM_LIMIT = int(os.getenv("RATE_LIMIT_LLM", "60"))          # per user / min
DEFAULT_LIMIT = int(os.getenv("RATE_LIMIT_DEFAULT", "120")) # per user / min

# Path prefixes that proxy to external AI services (Sarvam / NVIDIA quotas).
LLM_PREFIXES = ("/classify", "/match", "/ner", "/stt", "/tts", "/ocr")

_hits: dict[str, deque] = defaultdict(deque)


def _client_key(request: Request) -> str:
    """Prefer the bearer token (per-user) over the client IP (shared NATs)."""
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer ") and len(auth) > 24:
        return f"tok:{auth[-24:]}"
    fwd = request.headers.get("x-forwarded-for")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "?")
    return f"ip:{ip}"


def _bucket(path: str) -> tuple[str, int]:
    if path.startswith("/auth/login"):
        return "login", LOGIN_LIMIT
    if path.startswith(LLM_PREFIXES):
        return "llm", LLM_LIMIT
    return "default", DEFAULT_LIMIT


async def rate_limit_middleware(request: Request, call_next):
    if request.method == "OPTIONS":  # CORS preflight
        return await call_next(request)

    bucket, limit = _bucket(request.url.path)
    key = f"{bucket}:{_client_key(request)}"
    now = time.monotonic()

    q = _hits[key]
    while q and now - q[0] > WINDOW_SECONDS:
        q.popleft()

    if len(q) >= limit:
        retry_after = max(1, int(WINDOW_SECONDS - (now - q[0])))
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests — please slow down and retry shortly."},
            headers={"Retry-After": str(retry_after)},
        )

    q.append(now)
    return await call_next(request)

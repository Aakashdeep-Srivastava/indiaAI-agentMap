"""Shared Redis client (Upstash TLS) — used for login lockout and rate limiting.

Redis was provisioned but previously unused. It is the backbone for anything
that must be consistent across multiple uvicorn workers / pods: login attempt
limiting, API rate limits, and short-lived caches.

Fails soft: if Redis is unreachable, callers get None and must decide their
own fallback (login limiting fails open so users are never locked out by an
infra outage, but the event is logged loudly).
"""

import logging
import os

import redis

logger = logging.getLogger(__name__)

_client: redis.Redis | None = None
_checked = False


def get_redis() -> redis.Redis | None:
    """Return a live Redis client, or None if unavailable."""
    global _client, _checked

    if _client is not None:
        return _client

    url = os.getenv("REDIS_URL")
    if not url:
        if not _checked:
            logger.warning("REDIS_URL not set — login limiting / rate limits disabled")
            _checked = True
        return None

    try:
        client = redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
            retry_on_timeout=True,
        )
        client.ping()
        _client = client
        logger.info("Redis connected")
        return _client
    except Exception as e:
        logger.error(f"Redis unavailable ({e}) — degrading to no-op limiter")
        return None

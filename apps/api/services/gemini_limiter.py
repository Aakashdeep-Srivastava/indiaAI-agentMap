"""Shared Gemini API rate limiter.

Free-tier limits (as of March 2026):
  - gemini-2.5-flash:  5 RPM, 250K TPM, 20 RPD
  - gemini-2.0-flash:  varies (may be 0 on some plans)
  - gemini-2.0-flash-lite: varies

Both STT and NER share this limiter since they share the same API key/quota.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Per-model limits (free tier defaults — adjust via env if needed)
MODEL_LIMITS: dict[str, dict[str, int]] = {
    "gemini-2.5-flash":      {"rpm": 5,  "rpd": 20},
    "gemini-2.5-pro":        {"rpm": 5,  "rpd": 20},
    "gemini-2.0-flash":      {"rpm": 10, "rpd": 500},
    "gemini-2.0-flash-lite": {"rpm": 15, "rpd": 1000},
}


@dataclass
class _ModelTracker:
    """Track calls for a single model."""
    minute_calls: list[float] = field(default_factory=list)
    day_start: float = field(default_factory=time.time)
    day_count: int = 0

    def _prune_minute(self):
        now = time.time()
        self.minute_calls = [t for t in self.minute_calls if now - t < 60]

    def _check_day_reset(self):
        now = time.time()
        if now - self.day_start >= 86400:
            self.day_start = now
            self.day_count = 0

    def rpm_count(self) -> int:
        self._prune_minute()
        return len(self.minute_calls)

    def rpd_count(self) -> int:
        self._check_day_reset()
        return self.day_count

    def seconds_until_rpm_slot(self) -> float:
        """How many seconds until the oldest minute-window call expires."""
        self._prune_minute()
        if not self.minute_calls:
            return 0.0
        oldest = self.minute_calls[0]
        wait = 60.0 - (time.time() - oldest)
        return max(0.0, wait)

    def record(self):
        self.minute_calls.append(time.time())
        self._check_day_reset()
        self.day_count += 1


class GeminiRateLimiter:
    """Thread-safe rate limiter for Gemini API calls across all services."""

    def __init__(self):
        self._trackers: dict[str, _ModelTracker] = {}
        self._lock = asyncio.Lock()

    def _get_tracker(self, model: str) -> _ModelTracker:
        if model not in self._trackers:
            self._trackers[model] = _ModelTracker()
        return self._trackers[model]

    async def acquire(self, model: str, max_wait: float = 5.0) -> bool:
        """Try to acquire a slot for the model. Waits up to max_wait seconds.

        Returns True if a slot was acquired, False if rate-limited.
        """
        limits = MODEL_LIMITS.get(model, {"rpm": 5, "rpd": 20})

        async with self._lock:
            tracker = self._get_tracker(model)

            # Check daily limit first
            if tracker.rpd_count() >= limits["rpd"]:
                logger.warning(
                    f"Gemini {model}: daily limit exhausted "
                    f"({tracker.rpd_count()}/{limits['rpd']} RPD)"
                )
                return False

            # Check per-minute limit
            if tracker.rpm_count() < limits["rpm"]:
                tracker.record()
                logger.debug(
                    f"Gemini {model}: slot acquired "
                    f"(RPM: {tracker.rpm_count()}/{limits['rpm']}, "
                    f"RPD: {tracker.rpd_count()}/{limits['rpd']})"
                )
                return True

            # RPM full — check if we can wait
            wait = tracker.seconds_until_rpm_slot()
            if wait > max_wait:
                logger.info(
                    f"Gemini {model}: RPM full, need {wait:.1f}s wait (max {max_wait}s) — skipping"
                )
                return False

        # Wait outside the lock so other calls aren't blocked
        if wait > 0:
            logger.info(f"Gemini {model}: RPM full, waiting {wait:.1f}s for slot...")
            await asyncio.sleep(wait + 0.1)

        async with self._lock:
            tracker = self._get_tracker(model)
            tracker.record()
            return True

    def status(self) -> dict[str, dict[str, int]]:
        """Return current usage for all tracked models."""
        result = {}
        for model, tracker in self._trackers.items():
            limits = MODEL_LIMITS.get(model, {"rpm": 5, "rpd": 20})
            result[model] = {
                "rpm_used": tracker.rpm_count(),
                "rpm_limit": limits["rpm"],
                "rpd_used": tracker.rpd_count(),
                "rpd_limit": limits["rpd"],
            }
        return result

    def mark_429(self, model: str):
        """Called when we get a 429 despite our tracking (clock drift, etc).
        Records an extra call so we back off faster.
        """
        tracker = self._get_tracker(model)
        tracker.record()
        logger.warning(f"Gemini {model}: got 429, added penalty to tracker")


# Singleton shared across all services
gemini_limiter = GeminiRateLimiter()

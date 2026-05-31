"""In-process LLM strategy parse rate limit — 5 req / min per user."""

from __future__ import annotations

import time
from collections import defaultdict

from app.schemas.errors import ApiError, ApiErrorCode

_WINDOW_SEC = 60
_MAX_PER_WINDOW = 5
_buckets: dict[str, list[float]] = defaultdict(list)


def check_llm_rate_limit(user_id: str) -> None:
    now = time.monotonic()
    window_start = now - _WINDOW_SEC
    hits = [t for t in _buckets[user_id] if t > window_start]
    if len(hits) >= _MAX_PER_WINDOW:
        raise ApiError(
            ApiErrorCode.STRATEGY_RATE_LIMIT,
            "LLM strategy parsing limit exceeded (5 per minute)",
        )
    hits.append(now)
    _buckets[user_id] = hits


def reset_rate_limits_for_tests() -> None:
    _buckets.clear()

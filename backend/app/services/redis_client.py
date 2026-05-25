"""Shared async Redis client for cache / nonce / rate limit."""

from __future__ import annotations

import redis.asyncio as aioredis

from app.config import settings

_client: aioredis.Redis | None = None


def redis_configured() -> bool:
    return bool(settings.redis_url.strip())


async def get_redis() -> aioredis.Redis:
    if not redis_configured():
        raise RuntimeError("REDIS_URL is not configured")
    global _client
    if _client is None:
        _client = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _client


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None

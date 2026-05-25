"""Server-issued login nonce stored in Redis (one-time, TTL 300s)."""

from __future__ import annotations

import secrets
from typing import NamedTuple

from app.config import settings
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.redis_client import get_redis, redis_configured

NONCE_PREFIX = "auth:nonce:"
NONCE_MESSAGE_TEMPLATE = "TradingPanda:login:{nonce}"


class IssuedNonce(NamedTuple):
    nonce: str
    message: str
    expires_in: int


def _redis_key(nonce: str) -> str:
    return f"{NONCE_PREFIX}{nonce}"


async def issue_nonce(wallet_address: str | None = None) -> IssuedNonce:
    if not redis_configured():
        raise ApiError(
            ApiErrorCode.SERVICE_UNAVAILABLE,
            "Auth nonce store requires REDIS_URL",
        )
    client = await get_redis()
    ttl = settings.auth_nonce_ttl_seconds
    for _ in range(5):
        nonce = secrets.token_urlsafe(24)
        key = _redis_key(nonce)
        payload = (wallet_address or "").strip().lower()
        if await client.set(key, payload, nx=True, ex=ttl):
            return IssuedNonce(
                nonce=nonce,
                message=NONCE_MESSAGE_TEMPLATE.format(nonce=nonce),
                expires_in=ttl,
            )
    raise ApiError(ApiErrorCode.INTERNAL_ERROR, "Failed to issue auth nonce")


async def consume_nonce(nonce: str, wallet_address: str) -> None:
    if not redis_configured():
        raise ApiError(
            ApiErrorCode.SERVICE_UNAVAILABLE,
            "Auth nonce store requires REDIS_URL",
        )
    token = (nonce or "").strip()
    if not token:
        raise ApiError(ApiErrorCode.AUTH_INVALID_NONCE, "Nonce is required")

    client = await get_redis()
    key = _redis_key(token)
    stored = await client.getdel(key)
    if stored is None:
        raise ApiError(ApiErrorCode.AUTH_INVALID_NONCE, "Nonce is invalid or expired")

    expected_wallet = (wallet_address or "").strip().lower()
    if stored and stored != expected_wallet:
        raise ApiError(
            ApiErrorCode.AUTH_INVALID_NONCE,
            "Nonce was issued for a different wallet address",
        )

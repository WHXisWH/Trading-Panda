"""zkLogin id_token verification (Google OAuth)."""

from __future__ import annotations

from typing import Any

import httpx

from app.schemas.errors import ApiError, ApiErrorCode


async def verify_google_id_token(id_token: str, *, client_id: str | None = None) -> dict[str, Any]:
    """Validate Google id_token via tokeninfo endpoint."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )
    if res.status_code != 200:
        raise ApiError(
            ApiErrorCode.AUTH_INVALID_ID_TOKEN,
            "Google id_token verification failed",
        )
    claims: dict[str, Any] = res.json()
    if client_id and claims.get("aud") != client_id:
        raise ApiError(
            ApiErrorCode.AUTH_INVALID_ID_TOKEN,
            "id_token audience does not match client",
        )
    sub = claims.get("sub")
    if not sub:
        raise ApiError(ApiErrorCode.AUTH_INVALID_ID_TOKEN, "id_token missing sub")
    return claims

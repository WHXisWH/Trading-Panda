"""JWT access + refresh token helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt

from app.config import settings

ACCESS_TOKEN_HOURS = 24
REFRESH_TOKEN_DAYS = 7


def _now() -> datetime:
    return datetime.now(timezone.utc)


def issue_access_token(
    user_id: str,
    wallet: str,
    auth_method: Literal["wallet", "zklogin"],
) -> tuple[str, int]:
    expires_in = ACCESS_TOKEN_HOURS * 3600
    exp = _now() + timedelta(seconds=expires_in)
    payload: dict[str, Any] = {
        "sub": user_id,
        "wallet": wallet,
        "auth_method": auth_method,
        "type": "access",
        "exp": exp,
        "iat": _now(),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token, expires_in


def issue_refresh_token(user_id: str, wallet: str) -> str:
    exp = _now() + timedelta(days=REFRESH_TOKEN_DAYS)
    payload: dict[str, Any] = {
        "sub": user_id,
        "wallet": wallet,
        "type": "refresh",
        "exp": exp,
        "iat": _now(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


def decode_access_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") == "refresh":
        raise jwt.InvalidTokenError("expected access token")
    return payload


def decode_refresh_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise jwt.InvalidTokenError("expected refresh token")
    return payload

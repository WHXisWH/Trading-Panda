"""Auth token helpers — Sprint 0.3 (HTTP flows covered in test_auth_wallet)."""

from __future__ import annotations

import jwt
import pytest

from app.schemas.auth import AuthConnectRequest


def test_connect_request_wallet_requires_signature_fields():
    with pytest.raises(ValueError):
        AuthConnectRequest(method="wallet", wallet_address="0xabc")


def test_refresh_token_roundtrip():
    from app.services.auth_tokens import decode_refresh_token, issue_refresh_token

    refresh = issue_refresh_token("user-refresh-1", "0xrefresh_wallet")
    payload = decode_refresh_token(refresh)
    assert payload["sub"] == "user-refresh-1"
    assert payload["type"] == "refresh"


def test_decode_access_token_rejects_refresh_type():
    from app.services.auth_tokens import decode_access_token, issue_refresh_token

    refresh = issue_refresh_token("u1", "0xw")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(refresh)

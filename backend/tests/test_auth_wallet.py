"""Wallet auth: nonce Redis + PersonalMessage verify — Sprint 0.3.1."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import jwt
import pytest

from app.schemas.errors import ApiError, ApiErrorCode
from app.services import nonce_store, wallet_verify
from app.services.auth_tokens import issue_refresh_token
from app.services.nonce_store import IssuedNonce

# Generated via @mysten/sui Ed25519Keypair.signPersonalMessage (see sprint 0.3.1 notes)
_FIXTURE_MESSAGE = "TradingPanda:login:test-nonce-001"
_FIXTURE_SIGNATURE = (
    "AFtUMurX/2cTyyCT8JtSBOiSx23ViIYDmiAdCdzyJoAhEBe9mIK2ALnGvK1Og2ucGyekyQWw3W1wxtYutaMRKgn1eMp1U5SLORhCFFVWfLz2mFvREiazMSjSAc/dqqeepg=="
)
_FIXTURE_ADDRESS = "0xf68377690e4166bd853e384e5bf28b4cfd772eabb3d6f744dc8b65ffc4e047de"


def test_verify_wallet_personal_message_valid():
    wallet_verify.verify_wallet_personal_message(
        message=_FIXTURE_MESSAGE,
        signature_b64=_FIXTURE_SIGNATURE,
        wallet_address=_FIXTURE_ADDRESS,
    )


def test_verify_wallet_invalid_signature():
    with pytest.raises(ApiError) as exc:
        wallet_verify.verify_wallet_personal_message(
            message=_FIXTURE_MESSAGE,
            signature_b64=_FIXTURE_SIGNATURE,
            wallet_address="0x" + "1" * 64,
        )
    assert exc.value.code == ApiErrorCode.AUTH_INVALID_SIGNATURE


def test_verify_wallet_wrong_message():
    with pytest.raises(ApiError) as exc:
        wallet_verify.verify_wallet_personal_message(
            message="TradingPanda:login:other",
            signature_b64=_FIXTURE_SIGNATURE,
            wallet_address=_FIXTURE_ADDRESS,
        )
    assert exc.value.code == ApiErrorCode.AUTH_INVALID_SIGNATURE


@pytest.mark.asyncio
async def test_issue_nonce_stores_key():
    mock_redis = AsyncMock()
    mock_redis.set = AsyncMock(return_value=True)

    with patch.object(nonce_store, "redis_configured", return_value=True), patch.object(
        nonce_store, "get_redis", AsyncMock(return_value=mock_redis)
    ), patch.object(nonce_store.settings, "auth_nonce_ttl_seconds", 300):
        result = await nonce_store.issue_nonce(_FIXTURE_ADDRESS)

    assert result.message.startswith("TradingPanda:login:")
    mock_redis.set.assert_called()
    key = mock_redis.set.call_args[0][0]
    assert key.startswith("auth:nonce:")


@pytest.mark.asyncio
async def test_consume_nonce_deletes_and_checks_wallet():
    mock_redis = AsyncMock()
    mock_redis.getdel = AsyncMock(return_value=_FIXTURE_ADDRESS.lower())

    with patch.object(nonce_store, "redis_configured", return_value=True), patch.object(
        nonce_store, "get_redis", AsyncMock(return_value=mock_redis)
    ):
        await nonce_store.consume_nonce("nonce-abc", _FIXTURE_ADDRESS)

    mock_redis.getdel.assert_called_once_with("auth:nonce:nonce-abc")


@pytest.mark.asyncio
async def test_consume_nonce_replay_fails():
    mock_redis = AsyncMock()
    mock_redis.getdel = AsyncMock(return_value=None)

    with patch.object(nonce_store, "redis_configured", return_value=True), patch.object(
        nonce_store, "get_redis", AsyncMock(return_value=mock_redis)
    ):
        with pytest.raises(ApiError) as exc:
            await nonce_store.consume_nonce("used-nonce", _FIXTURE_ADDRESS)
    assert exc.value.code == ApiErrorCode.AUTH_INVALID_NONCE


def test_decode_access_token_rejects_refresh_type():
    from app.services.auth_tokens import decode_access_token

    refresh = issue_refresh_token("u1", "0xw")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(refresh)

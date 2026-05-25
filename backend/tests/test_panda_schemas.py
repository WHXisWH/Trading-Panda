"""Panda mint schema contract tests — Epic 1.1."""

import pytest
from pydantic import ValidationError

from app.schemas.errors import ApiError, ApiErrorCode
from app.schemas.panda import PandaMintRequest


def test_mint_request_requires_chain_fields():
    req = PandaMintRequest(
        sui_object_id="0xabc",
        sui_tx_digest="7Jf8kL2m",
    )
    assert req.name is None


def test_mint_request_valid_name():
    req = PandaMintRequest(
        sui_object_id="0xabc",
        sui_tx_digest="digest",
        name="小竹",
    )
    assert req.name == "小竹"


def test_mint_request_invalid_name():
    with pytest.raises(ValidationError):
        PandaMintRequest(
            sui_object_id="0xabc",
            sui_tx_digest="digest",
            name="x" * 25,
        )


def test_validate_name_or_raise():
    req = PandaMintRequest.model_construct(
        sui_object_id="0xabc",
        sui_tx_digest="digest",
        name="!!!",
    )
    with pytest.raises(ApiError) as exc:
        req.validate_name_or_raise()
    assert exc.value.code == ApiErrorCode.PANDA_NAME_INVALID

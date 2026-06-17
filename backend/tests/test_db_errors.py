"""Database error mapping tests."""

from __future__ import annotations

import asyncio

import pytest
from sqlalchemy.exc import OperationalError

from app.schemas.errors import ApiError, ApiErrorCode
from app.services.db_errors import rethrow_db_error


def test_rethrow_db_error_maps_timeout():
    with pytest.raises(ApiError) as exc:
        rethrow_db_error(asyncio.TimeoutError())
    assert exc.value.code == ApiErrorCode.SERVICE_UNAVAILABLE


def test_rethrow_db_error_maps_sqlalchemy():
    with pytest.raises(ApiError) as exc:
        rethrow_db_error(OperationalError("stmt", {}, Exception("db down")))
    assert exc.value.code == ApiErrorCode.SERVICE_UNAVAILABLE

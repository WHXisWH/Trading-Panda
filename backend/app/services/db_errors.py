"""Map database connectivity failures to API errors."""

from __future__ import annotations

import asyncio

from sqlalchemy.exc import SQLAlchemyError

from app.schemas.errors import ApiError, ApiErrorCode


def raise_db_unavailable(exc: BaseException | None = None) -> None:
    message = "Database temporarily unavailable. Check DATABASE_URL or try again."
    if exc is not None:
        message = f"{message} ({type(exc).__name__})"
    raise ApiError(ApiErrorCode.SERVICE_UNAVAILABLE, message) from exc


def rethrow_db_error(exc: BaseException) -> None:
    if isinstance(exc, ApiError):
        raise exc
    if isinstance(exc, (SQLAlchemyError, asyncio.TimeoutError, OSError, ConnectionError)):
        raise_db_unavailable(exc)
    raise exc

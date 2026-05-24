"""Pydantic schemas — shared API contracts."""

from app.schemas.common import ErrorBody, ErrorResponse, PaginationMeta, SuccessResponse, error, success
from app.schemas.errors import ApiError, ApiErrorCode, HTTP_STATUS_BY_CODE
from app.schemas.strategy import (
  ParsedStrategyLayers,
  Philosophy,
  SignalRule,
  StrategyFeedRequest,
  StrategyValidateData,
)

__all__ = [
  "ApiError",
  "ApiErrorCode",
  "ErrorBody",
  "ErrorResponse",
  "HTTP_STATUS_BY_CODE",
  "PaginationMeta",
  "ParsedStrategyLayers",
  "Philosophy",
  "SignalRule",
  "StrategyFeedRequest",
  "StrategyValidateData",
  "SuccessResponse",
  "error",
  "success",
]

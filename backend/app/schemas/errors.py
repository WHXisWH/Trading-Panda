"""Unified API error codes — aligned with docs/api-specification.md §7."""

from __future__ import annotations

from enum import Enum
from typing import Any


class ApiErrorCode(str, Enum):
    # Generic
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"

    # Auth
    AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED"
    AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
    AUTH_INVALID_SIGNATURE = "AUTH_INVALID_SIGNATURE"
    AUTH_INVALID_NONCE = "AUTH_INVALID_NONCE"
    AUTH_INVALID_ID_TOKEN = "AUTH_INVALID_ID_TOKEN"
    AUTH_PROVIDER_NOT_SUPPORTED = "AUTH_PROVIDER_NOT_SUPPORTED"
    AUTH_MISSING_PARAMS = "AUTH_MISSING_PARAMS"
    AUTH_REFRESH_EXPIRED = "AUTH_REFRESH_EXPIRED"
    AUTH_REFRESH_INVALID = "AUTH_REFRESH_INVALID"
    AUTH_REFRESH_REVOKED = "AUTH_REFRESH_REVOKED"
    AUTH_USER_NOT_FOUND = "AUTH_USER_NOT_FOUND"
    SURVEY_ALREADY_SUBMITTED = "SURVEY_ALREADY_SUBMITTED"
    SURVEY_INVALID_FIELD = "SURVEY_INVALID_FIELD"

    # Panda
    PANDA_NOT_FOUND = "PANDA_NOT_FOUND"
    PANDA_NOT_OWNER = "PANDA_NOT_OWNER"
    PANDA_MINT_DISABLED = "PANDA_MINT_DISABLED"
    PANDA_MAX_SUPPLY = "PANDA_MAX_SUPPLY"
    PANDA_MINT_RATE_LIMIT = "PANDA_MINT_RATE_LIMIT"
    PANDA_TX_FAILED = "PANDA_TX_FAILED"
    PANDA_NAME_INVALID = "PANDA_NAME_INVALID"
    PANDA_NAME_PROFANITY = "PANDA_NAME_PROFANITY"
    PANDA_IS_TRADING = "PANDA_IS_TRADING"

    # Strategy
    STRATEGY_TEXT_TOO_SHORT = "STRATEGY_TEXT_TOO_SHORT"
    STRATEGY_TEXT_TOO_LONG = "STRATEGY_TEXT_TOO_LONG"
    STRATEGY_BODY_EMPTY = "STRATEGY_BODY_EMPTY"
    STRATEGY_NO_VALID_RULES = "STRATEGY_NO_VALID_RULES"
    STRATEGY_RULE_INVALID = "STRATEGY_RULE_INVALID"
    STRATEGY_PARSE_FAILED = "STRATEGY_PARSE_FAILED"
    STRATEGY_RATE_LIMIT = "STRATEGY_RATE_LIMIT"
    STRATEGY_NOT_FOUND = "STRATEGY_NOT_FOUND"

    # Simulation
    SIM_ALREADY_RUNNING = "SIM_ALREADY_RUNNING"
    SIM_NO_STRATEGY = "SIM_NO_STRATEGY"
    SIM_INVALID_SPEED = "SIM_INVALID_SPEED"
    SIM_NOT_RUNNING = "SIM_NOT_RUNNING"


HTTP_STATUS_BY_CODE: dict[ApiErrorCode, int] = {
    ApiErrorCode.INTERNAL_ERROR: 500,
    ApiErrorCode.VALIDATION_ERROR: 400,
    ApiErrorCode.NOT_FOUND: 404,
    ApiErrorCode.RATE_LIMIT_EXCEEDED: 429,
    ApiErrorCode.SERVICE_UNAVAILABLE: 503,
    ApiErrorCode.AUTH_UNAUTHORIZED: 401,
    ApiErrorCode.AUTH_TOKEN_EXPIRED: 401,
    ApiErrorCode.AUTH_INVALID_SIGNATURE: 401,
    ApiErrorCode.AUTH_INVALID_NONCE: 401,
    ApiErrorCode.AUTH_INVALID_ID_TOKEN: 401,
    ApiErrorCode.AUTH_PROVIDER_NOT_SUPPORTED: 400,
    ApiErrorCode.AUTH_MISSING_PARAMS: 400,
    ApiErrorCode.AUTH_REFRESH_EXPIRED: 401,
    ApiErrorCode.AUTH_REFRESH_INVALID: 401,
    ApiErrorCode.AUTH_REFRESH_REVOKED: 401,
    ApiErrorCode.AUTH_USER_NOT_FOUND: 404,
    ApiErrorCode.SURVEY_ALREADY_SUBMITTED: 409,
    ApiErrorCode.SURVEY_INVALID_FIELD: 400,
    ApiErrorCode.PANDA_NOT_FOUND: 404,
    ApiErrorCode.PANDA_NOT_OWNER: 403,
    ApiErrorCode.PANDA_MINT_DISABLED: 403,
    ApiErrorCode.PANDA_MAX_SUPPLY: 403,
    ApiErrorCode.PANDA_MINT_RATE_LIMIT: 429,
    ApiErrorCode.PANDA_TX_FAILED: 500,
    ApiErrorCode.PANDA_NAME_INVALID: 400,
    ApiErrorCode.PANDA_NAME_PROFANITY: 400,
    ApiErrorCode.PANDA_IS_TRADING: 409,
    ApiErrorCode.STRATEGY_TEXT_TOO_SHORT: 400,
    ApiErrorCode.STRATEGY_TEXT_TOO_LONG: 400,
    ApiErrorCode.STRATEGY_BODY_EMPTY: 400,
    ApiErrorCode.STRATEGY_NO_VALID_RULES: 422,
    ApiErrorCode.STRATEGY_RULE_INVALID: 422,
    ApiErrorCode.STRATEGY_PARSE_FAILED: 422,
    ApiErrorCode.STRATEGY_RATE_LIMIT: 429,
    ApiErrorCode.STRATEGY_NOT_FOUND: 404,
    ApiErrorCode.SIM_ALREADY_RUNNING: 409,
    ApiErrorCode.SIM_NO_STRATEGY: 400,
    ApiErrorCode.SIM_INVALID_SPEED: 400,
    ApiErrorCode.SIM_NOT_RUNNING: 400,
}


class ApiError(Exception):
    """Raised by services; mapped to { success: false, error: {...} } by handler."""

    def __init__(
        self,
        code: ApiErrorCode,
        message: str,
        *,
        details: Any | None = None,
        invalid_rules: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details
        self.invalid_rules = invalid_rules

    @property
    def status_code(self) -> int:
        return HTTP_STATUS_BY_CODE.get(self.code, 500)

    def to_body(self) -> dict[str, Any]:
        body: dict[str, Any] = {
            "code": self.code.value,
            "message": self.message,
        }
        if self.details is not None:
            body["details"] = self.details
        if self.invalid_rules is not None:
            body["invalid_rules"] = self.invalid_rules
        return body

"""Shared API response envelopes."""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    meta: PaginationMeta | None = None


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Any | None = None
    invalid_rules: list[dict[str, Any]] | None = None
    policy_conflicts: list[dict[str, Any]] | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorBody


def success(data: T, meta: PaginationMeta | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True, "data": data}
    if meta is not None:
        payload["meta"] = meta.model_dump()
    return payload


def error(
    code: str,
    message: str,
    *,
    details: Any | None = None,
    invalid_rules: list[dict[str, Any]] | None = None,
    policy_conflicts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        body["details"] = details
    if invalid_rules is not None:
        body["invalid_rules"] = invalid_rules
    if policy_conflicts is not None:
        body["policy_conflicts"] = policy_conflicts
    return {"success": False, "error": body}

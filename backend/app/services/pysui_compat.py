"""Compatibility helpers for pysui transaction submissions."""

from __future__ import annotations

from typing import Any


def pysui_object_id(value: str) -> Any:
    """Wrap an object id so pysui resolves it as an object argument."""
    from pysui.sui.sui_types.scalars import ObjectID  # type: ignore[import-untyped]

    return ObjectID(value)


def tx_digest_from_result(result: Any) -> str:
    digest = getattr(result, "digest", None)
    if digest:
        return str(digest)

    data = getattr(result, "result_data", None)
    digest = _field(data, "digest")
    if digest:
        return str(digest)

    raise AttributeError("pysui transaction result did not include a digest")


def tx_failure_reason(result: Any) -> str | None:
    data = getattr(result, "result_data", None)
    effects = _field(data, "effects")
    status = _field(effects, "status")
    if status is None:
        return None

    status_value = _field(status, "status") if not isinstance(status, str) else status
    if status_value == "success":
        return None

    error = _field(status, "error")
    return str(error or status_value or "transaction effects failed")


def _field(value: Any, name: str) -> Any:
    if value is None:
        return None
    if isinstance(value, dict):
        return value.get(name)
    return getattr(value, name, None)

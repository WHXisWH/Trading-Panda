"""Parse MintEvent / PandaMinted from Sui transaction events — Epic 1.1."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.config import settings
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.sui_rpc import get_transaction_block


@dataclass(frozen=True)
class ParsedMintEvent:
    object_id: str
    boldness: int
    patience: int
    intuition: int
    focus: int
    contrarian: int
    talent: int
    generation: int
    minter: str | None = None


def _normalize_object_id(value: str) -> str:
    v = value.strip().lower()
    if not v.startswith("0x"):
        v = f"0x{v}"
    return v


def _event_type_suffix(event_type: str, suffix: str) -> bool:
    return event_type.lower().endswith(f"::panda::{suffix.lower()}")


def _coerce_u8(value: Any) -> int:
    if isinstance(value, str):
        return int(value)
    return int(value)


def _coerce_u64(value: Any) -> int:
    if isinstance(value, str):
        return int(value)
    return int(value)


def parse_mint_events_from_tx(events: list[dict[str, Any]], package_id: str) -> ParsedMintEvent | None:
    """Extract personality + object_id from MintEvent or PandaMinted."""
    pkg = package_id.lower().strip()
    minted: ParsedMintEvent | None = None
    mint_event: ParsedMintEvent | None = None

    for ev in events:
        ev_type = str(ev.get("type", "")).lower()
        if pkg and pkg not in ev_type:
            continue
        parsed = ev.get("parsedJson") or ev.get("parsed_json") or {}
        if not isinstance(parsed, dict):
            continue

        if _event_type_suffix(ev_type, "PandaMinted"):
            object_id = _normalize_object_id(str(parsed.get("panda_id", "")))
            minted = ParsedMintEvent(
                object_id=object_id,
                boldness=_coerce_u8(parsed.get("boldness", 0)),
                patience=_coerce_u8(parsed.get("patience", 0)),
                intuition=_coerce_u8(parsed.get("intuition", 0)),
                focus=_coerce_u8(parsed.get("focus", 0)),
                contrarian=_coerce_u8(parsed.get("contrarian", 0)),
                talent=_coerce_u8(parsed.get("talent", 0)),
                generation=_coerce_u64(parsed.get("generation", 1)),
                minter=str(parsed.get("owner", "")) or None,
            )
        elif _event_type_suffix(ev_type, "MintEvent"):
            object_id = _normalize_object_id(str(parsed.get("panda_id", "")))
            mint_event = ParsedMintEvent(
                object_id=object_id,
                boldness=_coerce_u8(parsed.get("boldness", 0)),
                patience=_coerce_u8(parsed.get("patience", 0)),
                intuition=_coerce_u8(parsed.get("intuition", 0)),
                focus=_coerce_u8(parsed.get("focus", 0)),
                contrarian=_coerce_u8(parsed.get("contrarian", 0)),
                talent=_coerce_u8(parsed.get("talent", 0)),
                generation=_coerce_u64(parsed.get("generation", 1)),
                minter=str(parsed.get("minter", "")) or None,
            )

    return minted or mint_event


async def fetch_parsed_mint_from_tx(
    tx_digest: str,
    *,
    expected_object_id: str | None = None,
    package_id: str | None = None,
) -> ParsedMintEvent:
    """Load tx from RPC and parse mint fields."""
    pkg = (package_id or settings.package_id or "").strip()
    if not pkg:
        raise ApiError(
            ApiErrorCode.SERVICE_UNAVAILABLE,
            "PACKAGE_ID is not configured",
        )

    try:
        block = await get_transaction_block(tx_digest)
    except Exception as exc:
        raise ApiError(
            ApiErrorCode.PANDA_TX_FAILED,
            "Failed to load mint transaction from Sui RPC",
            details=str(exc),
        ) from exc

    effects = block.get("effects") or {}
    status = (effects.get("status") or {}).get("status")
    if status != "success":
        raise ApiError(ApiErrorCode.PANDA_TX_FAILED, "Mint transaction did not succeed")

    events = block.get("events") or []
    parsed = parse_mint_events_from_tx(events, pkg)
    if parsed is None:
        raise ApiError(
            ApiErrorCode.PANDA_TX_FAILED,
            "MintEvent or PandaMinted not found in transaction",
        )

    if expected_object_id:
        expected = _normalize_object_id(expected_object_id)
        got = _normalize_object_id(parsed.object_id)
        if got != expected:
            parsed = ParsedMintEvent(
                object_id=expected,
                boldness=parsed.boldness,
                patience=parsed.patience,
                intuition=parsed.intuition,
                focus=parsed.focus,
                contrarian=parsed.contrarian,
                talent=parsed.talent,
                generation=parsed.generation,
                minter=parsed.minter,
            )

    return parsed

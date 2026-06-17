"""Parse Agent Wallet setup and owner safety events from Sui transactions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from app.config import settings
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.sui_rpc import get_transaction_block

OwnerActionKind = Literal["pause", "unpause", "revoke", "tighten"]


@dataclass(frozen=True)
class ParsedAgentWalletSetup:
    vault_object_id: str
    policy_object_id: str
    panda_object_id: str
    owner: str | None
    authorized_agent: str | None
    policy_version: int
    policy_hash: str | None = None


@dataclass(frozen=True)
class ParsedOwnerAction:
    action: OwnerActionKind
    policy_object_id: str
    panda_object_id: str | None = None
    paused: bool | None = None
    agent_revoked: bool = False
    policy_version: int | None = None
    policy_hash: str | None = None
    old_agent: str | None = None


def _normalize_object_id(value: str) -> str:
    v = value.strip().lower()
    if not v.startswith("0x"):
        v = f"0x{v}"
    return v


def _event_suffix(event_type: str, suffix: str) -> bool:
    return event_type.lower().endswith(f"::{suffix.lower()}")


def _hash_from_event(raw_hash: Any) -> str | None:
    if isinstance(raw_hash, list):
        return bytes(raw_hash).hex()
    if raw_hash:
        return str(raw_hash)
    return None


def _find_created_object(
    object_changes: list[dict[str, Any]],
    type_fragment: str,
) -> str | None:
    for change in object_changes:
        if change.get("type") != "created":
            continue
        object_type = str(change.get("objectType", "")).lower()
        if type_fragment.lower() in object_type:
            oid = change.get("objectId")
            if oid:
                return _normalize_object_id(str(oid))
    return None


def parse_setup_from_tx(
    events: list[dict[str, Any]],
    object_changes: list[dict[str, Any]],
    package_id: str,
) -> ParsedAgentWalletSetup | None:
    pkg = package_id.lower().strip()
    vault_id: str | None = None
    policy_id: str | None = None
    panda_id: str | None = None
    owner: str | None = None
    authorized_agent: str | None = None
    policy_version = 1
    policy_hash: str | None = None

    for ev in events:
        ev_type = str(ev.get("type", "")).lower()
        if pkg and pkg not in ev_type:
            continue
        parsed = ev.get("parsedJson") or ev.get("parsed_json") or {}
        if not isinstance(parsed, dict):
            continue

        if _event_suffix(ev_type, "PandaVaultCreated"):
            vault_id = _normalize_object_id(str(parsed.get("vault_id", "")))
            panda_id = _normalize_object_id(str(parsed.get("panda_id", "")))
            owner = str(parsed.get("owner", "")) or owner
            authorized_agent = str(parsed.get("authorized_agent", "")) or authorized_agent
            policy_id = _normalize_object_id(str(parsed.get("policy_id", ""))) or policy_id
        elif _event_suffix(ev_type, "TradingPolicyCreated"):
            policy_id = _normalize_object_id(str(parsed.get("policy_id", "")))
            panda_id = _normalize_object_id(str(parsed.get("panda_id", ""))) or panda_id
            owner = str(parsed.get("owner", "")) or owner
            authorized_agent = str(parsed.get("authorized_agent", "")) or authorized_agent
            policy_version = int(parsed.get("version", 1))
            policy_hash = _hash_from_event(parsed.get("policy_hash")) or policy_hash

    if not vault_id:
        vault_id = _find_created_object(object_changes, "::panda_vault::pandavault")
    if not policy_id:
        policy_id = _find_created_object(object_changes, "::trading_policy::tradingpolicy")

    if not vault_id or not policy_id or not panda_id:
        return None

    return ParsedAgentWalletSetup(
        vault_object_id=vault_id,
        policy_object_id=policy_id,
        panda_object_id=panda_id,
        owner=owner,
        authorized_agent=authorized_agent,
        policy_version=policy_version,
        policy_hash=policy_hash,
    )


def parse_owner_action_from_tx(
    events: list[dict[str, Any]],
    package_id: str,
) -> ParsedOwnerAction | None:
    pkg = package_id.lower().strip()
    paused_event: dict[str, Any] | None = None
    revoked_event: dict[str, Any] | None = None
    updated_event: dict[str, Any] | None = None

    for ev in events:
        ev_type = str(ev.get("type", "")).lower()
        if pkg and pkg not in ev_type:
            continue
        parsed = ev.get("parsedJson") or ev.get("parsed_json") or {}
        if not isinstance(parsed, dict):
            continue

        if _event_suffix(ev_type, "TradingPolicyPaused"):
            paused_event = parsed
        elif _event_suffix(ev_type, "AgentRevoked"):
            revoked_event = parsed
        elif _event_suffix(ev_type, "TradingPolicyUpdated"):
            updated_event = parsed

    if revoked_event:
        return ParsedOwnerAction(
            action="revoke",
            policy_object_id=_normalize_object_id(str(revoked_event.get("policy_id", ""))),
            panda_object_id=_normalize_object_id(str(revoked_event.get("panda_id", "")))
            if revoked_event.get("panda_id")
            else None,
            paused=True,
            agent_revoked=True,
            old_agent=str(revoked_event.get("old_agent", "")) or None,
        )

    if paused_event:
        paused = bool(paused_event.get("paused", True))
        return ParsedOwnerAction(
            action="pause" if paused else "unpause",
            policy_object_id=_normalize_object_id(str(paused_event.get("policy_id", ""))),
            panda_object_id=_normalize_object_id(str(paused_event.get("panda_id", "")))
            if paused_event.get("panda_id")
            else None,
            paused=paused,
        )

    if updated_event:
        return ParsedOwnerAction(
            action="tighten",
            policy_object_id=_normalize_object_id(str(updated_event.get("policy_id", ""))),
            panda_object_id=_normalize_object_id(str(updated_event.get("panda_id", "")))
            if updated_event.get("panda_id")
            else None,
            policy_version=int(updated_event.get("version", 0)) or None,
            policy_hash=_hash_from_event(updated_event.get("policy_hash")),
        )

    return None


async def fetch_setup_from_tx(
    digest: str,
    expected_panda_object_id: str | None = None,
) -> ParsedAgentWalletSetup:
    tx = await get_transaction_block(
        digest,
        options={
            "showEvents": True,
            "showObjectChanges": True,
            "showEffects": True,
        },
    )
    status = (tx.get("effects") or {}).get("status") or {}
    if status.get("status") == "failure":
        raise ApiError(ApiErrorCode.PANDA_TX_FAILED, "Setup transaction failed on chain")

    events = tx.get("events") or []
    object_changes = tx.get("objectChanges") or []
    parsed = parse_setup_from_tx(events, object_changes, settings.package_id)
    if parsed is None:
        raise ApiError(
            ApiErrorCode.VALIDATION_ERROR,
            "Could not parse PandaVault / TradingPolicy from transaction",
        )

    if expected_panda_object_id:
        expected = _normalize_object_id(expected_panda_object_id)
        if _normalize_object_id(parsed.panda_object_id) != expected:
            raise ApiError(ApiErrorCode.VALIDATION_ERROR, "Panda object id mismatch in setup tx")

    return parsed


async def fetch_owner_action_from_tx(
    digest: str,
    *,
    expected_policy_object_id: str | None = None,
    expected_panda_object_id: str | None = None,
) -> ParsedOwnerAction:
    tx = await get_transaction_block(
        digest,
        options={"showEvents": True, "showEffects": True},
    )
    status = (tx.get("effects") or {}).get("status") or {}
    if status.get("status") == "failure":
        raise ApiError(ApiErrorCode.PANDA_TX_FAILED, "Owner action transaction failed on chain")

    events = tx.get("events") or []
    parsed = parse_owner_action_from_tx(events, settings.package_id)
    if parsed is None:
        raise ApiError(
            ApiErrorCode.VALIDATION_ERROR,
            "Could not parse TradingPolicy owner action from transaction",
        )

    if expected_policy_object_id:
        expected = _normalize_object_id(expected_policy_object_id)
        if _normalize_object_id(parsed.policy_object_id) != expected:
            raise ApiError(ApiErrorCode.VALIDATION_ERROR, "TradingPolicy object id mismatch")

    if expected_panda_object_id and parsed.panda_object_id:
        expected = _normalize_object_id(expected_panda_object_id)
        if _normalize_object_id(parsed.panda_object_id) != expected:
            raise ApiError(ApiErrorCode.VALIDATION_ERROR, "Panda object id mismatch in owner tx")

    return parsed

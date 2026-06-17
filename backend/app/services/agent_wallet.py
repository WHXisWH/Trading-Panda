"""Agent Wallet mirror sync, policy validation, and setup status — Epic 2."""

from __future__ import annotations

import hashlib
import json
import uuid
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Panda, PandaAccount, PandaVault, TradingPolicy, User
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.agent_wallet_event_parser import (
    ParsedAgentWalletSetup,
    fetch_owner_action_from_tx,
    fetch_setup_from_tx,
)
from app.services.wallet_verify import normalize_sui_address

SetupState = Literal["no_vault", "active", "mirror_syncing", "ready"]
MirrorSyncStatus = Literal["pending", "synced", "degraded"]


def is_mirror_synced(vault: PandaVault | None, policy: TradingPolicy | None) -> bool:
    if vault is None or policy is None:
        return False
    return bool(vault.sui_object_id and policy.sui_object_id)


def launch_pairs() -> list[str]:
    raw = settings.deepbook_launch_pairs.strip()
    if not raw:
        return ["DEEP/SUI", "SUI/USDC"]
    return [p.strip() for p in raw.split(",") if p.strip()]


def compute_policy_hash(
    allowed_pairs: list[str],
    max_notional_per_trade: float,
    max_daily_loss: float,
    max_open_positions: int,
    cooldown_ms: int,
    max_proofs_per_day: int,
    proof_mode: str,
) -> str:
    payload = {
        "allowed_pairs": sorted(allowed_pairs),
        "max_notional_per_trade": max_notional_per_trade,
        "max_daily_loss": max_daily_loss,
        "max_open_positions": max_open_positions,
        "cooldown_ms": cooldown_ms,
        "max_proofs_per_day": max_proofs_per_day,
        "proof_mode": proof_mode,
    }
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    return digest


def validate_policy_draft(
    allowed_pairs: list[str],
    max_notional_per_trade: float,
    max_daily_loss: float,
    max_open_positions: int,
    agent_signer_address: str | None,
) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    supported = set(launch_pairs())

    if not allowed_pairs:
        errors.append({"field": "allowed_pairs", "message": "Select at least one trading pair"})
    else:
        for pair in allowed_pairs:
            if pair not in supported:
                errors.append(
                    {
                        "field": "allowed_pairs",
                        "message": f"Pair {pair} is not in launch pair list",
                    }
                )

    if max_notional_per_trade <= 0:
        errors.append({"field": "max_notional_per_trade", "message": "Must be greater than zero"})
    if max_daily_loss <= 0 or max_daily_loss > 100:
        errors.append({"field": "max_daily_loss", "message": "Daily loss cap must be between 0 and 100"})
    if max_open_positions < 1:
        errors.append({"field": "max_open_positions", "message": "Must allow at least one position"})

    configured_agent = (agent_signer_address or settings.agent_signer_address or "").strip()
    if not configured_agent:
        errors.append(
            {
                "field": "authorized_agent",
                "message": "Agent signer is not configured on the server",
            }
        )

    policy_hash = compute_policy_hash(
        allowed_pairs,
        max_notional_per_trade,
        max_daily_loss,
        max_open_positions,
        0,
        10,
        "manual",
    )
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "policy_hash": policy_hash,
        "authorized_agent": configured_agent or None,
        "supported_pairs": sorted(supported),
    }


def _vault_dict(row: PandaVault) -> dict[str, Any]:
    return {
        "id": row.id,
        "panda_id": row.panda_id,
        "sui_object_id": row.sui_object_id,
        "sui_object_kind": row.sui_object_kind,
        "mode": row.mode,
        "status": row.status,
        "owner_address": row.owner_address,
        "authorized_agent": row.authorized_agent,
        "agent_key_scope": row.agent_key_scope,
        "base_asset": row.base_asset,
        "policy_id": row.policy_id,
        "policy_version": row.policy_version,
    }


def _policy_dict(row: TradingPolicy) -> dict[str, Any]:
    pairs = row.allowed_pairs if isinstance(row.allowed_pairs, list) else []
    return {
        "id": row.id,
        "panda_id": row.panda_id,
        "vault_id": row.vault_id,
        "sui_object_id": row.sui_object_id,
        "object_model": row.object_model,
        "owner_address": row.owner_address,
        "authorized_agent": row.authorized_agent,
        "agent_key_scope": row.agent_key_scope,
        "agent_key_version": row.agent_key_version,
        "mode": row.mode,
        "allowed_pairs": pairs,
        "max_notional_per_trade": float(row.max_notional_per_trade),
        "max_daily_loss": float(row.max_daily_loss),
        "max_leverage": float(row.max_leverage),
        "max_open_positions": row.max_open_positions,
        "paused": row.paused,
        "version": row.version,
        "policy_hash": row.policy_hash,
    }


def _account_dict(row: PandaAccount) -> dict[str, Any]:
    return {
        "id": row.id,
        "panda_id": row.panda_id,
        "vault_id": row.vault_id,
        "mode": row.mode,
        "base_asset": row.base_asset,
        "cash_balance": float(row.cash_balance),
        "debt_balance": float(row.debt_balance),
        "equity": float(row.equity),
        "realized_pnl": float(row.realized_pnl),
        "unrealized_pnl": float(row.unrealized_pnl),
        "status": row.status,
    }


async def get_setup_status(
    panda: Panda,
    db: AsyncSession,
) -> dict[str, Any]:
    vault: PandaVault | None = None
    policy: TradingPolicy | None = None
    account: PandaAccount | None = None

    if panda.active_vault_id:
        vault = (
            await db.execute(select(PandaVault).where(PandaVault.id == panda.active_vault_id))
        ).scalar_one_or_none()
    if panda.active_policy_id:
        policy = (
            await db.execute(select(TradingPolicy).where(TradingPolicy.id == panda.active_policy_id))
        ).scalar_one_or_none()
    if vault:
        account = (
            await db.execute(
                select(PandaAccount).where(
                    PandaAccount.panda_id == panda.id,
                    PandaAccount.vault_id == vault.id,
                )
            )
        ).scalar_one_or_none()

    agent_addr = (settings.agent_signer_address or "").strip() or None
    mirror: MirrorSyncStatus = "pending"
    setup_state: SetupState = "no_vault"

    if vault and policy and vault.sui_object_id and policy.sui_object_id:
        mirror = "synced"
        setup_state = "ready" if not policy.paused and vault.status == "active" else "active"
    elif vault or policy:
        mirror = "degraded"
        setup_state = "mirror_syncing"

    can_train = (
        vault is not None
        and policy is not None
        and vault.status == "active"
        and not policy.paused
        and mirror == "synced"
    )

    return {
        "setup_state": setup_state,
        "mirror_sync_status": mirror,
        "vault": _vault_dict(vault) if vault else None,
        "policy": _policy_dict(policy) if policy else None,
        "account": _account_dict(account) if account else None,
        "authorized_agent_configured": bool(agent_addr),
        "agent_signer_address": agent_addr,
        "can_start_training": can_train,
        "launch_pairs": launch_pairs(),
    }


async def sync_setup_from_tx(
    panda: Panda,
    user: User,
    sui_tx_digest: str,
    draft: dict[str, Any] | None,
    db: AsyncSession,
) -> dict[str, Any]:
    existing_vault = (
        await db.execute(select(PandaVault).where(PandaVault.panda_id == panda.id))
    ).scalar_one_or_none()
    if existing_vault and existing_vault.sui_object_id:
        raise ApiError(ApiErrorCode.VALIDATION_ERROR, "Agent Wallet already exists for this Panda")

    parsed: ParsedAgentWalletSetup = await fetch_setup_from_tx(
        sui_tx_digest,
        expected_panda_object_id=panda.sui_object_id,
    )

    if draft:
        validation = validate_policy_draft(
            draft.get("allowed_pairs", []),
            float(draft.get("max_notional_per_trade", 0)),
            float(draft.get("max_daily_loss", 0)),
            int(draft.get("max_open_positions", 1)),
            parsed.authorized_agent,
        )
        if not validation["valid"]:
            raise ApiError(
                ApiErrorCode.VALIDATION_ERROR,
                "Policy draft does not match validation rules",
                details={"errors": validation["errors"]},
            )

    owner = normalize_sui_address(user.wallet_address)
    if parsed.owner and normalize_sui_address(parsed.owner) != owner:
        raise ApiError(ApiErrorCode.VAULT_OWNER_MISMATCH, "Transaction sender does not match Panda owner")

    configured_agent = (settings.agent_signer_address or "").strip()
    if configured_agent and parsed.authorized_agent:
        if normalize_sui_address(parsed.authorized_agent) != normalize_sui_address(configured_agent):
            raise ApiError(
                ApiErrorCode.AGENT_SIGNER_UNAUTHORIZED,
                "Authorized agent in transaction does not match environment signer",
            )

    allowed_pairs = (draft or {}).get("allowed_pairs") or launch_pairs()[:2]
    max_notional = Decimal(str((draft or {}).get("max_notional_per_trade", 50)))
    max_daily_loss = Decimal(str((draft or {}).get("max_daily_loss", 8)))
    policy_hash = (draft or {}).get("policy_hash") or parsed.policy_hash or compute_policy_hash(
        allowed_pairs,
        float(max_notional),
        float(max_daily_loss),
        int((draft or {}).get("max_open_positions", 1)),
        int((draft or {}).get("cooldown_ms", 0)),
        int((draft or {}).get("max_proofs_per_day", 10)),
        str((draft or {}).get("proof_mode", "manual")),
    )

    vault_id = str(uuid.uuid4())
    policy_id = str(uuid.uuid4())

    vault = PandaVault(
        id=vault_id,
        panda_id=panda.id,
        sui_object_id=parsed.vault_object_id,
        mode="training_ledger",
        status="active",
        owner_address=owner,
        authorized_agent=parsed.authorized_agent,
        policy_id=policy_id,
        policy_version=parsed.policy_version,
        created_tx_digest=sui_tx_digest,
    )
    policy = TradingPolicy(
        id=policy_id,
        panda_id=panda.id,
        vault_id=vault_id,
        sui_object_id=parsed.policy_object_id,
        owner_address=owner,
        authorized_agent=parsed.authorized_agent,
        mode="training_ledger",
        allowed_pairs=allowed_pairs,
        max_notional_per_trade=max_notional,
        max_daily_loss=max_daily_loss,
        max_open_positions=int((draft or {}).get("max_open_positions", 1)),
        paused=False,
        version=parsed.policy_version,
        policy_hash=policy_hash,
        created_tx_digest=sui_tx_digest,
    )
    account = PandaAccount(
        id=str(uuid.uuid4()),
        panda_id=panda.id,
        vault_id=vault_id,
        mode="training_ledger",
        base_asset="vUSDC",
        cash_balance=Decimal("10000"),
        equity=Decimal("10000"),
        status="active",
    )

    db.add(vault)
    db.add(policy)
    db.add(account)
    panda.active_vault_id = vault_id
    panda.active_policy_id = policy_id
    await db.commit()

    return await get_setup_status(panda, db)


async def sync_owner_action_from_tx(
    panda: Panda,
    action: str,
    sui_tx_digest: str,
    db: AsyncSession,
    draft: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not panda.active_policy_id:
        raise ApiError(ApiErrorCode.POLICY_NOT_FOUND, "No active TradingPolicy for this Panda")

    policy = (
        await db.execute(select(TradingPolicy).where(TradingPolicy.id == panda.active_policy_id))
    ).scalar_one_or_none()
    if policy is None:
        raise ApiError(ApiErrorCode.POLICY_NOT_FOUND, "TradingPolicy mirror not found")

    vault = None
    if panda.active_vault_id:
        vault = (
            await db.execute(select(PandaVault).where(PandaVault.id == panda.active_vault_id))
        ).scalar_one_or_none()

    parsed = await fetch_owner_action_from_tx(
        sui_tx_digest,
        expected_policy_object_id=policy.sui_object_id,
        expected_panda_object_id=panda.sui_object_id,
    )

    if action == "pause":
        policy.paused = True
        if vault:
            vault.status = "paused"
    elif action == "unpause":
        if parsed.agent_revoked:
            raise ApiError(
                ApiErrorCode.POLICY_AGENT_REVOKED,
                "Cannot unpause after agent revocation — create a new policy",
            )
        policy.paused = False
        if vault:
            vault.status = "active"
    elif action == "revoke":
        policy.paused = True
        policy.authorized_agent = None
        if vault:
            vault.status = "revoked"
            vault.authorized_agent = None
    elif action == "tighten":
        if draft:
            allowed_pairs = draft.get("allowed_pairs") or list(policy.allowed_pairs or [])
            policy.allowed_pairs = allowed_pairs
            policy.max_notional_per_trade = Decimal(
                str(draft.get("max_notional_per_trade", policy.max_notional_per_trade))
            )
            policy.max_daily_loss = Decimal(str(draft.get("max_daily_loss", policy.max_daily_loss)))
            policy.max_open_positions = int(
                draft.get("max_open_positions", policy.max_open_positions)
            )
            if draft.get("policy_hash"):
                policy.policy_hash = str(draft["policy_hash"])
        if parsed.policy_version and parsed.policy_version > policy.version:
            policy.version = parsed.policy_version
        policy.paused = False
        if vault and vault.status != "revoked":
            vault.status = "active"
    else:
        raise ApiError(ApiErrorCode.VALIDATION_ERROR, f"Unknown owner action: {action}")

    policy.updated_tx_digest = sui_tx_digest
    if vault:
        vault.policy_version = policy.version

    from app.services.safety_service import cancel_pending_chain_proof_jobs

    if action in ("pause", "revoke"):
        await cancel_pending_chain_proof_jobs(
            db,
            panda.id,
            reason=f"Cancelled by owner {action}",
        )

    await db.commit()
    return await get_setup_status(panda, db)


async def require_active_wallet(panda: Panda, db: AsyncSession) -> tuple[PandaVault, TradingPolicy]:
    if not panda.active_vault_id or not panda.active_policy_id:
        raise ApiError(
            ApiErrorCode.VAULT_NOT_FOUND,
            "Agent Wallet setup required before training",
        )

    vault = (
        await db.execute(select(PandaVault).where(PandaVault.id == panda.active_vault_id))
    ).scalar_one_or_none()
    policy = (
        await db.execute(select(TradingPolicy).where(TradingPolicy.id == panda.active_policy_id))
    ).scalar_one_or_none()

    if vault is None or policy is None:
        raise ApiError(ApiErrorCode.VAULT_SYNC_PENDING, "Agent Wallet mirror is incomplete")
    if not vault.sui_object_id or not policy.sui_object_id:
        raise ApiError(ApiErrorCode.VAULT_SYNC_PENDING, "Chain objects not mirrored yet")
    if vault.status != "active" or policy.paused:
        raise ApiError(ApiErrorCode.POLICY_PAUSED, "TradingPolicy is paused or vault inactive")
    if not policy.authorized_agent:
        raise ApiError(ApiErrorCode.POLICY_AGENT_REVOKED, "Authorized agent was revoked")

    return vault, policy

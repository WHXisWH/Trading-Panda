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
from app.services.market_pairs import (
    _dedupe_pairs,
    canonical_market_pair,
    configured_launch_pairs,
    resolve_launch_pairs,
)
from app.services.wallet_verify import normalize_sui_address

SetupState = Literal["no_vault", "active", "mirror_syncing", "ready"]
MirrorSyncStatus = Literal["pending", "synced", "degraded"]

TRAINING_BUDGET_MIN = 100.0
TRAINING_BUDGET_MAX = 1_000_000.0
DEFAULT_TRAINING_BUDGET = 10_000.0


def is_mirror_synced(vault: PandaVault | None, policy: TradingPolicy | None) -> bool:
    if vault is None or policy is None:
        return False
    return bool(vault.sui_object_id and policy.sui_object_id)


def launch_pairs() -> list[str]:
    return configured_launch_pairs()


def compute_policy_hash(
    allowed_pairs: list[str],
    max_notional_per_trade: float,
    max_daily_loss: float,
    max_open_positions: int,
    cooldown_ms: int,
    max_proofs_per_day: int,
    proof_mode: str,
    training_budget: float = DEFAULT_TRAINING_BUDGET,
) -> str:
    payload = {
        "allowed_pairs": sorted(allowed_pairs),
        "training_budget": training_budget,
        "max_notional_per_trade": max_notional_per_trade,
        "max_daily_loss": max_daily_loss,
        "max_open_positions": max_open_positions,
        "cooldown_ms": cooldown_ms,
        "max_proofs_per_day": max_proofs_per_day,
        "proof_mode": proof_mode,
    }
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    return digest


def _training_budget_errors(
    training_budget: float,
    max_notional_per_trade: float,
) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    if training_budget < TRAINING_BUDGET_MIN or training_budget > TRAINING_BUDGET_MAX:
        errors.append(
            {
                "field": "training_budget",
                "message": (
                    f"Training budget must be between ${TRAINING_BUDGET_MIN:,.0f} "
                    f"and ${TRAINING_BUDGET_MAX:,.0f} USD"
                ),
            }
        )
    if max_notional_per_trade > training_budget:
        errors.append(
            {
                "field": "max_notional_per_trade",
                "message": "Max order size (USD) cannot exceed training budget",
            }
        )
    return errors


def validate_policy_draft(
    allowed_pairs: list[str],
    max_notional_per_trade: float,
    max_daily_loss: float,
    max_open_positions: int,
    agent_signer_address: str | None,
    *,
    training_budget: float = DEFAULT_TRAINING_BUDGET,
    cooldown_ms: int = 0,
    max_proofs_per_day: int = 10,
    proof_mode: str = "manual",
) -> dict[str, Any]:
    return validate_policy_draft_for_pairs(
        allowed_pairs,
        max_notional_per_trade,
        max_daily_loss,
        max_open_positions,
        agent_signer_address,
        launch_pairs(),
        training_budget=training_budget,
        cooldown_ms=cooldown_ms,
        max_proofs_per_day=max_proofs_per_day,
        proof_mode=proof_mode,
    )


async def validate_policy_draft_async(
    allowed_pairs: list[str],
    max_notional_per_trade: float,
    max_daily_loss: float,
    max_open_positions: int,
    agent_signer_address: str | None,
    *,
    training_budget: float = DEFAULT_TRAINING_BUDGET,
    cooldown_ms: int = 0,
    max_proofs_per_day: int = 10,
    proof_mode: str = "manual",
) -> dict[str, Any]:
    supported_pairs = await resolve_launch_pairs()
    return validate_policy_draft_for_pairs(
        allowed_pairs,
        max_notional_per_trade,
        max_daily_loss,
        max_open_positions,
        agent_signer_address,
        supported_pairs,
        training_budget=training_budget,
        cooldown_ms=cooldown_ms,
        max_proofs_per_day=max_proofs_per_day,
        proof_mode=proof_mode,
    )


def validate_policy_draft_for_pairs(
    allowed_pairs: list[str],
    max_notional_per_trade: float,
    max_daily_loss: float,
    max_open_positions: int,
    agent_signer_address: str | None,
    supported_pairs: list[str],
    *,
    training_budget: float = DEFAULT_TRAINING_BUDGET,
    cooldown_ms: int = 0,
    max_proofs_per_day: int = 10,
    proof_mode: str = "manual",
) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    supported = {canonical_market_pair(pair) for pair in supported_pairs}
    normalized_allowed = [canonical_market_pair(pair) for pair in allowed_pairs]

    errors.extend(_training_budget_errors(training_budget, max_notional_per_trade))

    if not normalized_allowed:
        errors.append({"field": "allowed_pairs", "message": "Select at least one trading pair"})
    else:
        for pair in normalized_allowed:
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
        normalized_allowed,
        max_notional_per_trade,
        max_daily_loss,
        max_open_positions,
        cooldown_ms,
        max_proofs_per_day,
        proof_mode,
        training_budget,
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
        "training_budget": float(row.training_budget),
    }


def _policy_dict(row: TradingPolicy) -> dict[str, Any]:
    raw = row.allowed_pairs if isinstance(row.allowed_pairs, list) else []
    pairs = _dedupe_pairs([str(p) for p in raw])
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
        "launch_pairs": await resolve_launch_pairs(),
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
        if existing_vault.created_tx_digest and existing_vault.created_tx_digest == sui_tx_digest:
            panda.active_vault_id = existing_vault.id
            panda.active_policy_id = existing_vault.policy_id
            return await get_setup_status(panda, db)
        raise ApiError(ApiErrorCode.VALIDATION_ERROR, "Agent Wallet already exists for this Panda")

    parsed: ParsedAgentWalletSetup = await fetch_setup_from_tx(
        sui_tx_digest,
        expected_panda_object_id=panda.sui_object_id,
    )

    if draft:
        validation = await validate_policy_draft_async(
            draft.get("allowed_pairs", []),
            float(draft.get("max_notional_per_trade", 0)),
            float(draft.get("max_daily_loss", 0)),
            int(draft.get("max_open_positions", 1)),
            parsed.authorized_agent,
            training_budget=float(draft.get("training_budget", DEFAULT_TRAINING_BUDGET)),
            cooldown_ms=int(draft.get("cooldown_ms", 0)),
            max_proofs_per_day=int(draft.get("max_proofs_per_day", 10)),
            proof_mode=str(draft.get("proof_mode", "manual")),
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

    resolved_pairs = await resolve_launch_pairs()
    draft_pairs = (draft or {}).get("allowed_pairs")
    allowed_pairs = (
        [canonical_market_pair(str(pair)) for pair in draft_pairs]
        if isinstance(draft_pairs, list) and draft_pairs
        else resolved_pairs[:2]
    )
    max_notional = Decimal(str((draft or {}).get("max_notional_per_trade", 50)))
    max_daily_loss = Decimal(str((draft or {}).get("max_daily_loss", 8)))
    training_budget = float((draft or {}).get("training_budget", DEFAULT_TRAINING_BUDGET))
    policy_hash = (draft or {}).get("policy_hash") or parsed.policy_hash or compute_policy_hash(
        allowed_pairs,
        float(max_notional),
        float(max_daily_loss),
        int((draft or {}).get("max_open_positions", 1)),
        int((draft or {}).get("cooldown_ms", 0)),
        int((draft or {}).get("max_proofs_per_day", 10)),
        str((draft or {}).get("proof_mode", "manual")),
        training_budget,
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
        training_budget=Decimal(str(training_budget)),
        created_tx_digest=sui_tx_digest,
    )
    db.add(vault)
    await db.flush()

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
        cash_balance=Decimal(str(training_budget)),
        equity=Decimal(str(training_budget)),
        status="active",
    )

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
            if vault and draft.get("training_budget") is not None:
                _apply_training_budget_change(
                    vault,
                    account=await _load_training_account(panda.id, vault.id, db),
                    new_budget=float(draft["training_budget"]),
                    max_notional=float(policy.max_notional_per_trade),
                )
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


async def _load_training_account(
    panda_id: str,
    vault_id: str,
    db: AsyncSession,
) -> PandaAccount | None:
    return (
        await db.execute(
            select(PandaAccount).where(
                PandaAccount.panda_id == panda_id,
                PandaAccount.vault_id == vault_id,
                PandaAccount.mode == "training_ledger",
            )
        )
    ).scalar_one_or_none()


def _apply_training_budget_change(
    vault: PandaVault,
    *,
    account: PandaAccount | None,
    new_budget: float,
    max_notional: float,
) -> None:
    errors = _training_budget_errors(new_budget, max_notional)
    if errors:
        raise ApiError(
            ApiErrorCode.VALIDATION_ERROR,
            "Training budget update failed validation",
            details={"errors": errors},
        )
    old_budget = float(vault.training_budget)
    delta = new_budget - old_budget
    if account is not None and delta < 0:
        cash = float(account.cash_balance)
        equity = float(account.equity)
        if cash + delta < 0:
            raise ApiError(
                ApiErrorCode.VALIDATION_ERROR,
                "Cannot reduce training budget below available cash",
            )
        if equity + delta < 0:
            raise ApiError(
                ApiErrorCode.VALIDATION_ERROR,
                "Cannot reduce training budget below current equity",
            )
        account.cash_balance = Decimal(str(cash + delta))
        account.equity = Decimal(str(equity + delta))
    elif account is not None and delta > 0:
        account.cash_balance = Decimal(str(float(account.cash_balance) + delta))
        account.equity = Decimal(str(float(account.equity) + delta))
    vault.training_budget = Decimal(str(new_budget))


async def resolve_training_budget(panda_id: str, db: AsyncSession) -> float:
    vault = (
        await db.execute(
            select(PandaVault)
            .where(PandaVault.panda_id == panda_id)
            .order_by(PandaVault.created_at.desc())
        )
    ).scalar_one_or_none()
    if vault is not None and vault.training_budget is not None:
        return float(vault.training_budget)
    account = (
        await db.execute(
            select(PandaAccount).where(
                PandaAccount.panda_id == panda_id,
                PandaAccount.mode == "training_ledger",
            )
        )
    ).scalar_one_or_none()
    if account is not None and float(account.equity) > 0:
        return float(account.equity)
    return DEFAULT_TRAINING_BUDGET


async def update_training_budget(
    panda: Panda,
    training_budget: float,
    db: AsyncSession,
) -> dict[str, Any]:
    if not panda.active_vault_id:
        raise ApiError(ApiErrorCode.VAULT_NOT_FOUND, "Agent Wallet setup required")

    vault = (
        await db.execute(select(PandaVault).where(PandaVault.id == panda.active_vault_id))
    ).scalar_one_or_none()
    if vault is None:
        raise ApiError(ApiErrorCode.VAULT_NOT_FOUND, "PandaVault mirror not found")

    policy = None
    if panda.active_policy_id:
        policy = (
            await db.execute(select(TradingPolicy).where(TradingPolicy.id == panda.active_policy_id))
        ).scalar_one_or_none()
    max_notional = float(policy.max_notional_per_trade) if policy else training_budget

    account = await _load_training_account(panda.id, vault.id, db)
    _apply_training_budget_change(
        vault,
        account=account,
        new_budget=training_budget,
        max_notional=max_notional,
    )
    await db.commit()
    return await get_setup_status(panda, db)

"""Safety controls — owner pause/revoke/tighten mirror + pending job visibility (Epic 8)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AsyncJob, Panda, PandaVault, TradingPolicy
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.agent_wallet import MirrorSyncStatus, get_setup_status, is_mirror_synced

RiskStatus = Literal["active", "paused", "revoked", "tightened", "mirror_syncing", "no_wallet"]
CHAIN_PROOF_JOB_TYPE = "chain_proof_requested"


def derive_risk_status(
    *,
    vault: PandaVault | None,
    policy: TradingPolicy | None,
    mirror: MirrorSyncStatus,
) -> RiskStatus:
    if vault is None or policy is None:
        return "no_wallet"
    if mirror != "synced":
        return "mirror_syncing"
    if vault.status == "revoked" or not policy.authorized_agent:
        return "revoked"
    if policy.paused:
        return "paused"
    return "active"


async def list_pending_chain_proof_jobs(
    session: AsyncSession,
    panda_id: str,
) -> list[dict[str, Any]]:
    result = await session.execute(
        select(AsyncJob)
        .where(
            AsyncJob.job_type == CHAIN_PROOF_JOB_TYPE,
            AsyncJob.status.in_(("pending", "running")),
        )
        .order_by(AsyncJob.created_at.asc())
    )
    jobs: list[dict[str, Any]] = []
    for job in result.scalars().all():
        payload = job.payload or {}
        if str(payload.get("panda_id")) != panda_id:
            continue
        jobs.append(
            {
                "job_id": job.id,
                "status": job.status,
                "trade_fact_id": payload.get("trade_fact_id"),
                "proof_key": payload.get("proof_key"),
                "proof_source": payload.get("proof_source"),
                "created_at": job.created_at.isoformat() if job.created_at else None,
            }
        )
    return jobs


async def cancel_pending_chain_proof_jobs(
    session: AsyncSession,
    panda_id: str,
    *,
    reason: str,
) -> list[str]:
    result = await session.execute(
        select(AsyncJob).where(
            AsyncJob.job_type == CHAIN_PROOF_JOB_TYPE,
            AsyncJob.status.in_(("pending", "running")),
        )
    )
    cancelled: list[str] = []
    now = datetime.now(timezone.utc)
    for job in result.scalars().all():
        payload = job.payload or {}
        if str(payload.get("panda_id")) != panda_id:
            continue
        job.status = "cancelled"
        job.last_error = reason
        job.locked_at = now
        cancelled.append(job.id)
    return cancelled


async def get_safety_status(panda: Panda, db: AsyncSession) -> dict[str, Any]:
    setup = await get_setup_status(panda, db)
    vault_row = None
    policy_row = None
    if panda.active_vault_id:
        vault_row = await db.get(PandaVault, panda.active_vault_id)
    if panda.active_policy_id:
        policy_row = await db.get(TradingPolicy, panda.active_policy_id)

    mirror = setup["mirror_sync_status"]
    risk_status = derive_risk_status(vault=vault_row, policy=policy_row, mirror=mirror)
    pending_jobs = await list_pending_chain_proof_jobs(db, panda.id)

    return {
        "risk_status": risk_status,
        "mirror_sync_status": mirror,
        "mirror_synced": is_mirror_synced(vault_row, policy_row),
        "can_pause": risk_status in ("active", "tightened"),
        "can_unpause": risk_status == "paused",
        "can_revoke": risk_status in ("active", "paused", "tightened"),
        "can_tighten": risk_status in ("active", "tightened"),
        "pending_chain_proof_jobs": pending_jobs,
        "pending_job_count": len(pending_jobs),
        "vault": setup.get("vault"),
        "policy": setup.get("policy"),
        "agent_signer_address": setup.get("agent_signer_address"),
        "launch_pairs": setup.get("launch_pairs", []),
    }


async def require_mirror_fresh(panda: Panda, db: AsyncSession) -> tuple[PandaVault, TradingPolicy]:
    if not panda.active_vault_id or not panda.active_policy_id:
        raise ApiError(ApiErrorCode.VAULT_NOT_FOUND, "Agent Wallet setup required")

    vault = await db.get(PandaVault, panda.active_vault_id)
    policy = await db.get(TradingPolicy, panda.active_policy_id)
    if vault is None or policy is None:
        raise ApiError(ApiErrorCode.VAULT_SYNC_PENDING, "Agent Wallet mirror is incomplete")
    if not is_mirror_synced(vault, policy):
        raise ApiError(
            ApiErrorCode.POLICY_MIRROR_STALE,
            "Policy mirror is stale — execution blocked until sync completes",
        )
    return vault, policy

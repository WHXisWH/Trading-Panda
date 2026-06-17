"""Chain Proof orchestration — status, timeline, proof attachment (Epic 6)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import AsyncJob, ChainExecutionLog, OrderIntent, PandaVault, TradeFact, TradingPolicy
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.agent_signer import (
    AgentSignerService,
    DemoTradeParams,
    proof_source_to_u8,
    side_to_u8,
)
from app.services.proof_selector import (
    check_eligibility,
    load_proof_context,
    order_intent_dict,
    request_chain_proof,
    trade_fact_dict,
)


def _truncate(value: str | None, head: int = 8, tail: int = 6) -> str:
    if not value:
        return ""
    if len(value) <= head + tail + 3:
        return value
    return f"{value[:head]}…{value[-tail:]}"


def _job_timeline(job: AsyncJob | None, log: ChainExecutionLog | None) -> list[dict[str, Any]]:
    steps: list[dict[str, str]] = []
    if job is None and log is None:
        return steps

    status = (log.status if log else None) or (job.status if job else "pending")
    mapping = [
        ("queued", "Queued"),
        ("running", "Building PTB"),
        ("building", "Building PTB"),
        ("signing", "Agent signing"),
        ("submitted", "Submitted"),
        ("confirmed", "Confirmed"),
        ("failed", "Failed"),
        ("completed", "Confirmed"),
    ]
    seen: set[str] = set()
    for key, label in mapping:
        if key in seen:
            continue
        active = status == key or (key == "queued" and status in ("pending", "queued", "running"))
        done = status in ("confirmed", "completed", "submitted") or (
            key == "queued" and status not in ("pending",)
        )
        if active or done or key == status:
            steps.append({"state": key, "label": label, "active": active, "done": done and not active})
            seen.add(key)
    if status == "failed":
        steps.append({"state": "failed", "label": "Failed", "active": True, "done": False})
    return steps


async def get_chain_proof_status(
    session: AsyncSession,
    panda_id: str,
    trade_fact_id: str,
) -> dict[str, Any]:
    fact, intent, policy = await load_proof_context(session, panda_id, trade_fact_id)
    eligibility = await check_eligibility(session, panda_id, trade_fact_id, manual=True)

    log: ChainExecutionLog | None = None
    if fact.chain_execution_log_id:
        log = await session.get(ChainExecutionLog, fact.chain_execution_log_id)
    elif fact.proof_key:
        result = await session.execute(
            select(ChainExecutionLog).where(ChainExecutionLog.proof_key == fact.proof_key)
        )
        log = result.scalar_one_or_none()

    job: AsyncJob | None = None
    if fact.proof_key:
        job_result = await session.execute(
            select(AsyncJob).where(AsyncJob.idempotency_key == f"chain_proof:{fact.proof_key}")
        )
        job = job_result.scalar_one_or_none()

    vault: PandaVault | None = None
    if fact.panda_id and policy and policy.vault_id:
        vault = await session.get(PandaVault, policy.vault_id)

    return {
        "trade_fact": {
            **trade_fact_dict(fact),
            "realized_pnl": float(fact.realized_pnl) if fact.realized_pnl is not None else None,
            "opened_at": fact.opened_at.isoformat() if fact.opened_at else None,
            "closed_at": fact.closed_at.isoformat() if fact.closed_at else None,
        },
        "order_intent": order_intent_dict(intent),
        "eligibility": {
            "eligible": eligibility.eligible,
            "reasons": eligibility.reasons,
            "score_bypassed": eligibility.score_bypassed,
            "chain_proof_enabled": settings.chain_proof_enabled,
        },
        "agent_signer": {
            "configured": bool((settings.agent_signer_address or "").strip()),
            "address": settings.agent_signer_address or None,
            "scope": "testnet PandaCoin demo PTB only",
        },
        "proof_job": {
            "job_id": job.id if job else None,
            "job_status": job.status if job else None,
            "timeline": _job_timeline(job, log),
        },
        "chain_execution": {
            "id": log.id if log else None,
            "status": log.status if log else fact.proof_status,
            "tx_digest": log.tx_digest if log else None,
            "tx_digest_short": _truncate(log.tx_digest if log else None),
            "policy_version": log.policy_version if log else intent.policy_version,
            "decision_hash": log.decision_hash if log else intent.decision_hash,
            "decision_hash_short": _truncate(log.decision_hash if log else intent.decision_hash),
            "event_type": log.event_type if log else None,
            "event_payload": log.event_payload if log else None,
            "error_message": log.error_message if log else None,
            "retryable": bool(log.retryable) if log else False,
            "proof_key": fact.proof_key,
        },
        "objects": {
            "vault_object_id": vault.sui_object_id if vault else None,
            "policy_object_id": policy.sui_object_id if policy else None,
            "vault_object_id_short": _truncate(vault.sui_object_id if vault else None),
            "policy_object_id_short": _truncate(policy.sui_object_id if policy else None),
        },
    }


async def request_and_process_proof(
    session: AsyncSession,
    panda_id: str,
    trade_fact_id: str,
    *,
    user_id: str | None = None,
) -> dict[str, Any]:
    queued = await request_chain_proof(
        session,
        panda_id,
        trade_fact_id,
        manual=True,
        requested_by=user_id,
    )
    if settings.chain_proof_enabled and queued.get("job_id"):
        from app.workers.queue_dispatcher import process_pending_jobs

        await process_pending_jobs(session, limit=5, worker_id="chain-proof-api")
    status = await get_chain_proof_status(session, panda_id, trade_fact_id)
    return {"queue": queued, "status": status}


async def attach_execution_result(
    session: AsyncSession,
    *,
    panda_id: str,
    trade_fact_id: str,
    order_intent_id: str,
    proof_key: str,
    proof_source: str,
    policy_version: int,
    decision_hash: str,
    manual_requested_by: str | None,
    submit_result: Any,
    vault: PandaVault,
    policy: TradingPolicy,
    intent: OrderIntent,
    fact: TradeFact,
) -> ChainExecutionLog:
    log = ChainExecutionLog(
        panda_id=panda_id,
        order_intent_id=order_intent_id,
        trade_fact_id=trade_fact_id,
        tx_digest=submit_result.tx_digest,
        event_type="DemoTradeExecuted",
        event_payload=submit_result.event_payload or {},
        policy_version=policy_version,
        decision_hash=decision_hash,
        proof_key=proof_key,
        proof_source=proof_source,
        manual_requested_by=manual_requested_by,
        status="confirmed" if not submit_result.dry_run else "confirmed",
        retryable=False,
    )
    session.add(log)
    await session.flush()

    fact.proof_status = "confirmed"
    fact.chain_execution_log_id = log.id
    intent.proof_eligible = True
    await session.flush()
    return log

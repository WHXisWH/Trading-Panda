"""Chain Proof eligibility and idempotency — Epic 6."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import ChainExecutionLog, OrderIntent, TradeFact, TradingPolicy
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.agent_wallet import launch_pairs
from app.services.async_job_queue import enqueue_job
from app.services.policy_gate import PolicyGate
from app.services.policy_compatibility import PolicyMirror

ProofSource = Literal["auto", "manual"]

AUTO_SCORE_THRESHOLD = 0.75
EXECUTABLE_SIDES = frozenset({"BUY", "SELL"})


@dataclass(frozen=True)
class EligibilityResult:
    eligible: bool
    reasons: list[str] = field(default_factory=list)
    proof_key: str | None = None
    score_bypassed: bool = False
    proof_source: ProofSource | None = None


def compute_proof_key(trade_fact_id: str, policy_version: int, decision_hash: str) -> str:
    raw = f"{trade_fact_id}:{policy_version}:{decision_hash}"
    return hashlib.sha256(raw.encode()).hexdigest()


def pair_hash_bytes(pair: str) -> bytes:
    return pair.encode("utf-8")


def proof_key_hash_bytes(proof_key: str) -> bytes:
    return bytes.fromhex(proof_key)


def evaluate_eligibility(
    *,
    trade_fact: dict[str, Any],
    order_intent: dict[str, Any],
    policy: PolicyMirror | None,
    chain_proof_enabled: bool | None = None,
    manual: bool = False,
    recent_proof_at: datetime | None = None,
    proofs_today: int = 0,
) -> EligibilityResult:
    """Pure eligibility check — no DB writes."""
    enabled = settings.chain_proof_enabled if chain_proof_enabled is None else chain_proof_enabled
    reasons: list[str] = []
    proof_source: ProofSource = "manual" if manual else "auto"

    trade_fact_id = str(trade_fact["id"])
    policy_version = int(order_intent.get("policy_version") or (policy.version if policy else 0))
    decision_hash = str(
        order_intent.get("decision_hash")
        or (trade_fact.get("decision_snapshot") or {}).get("decision_hash")
        or ""
    )
    proof_key = compute_proof_key(trade_fact_id, policy_version, decision_hash) if decision_hash else None

    if not enabled:
        reasons.append("Chain Proof Mode 2 is disabled on this server")
    if trade_fact.get("proof_status") in ("confirmed", "submitted", "requested"):
        reasons.append("A proof job already exists for this Trade Fact")

    side = str(trade_fact.get("side") or order_intent.get("side") or "").upper()
    if side not in EXECUTABLE_SIDES:
        reasons.append("Only BUY/SELL Trade Facts can be proven on-chain")

    final_score = order_intent.get("final_score")
    if final_score is not None:
        final_score = float(final_score)
    threshold = settings.chain_proof_auto_score_threshold or AUTO_SCORE_THRESHOLD
    score_bypassed = manual
    if not manual:
        if final_score is None:
            reasons.append("Decision score is missing")
        elif final_score < threshold:
            reasons.append(f"Score {final_score:.2f} is below automatic proof threshold {threshold:.2f}")

    pair = str(trade_fact.get("pair") or order_intent.get("pair") or "")
    supported = set(launch_pairs())
    if pair not in supported:
        reasons.append(f"Pair {pair} is not supported for testnet Chain Proof")

    notional = float(order_intent.get("notional") or 0)
    gate = PolicyGate().evaluate(policy, pair=pair, side=side, notional=notional)
    if not gate.passed:
        reasons.append(gate.rejection_reason or "TradingPolicy rejected this action")

    cooldown_min = settings.chain_proof_cooldown_minutes
    if recent_proof_at and cooldown_min > 0:
        elapsed = datetime.now(timezone.utc) - recent_proof_at.replace(tzinfo=timezone.utc)
        if elapsed < timedelta(minutes=cooldown_min):
            remaining = int((timedelta(minutes=cooldown_min) - elapsed).total_seconds() // 60) + 1
            reasons.append(f"Proof cooldown active — try again in ~{remaining} min")

    daily_cap = settings.chain_proof_daily_cap
    if proofs_today >= daily_cap:
        reasons.append(f"Daily proof cap reached ({daily_cap} per Panda per day)")

    eligible = len(reasons) == 0
    return EligibilityResult(
        eligible=eligible,
        reasons=reasons,
        proof_key=proof_key,
        score_bypassed=score_bypassed,
        proof_source=proof_source if eligible else None,
    )


async def _proof_usage(
    session: AsyncSession,
    panda_id: str,
) -> tuple[datetime | None, int]:
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    recent = await session.execute(
        select(ChainExecutionLog.created_at)
        .where(
            ChainExecutionLog.panda_id == panda_id,
            ChainExecutionLog.status.in_(("confirmed", "submitted")),
        )
        .order_by(ChainExecutionLog.created_at.desc())
        .limit(1)
    )
    recent_at = recent.scalar_one_or_none()

    count_result = await session.execute(
        select(func.count())
        .select_from(ChainExecutionLog)
        .where(
            ChainExecutionLog.panda_id == panda_id,
            ChainExecutionLog.created_at >= day_start,
            ChainExecutionLog.status == "confirmed",
        )
    )
    return recent_at, int(count_result.scalar_one() or 0)


async def load_proof_context(
    session: AsyncSession,
    panda_id: str,
    trade_fact_id: str,
) -> tuple[TradeFact, OrderIntent, TradingPolicy | None]:
    fact_result = await session.execute(
        select(TradeFact).where(TradeFact.id == trade_fact_id, TradeFact.panda_id == panda_id)
    )
    fact = fact_result.scalar_one_or_none()
    if fact is None:
        raise ApiError(ApiErrorCode.TRADE_FACT_NOT_FOUND, "Trade fact not found")

    intent_result = await session.execute(
        select(OrderIntent).where(OrderIntent.id == fact.order_intent_id)
    )
    intent = intent_result.scalar_one_or_none()
    if intent is None:
        raise ApiError(ApiErrorCode.TRADE_FACT_NOT_FOUND, "Linked order intent not found")

    policy: TradingPolicy | None = None
    if intent.policy_id:
        policy_result = await session.execute(
            select(TradingPolicy).where(TradingPolicy.id == intent.policy_id)
        )
        policy = policy_result.scalar_one_or_none()

    return fact, intent, policy


def _policy_mirror(policy: TradingPolicy | None) -> PolicyMirror | None:
    if policy is None:
        return None
    pairs = policy.allowed_pairs if isinstance(policy.allowed_pairs, list) else []
    return PolicyMirror(
        version=policy.version,
        allowed_pairs=[str(p) for p in pairs],
        max_notional_per_trade=float(policy.max_notional_per_trade),
        max_daily_loss=float(policy.max_daily_loss),
        paused=bool(policy.paused),
        agent_revoked=not bool(policy.authorized_agent),
        mirror_synced=bool(policy.sui_object_id),
    )


def trade_fact_dict(fact: TradeFact) -> dict[str, Any]:
    return {
        "id": fact.id,
        "panda_id": fact.panda_id,
        "pair": fact.pair,
        "side": fact.side,
        "proof_status": fact.proof_status,
        "proof_key": fact.proof_key,
        "decision_snapshot": fact.decision_snapshot or {},
        "policy_snapshot": fact.policy_snapshot or {},
        "fact_hash": fact.fact_hash,
    }


def order_intent_dict(intent: OrderIntent) -> dict[str, Any]:
    return {
        "id": intent.id,
        "policy_version": intent.policy_version,
        "pair": intent.pair,
        "side": intent.side,
        "notional": float(intent.notional or 0),
        "reference_price": float(intent.reference_price or 0),
        "final_score": float(intent.final_score) if intent.final_score is not None else None,
        "decision_hash": intent.decision_hash,
        "status": intent.status,
    }


async def check_eligibility(
    session: AsyncSession,
    panda_id: str,
    trade_fact_id: str,
    *,
    manual: bool = False,
) -> EligibilityResult:
    fact, intent, policy = await load_proof_context(session, panda_id, trade_fact_id)
    recent_at, proofs_today = await _proof_usage(session, panda_id)
    return evaluate_eligibility(
        trade_fact=trade_fact_dict(fact),
        order_intent=order_intent_dict(intent),
        policy=_policy_mirror(policy),
        manual=manual,
        recent_proof_at=recent_at,
        proofs_today=proofs_today,
    )


async def request_chain_proof(
    session: AsyncSession,
    panda_id: str,
    trade_fact_id: str,
    *,
    manual: bool = True,
    requested_by: str | None = None,
) -> dict[str, Any]:
    if not settings.chain_proof_enabled:
        raise ApiError(ApiErrorCode.CHAIN_PROOF_DISABLED, "Chain Proof Mode 2 is disabled")

    fact, intent, policy = await load_proof_context(session, panda_id, trade_fact_id)
    eligibility = await check_eligibility(session, panda_id, trade_fact_id, manual=manual)
    if not eligibility.eligible:
        raise ApiError(
            ApiErrorCode.TRADE_FACT_PROOF_NOT_ELIGIBLE,
            eligibility.reasons[0] if eligibility.reasons else "Trade fact is not eligible for proof",
            details={"reasons": eligibility.reasons},
        )

    proof_key = eligibility.proof_key
    assert proof_key is not None

    existing_log = await session.execute(
        select(ChainExecutionLog).where(ChainExecutionLog.proof_key == proof_key)
    )
    prior = existing_log.scalar_one_or_none()
    if prior is not None:
        raise ApiError(
            ApiErrorCode.CHAIN_PROOF_DUPLICATE,
            "This Trade Fact was already submitted for Chain Proof",
            details={
                "tx_digest": prior.tx_digest,
                "status": prior.status,
                "chain_execution_log_id": prior.id,
            },
        )

    idempotency_key = f"chain_proof:{proof_key}"
    job = await enqueue_job(
        session,
        job_type="chain_proof_requested",
        idempotency_key=idempotency_key,
        payload={
            "panda_id": panda_id,
            "trade_fact_id": trade_fact_id,
            "order_intent_id": intent.id,
            "proof_key": proof_key,
            "proof_source": eligibility.proof_source or ("manual" if manual else "auto"),
            "manual_requested_by": requested_by,
            "policy_version": intent.policy_version,
            "decision_hash": intent.decision_hash,
        },
        priority=50 if manual else 80,
    )

    fact.proof_status = "requested"
    fact.proof_key = proof_key
    intent.proof_requested = True
    intent.proof_request_source = eligibility.proof_source or ("manual" if manual else "auto")
    intent.proof_key = proof_key

    await session.commit()
    return {
        "trade_fact_id": trade_fact_id,
        "proof_key": proof_key,
        "status": "queued" if job else "already_queued",
        "job_id": job.id if job else None,
        "proof_source": eligibility.proof_source,
        "score_bypassed": eligibility.score_bypassed,
    }


async def maybe_auto_select_proof(
    session: AsyncSession,
    panda_id: str,
    trade_fact_id: str,
) -> dict[str, Any] | None:
    """Called after Trade Fact commit — enqueue automatic proof when eligible."""
    if not settings.chain_proof_enabled:
        return None
    eligibility = await check_eligibility(session, panda_id, trade_fact_id, manual=False)
    if not eligibility.eligible:
        return None
    return await request_chain_proof(session, panda_id, trade_fact_id, manual=False)

"""Trade review persistence and orchestration (Epic 7)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AsyncJob, TradeFact, TradeReview
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.async_job_queue import enqueue_job
from app.services.review_logic import (
    analyze_hypotheses,
    build_evidence_payload,
    build_reason_summary,
    compute_review_hash,
    compute_verdict,
    has_required_evidence,
    is_position_closed,
)


def trade_fact_to_dict(fact: TradeFact) -> dict[str, Any]:
    return {
        "id": fact.id,
        "panda_id": fact.panda_id,
        "order_intent_id": fact.order_intent_id,
        "pair": fact.pair,
        "side": fact.side,
        "closed_at": fact.closed_at,
        "realized_pnl": fact.realized_pnl,
        "realized_pnl_pct": fact.realized_pnl_pct,
        "decision_snapshot": fact.decision_snapshot or {},
        "market_snapshot": fact.market_snapshot or {},
        "outcome": fact.outcome or {},
        "policy_snapshot": fact.policy_snapshot or {},
        "ledger_snapshot_before": fact.ledger_snapshot_before or {},
        "ledger_snapshot_after": fact.ledger_snapshot_after or {},
        "fact_hash": fact.fact_hash,
        "review_status": fact.review_status,
    }


def review_to_dict(review: TradeReview, skill_update: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": review.id,
        "panda_id": review.panda_id,
        "trade_fact_id": review.trade_fact_id,
        "verdict": review.verdict,
        "reason_summary": review.reason_summary,
        "evidence": review.evidence or {},
        "hypotheses": review.hypotheses or [],
        "reviewer": review.reviewer,
        "review_hash": review.review_hash,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }
    if skill_update is not None:
        payload["skill_update"] = skill_update
    return payload


async def load_trade_fact(
    session: AsyncSession,
    panda_id: str,
    trade_fact_id: str,
) -> TradeFact:
    result = await session.execute(
        select(TradeFact).where(
            TradeFact.id == trade_fact_id,
            TradeFact.panda_id == panda_id,
        )
    )
    fact = result.scalar_one_or_none()
    if fact is None:
        raise ApiError(ApiErrorCode.TRADE_FACT_NOT_FOUND, "Trade fact not found")
    return fact


async def get_review_for_fact(
    session: AsyncSession,
    trade_fact_id: str,
) -> TradeReview | None:
    result = await session.execute(
        select(TradeReview).where(TradeReview.trade_fact_id == trade_fact_id)
    )
    return result.scalar_one_or_none()


async def request_review(
    session: AsyncSession,
    panda_id: str,
    trade_fact_id: str,
    *,
    source: str = "manual",
) -> dict[str, Any]:
    fact = await load_trade_fact(session, panda_id, trade_fact_id)
    existing = await get_review_for_fact(session, trade_fact_id)
    if existing is not None:
        raise ApiError(ApiErrorCode.TRADE_FACT_ALREADY_REVIEWED, "Trade fact already reviewed")

    if not is_position_closed(trade_fact_to_dict(fact)):
        raise ApiError(
            ApiErrorCode.REVIEW_NOT_READY,
            "Review not ready — position is not closed",
        )

    job = await enqueue_job(
        session,
        job_type="review_requested",
        idempotency_key=f"review:{trade_fact_id}",
        payload={"panda_id": panda_id, "trade_fact_id": trade_fact_id, "source": source},
    )
    await session.commit()
    return {
        "trade_fact_id": trade_fact_id,
        "status": "queued" if job else "already_queued",
        "job_id": job.id if job else None,
    }


async def run_review_for_fact(
    session: AsyncSession,
    panda_id: str,
    trade_fact_id: str,
) -> TradeReview:
    fact = await load_trade_fact(session, panda_id, trade_fact_id)
    existing = await get_review_for_fact(session, trade_fact_id)
    if existing is not None:
        return existing

    fact_dict = trade_fact_to_dict(fact)
    if not is_position_closed(fact_dict):
        raise ApiError(ApiErrorCode.REVIEW_NOT_READY, "Position not closed")
    if not has_required_evidence(fact_dict):
        raise ApiError(ApiErrorCode.REVIEW_EVIDENCE_MISSING, "Missing evidence for review")

    realized = float(fact.realized_pnl or 0)
    verdict = compute_verdict(realized)
    hypotheses = analyze_hypotheses(fact_dict)
    evidence = build_evidence_payload(fact_dict)
    review_hash = compute_review_hash(panda_id, trade_fact_id, hypotheses)

    review = TradeReview(
        panda_id=panda_id,
        trade_fact_id=trade_fact_id,
        verdict=verdict,
        reason_summary=build_reason_summary(verdict, hypotheses),
        evidence=evidence,
        hypotheses=hypotheses,
        reviewer="agent",
        review_hash=review_hash,
    )
    session.add(review)
    fact.review_status = "reviewed"
    await session.flush()

    await enqueue_job(
        session,
        job_type="review_completed",
        idempotency_key=f"skill_memory:{review.id}",
        payload={"panda_id": panda_id, "review_id": review.id, "trade_fact_id": trade_fact_id},
    )
    from app.workers.walrus_sync_worker import enqueue_walrus_archive_job

    await enqueue_walrus_archive_job(
        session,
        archive_type="review_batch",
        panda_id=panda_id,
        review_id=review.id,
    )
    return review


async def list_reviews(
    session: AsyncSession,
    panda_id: str,
    *,
    limit: int = 20,
) -> list[dict[str, Any]]:
    result = await session.execute(
        select(TradeReview)
        .where(TradeReview.panda_id == panda_id)
        .order_by(TradeReview.created_at.desc())
        .limit(limit)
    )
    return [review_to_dict(r) for r in result.scalars().all()]

"""Skill Memory versioned updates from evidence-backed reviews (Epic 7)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AsyncJob, Panda, SkillMemory, SkillVersion, TradeReview
from app.services.review_logic import (
    compute_skill_hash,
    should_update_skill,
    skill_update_status,
)


def skill_memory_to_dict(mem: SkillMemory) -> dict[str, Any]:
    return {
        "id": mem.id,
        "panda_id": mem.panda_id,
        "scope": mem.scope,
        "pair": mem.pair,
        "market_regime": mem.market_regime,
        "rule_text": mem.rule_text,
        "confidence": float(mem.confidence or 0),
        "status": mem.status,
        "evidence_trade_fact_ids": mem.evidence_trade_fact_ids or [],
        "version": int(mem.version),
        "memory_hash": mem.memory_hash,
        "created_at": mem.created_at.isoformat() if mem.created_at else None,
    }


def skill_version_to_dict(row: SkillVersion) -> dict[str, Any]:
    return {
        "id": row.id,
        "panda_id": row.panda_id,
        "version": int(row.version),
        "skill_hash": row.skill_hash,
        "walrus_blob_id": row.walrus_blob_id,
        "submitted_tx_digest": row.submitted_tx_digest,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def walrus_archive_status_from_job(
    row: SkillVersion,
    job: AsyncJob | None,
) -> dict[str, Any]:
    if row.walrus_blob_id:
        return {
            "status": "archived",
            "walrus_blob_id": row.walrus_blob_id,
            "reason": None,
            "error_message": None,
        }
    if job is None:
        return {
            "status": "not_requested",
            "walrus_blob_id": None,
            "reason": "archive_job_not_found",
            "error_message": None,
        }
    if job.status in {"pending", "running"}:
        return {
            "status": "pending",
            "walrus_blob_id": None,
            "reason": None,
            "error_message": None,
        }
    if job.status == "completed":
        return {
            "status": "unavailable",
            "walrus_blob_id": None,
            "reason": "walrus_not_configured_or_unavailable",
            "error_message": None,
        }
    return {
        "status": "failed",
        "walrus_blob_id": None,
        "reason": "walrus_archive_failed",
        "error_message": job.last_error,
    }


async def apply_skill_update_from_review(
    session: AsyncSession,
    review: TradeReview,
    trade_fact: dict[str, Any],
) -> dict[str, Any] | None:
    hypotheses = review.hypotheses or []
    if not should_update_skill(hypotheses):
        return {
            "updated": False,
            "reason": "insufficient_evidence",
            "message": "Evidence too weak; skill memory unchanged.",
        }

    status = skill_update_status(hypotheses) or "supported"
    primary = hypotheses[0]
    pair = trade_fact.get("pair")
    regime = (trade_fact.get("market_snapshot") or {}).get("market_regime")
    scope = "pair" if pair else "global"
    confidence = 0.55 if status == "supported" else 0.82
    rule_text = (
        f"When {primary.get('thesis', 'signal')} aligns on {pair or 'market'}, "
        f"favor {trade_fact.get('side', 'BUY')} with policy bounds."
    )

    panda_result = await session.execute(select(Panda).where(Panda.id == review.panda_id))
    panda = panda_result.scalar_one()
    next_version = int(panda.active_skill_version or 0) + 1

    memory_hash_payload = {
        "rule_text": rule_text,
        "status": status,
        "evidence_trade_fact_ids": [review.trade_fact_id],
        "confidence": confidence,
    }
    memory = SkillMemory(
        panda_id=review.panda_id,
        scope=scope,
        pair=pair,
        market_regime=regime,
        rule_text=rule_text,
        confidence=confidence,
        status=status,
        evidence_trade_fact_ids=[review.trade_fact_id],
        version=next_version,
        memory_hash=compute_skill_hash(review.panda_id, next_version, [memory_hash_payload]),
    )
    session.add(memory)

    all_memories_result = await session.execute(
        select(SkillMemory)
        .where(
            SkillMemory.panda_id == review.panda_id,
            SkillMemory.status.in_(("supported", "verified")),
        )
        .order_by(SkillMemory.version.desc())
    )
    active_memories = [
        {
            "rule_text": m.rule_text,
            "status": m.status,
            "confidence": float(m.confidence or 0),
            "evidence_trade_fact_ids": m.evidence_trade_fact_ids or [],
        }
        for m in all_memories_result.scalars().all()
    ]
    active_memories.append(memory_hash_payload)
    skill_hash = compute_skill_hash(review.panda_id, next_version, active_memories)

    skill_version = SkillVersion(
        panda_id=review.panda_id,
        version=next_version,
        skill_hash=skill_hash,
    )
    session.add(skill_version)

    panda.active_skill_version = next_version
    await session.flush()

    from app.db.models import TradeFact

    fact = await session.get(TradeFact, review.trade_fact_id)
    if fact:
        fact.skill_version_before = next_version - 1
        fact.skill_version_after = next_version

    return {
        "updated": True,
        "skill_version": next_version,
        "skill_hash": skill_hash,
        "memory": skill_memory_to_dict(memory),
        "skill_version_row": skill_version_to_dict(skill_version),
    }


async def get_latest_skill_version(
    session: AsyncSession,
    panda_id: str,
) -> dict[str, Any] | None:
    result = await session.execute(
        select(SkillVersion)
        .where(SkillVersion.panda_id == panda_id)
        .order_by(SkillVersion.version.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    data = skill_version_to_dict(row)
    job_result = await session.execute(
        select(AsyncJob).where(
            AsyncJob.idempotency_key
            == f"walrus:skill_snapshot/{panda_id}/{row.id}"
        )
    )
    data["walrus_archive"] = walrus_archive_status_from_job(
        row,
        job_result.scalar_one_or_none(),
    )
    return data


async def list_skill_memories(
    session: AsyncSession,
    panda_id: str,
    *,
    limit: int = 20,
) -> list[dict[str, Any]]:
    result = await session.execute(
        select(SkillMemory)
        .where(SkillMemory.panda_id == panda_id)
        .order_by(SkillMemory.version.desc())
        .limit(limit)
    )
    return [skill_memory_to_dict(m) for m in result.scalars().all()]

"""SkillMemoryWorker — updates skill only from supported/verified review evidence."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TradeReview
from app.services.review_service import trade_fact_to_dict
from app.services.skill_memory_service import apply_skill_update_from_review

logger = logging.getLogger(__name__)


async def process_skill_memory_job(
    session: AsyncSession,
    payload: dict[str, Any],
) -> dict[str, Any]:
    review_id = payload["review_id"]
    result = await session.execute(select(TradeReview).where(TradeReview.id == review_id))
    review = result.scalar_one_or_none()
    if review is None:
        return {"updated": False, "reason": "review_not_found"}

    from app.services.review_service import load_trade_fact

    fact = await load_trade_fact(session, review.panda_id, review.trade_fact_id)
    outcome = apply_skill_update_from_review(
        session,
        review,
        trade_fact_to_dict(fact),
    )
    if outcome and outcome.get("updated"):
        skill_version_row = outcome.get("skill_version_row") or {}
        version = int(outcome.get("skill_version") or 0)
        version_id = skill_version_row.get("id")
        if version > 0 and version_id:
            from app.workers.skill_digest_worker import enqueue_skill_digest_job
            from app.workers.walrus_sync_worker import enqueue_walrus_archive_job

            await enqueue_skill_digest_job(
                session,
                panda_id=review.panda_id,
                skill_version=version,
                skill_version_id=version_id,
            )
            await enqueue_walrus_archive_job(
                session,
                archive_type="skill_snapshot",
                panda_id=review.panda_id,
                skill_version_id=version_id,
            )
    await session.commit()
    return outcome or {"updated": False, "reason": "insufficient_evidence"}

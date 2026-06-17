"""ReviewWorker — evidence-backed win/loss review after position close."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.review_service import run_review_for_fact, trade_fact_to_dict

logger = logging.getLogger(__name__)


async def process_review_job(
    session: AsyncSession,
    payload: dict[str, Any],
) -> dict[str, Any]:
    panda_id = payload["panda_id"]
    trade_fact_id = payload["trade_fact_id"]
    review = await run_review_for_fact(session, panda_id, trade_fact_id)
    await session.commit()
    return {
        "review_id": review.id,
        "trade_fact_id": trade_fact_id,
        "verdict": review.verdict,
        "hypotheses": review.hypotheses,
    }


async def enqueue_position_closed_review(
    session: AsyncSession,
    trade_fact_id: str,
    panda_id: str,
) -> None:
    from app.services.async_job_queue import enqueue_job

    await enqueue_job(
        session,
        job_type="position_closed",
        idempotency_key=f"review:{trade_fact_id}",
        payload={"panda_id": panda_id, "trade_fact_id": trade_fact_id, "source": "position_closed"},
    )

"""Post Trade Fact commit hooks — enqueue durable async work (not on hot path)."""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TradeFact
from app.services.review_logic import is_position_closed
from app.services.review_service import trade_fact_to_dict
from app.workers.review_worker import enqueue_position_closed_review

logger = logging.getLogger(__name__)


async def after_trade_fact_committed(
    session: AsyncSession,
    *,
    panda_id: str,
    trade_fact: TradeFact,
) -> None:
    """Enqueue review when a round-trip position is fully closed (manual Chain Proof only)."""
    fact_dict = trade_fact_to_dict(trade_fact)
    if not is_position_closed(fact_dict):
        return
    await enqueue_position_closed_review(session, trade_fact.id, panda_id)
    logger.info(
        "Queued position_closed review for panda=%s trade_fact=%s",
        panda_id,
        trade_fact.id,
    )

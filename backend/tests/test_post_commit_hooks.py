"""Post Trade Fact commit hooks."""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.services import post_commit_hooks


def _closed_fact():
    return SimpleNamespace(
        id="fact-1",
        panda_id="panda-1",
        order_intent_id="intent-1",
        pair="DEEP/SUI",
        side="SELL",
        closed_at="2026-06-20T00:00:00Z",
        realized_pnl=10,
        realized_pnl_pct=0.001,
        decision_snapshot={"reason": "trend", "final_score": 0.8},
        market_snapshot={"market_regime": "bull"},
        outcome={"entry_price": 1.0, "exit_price": 1.1},
        policy_snapshot={},
        ledger_snapshot_before={},
        ledger_snapshot_after={},
        fact_hash="hash",
        review_status="pending_review",
    )


def test_after_trade_fact_committed_enqueues_review_for_closed_fact(monkeypatch):
    async def scenario():
        enqueue = AsyncMock()
        session = AsyncMock()
        monkeypatch.setattr(post_commit_hooks, "enqueue_position_closed_review", enqueue)

        await post_commit_hooks.after_trade_fact_committed(
            session,
            panda_id="panda-1",
            trade_fact=_closed_fact(),
        )

        enqueue.assert_awaited_once_with(session, "fact-1", "panda-1")

    asyncio.run(scenario())

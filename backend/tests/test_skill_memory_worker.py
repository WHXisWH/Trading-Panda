"""SkillMemoryWorker async orchestration."""

import asyncio
import sys
from types import ModuleType
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.workers import skill_memory_worker


class _ReviewResult:
    def scalar_one_or_none(self):
        return SimpleNamespace(id="review-1", panda_id="panda-1", trade_fact_id="fact-1")


def test_process_skill_memory_job_awaits_skill_update(monkeypatch):
    async def scenario():
        session = AsyncMock()
        session.execute.return_value = _ReviewResult()
        fact = SimpleNamespace(
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
            review_status="reviewed",
        )

        async def load_fact(_session, panda_id, trade_fact_id):
            assert panda_id == "panda-1"
            assert trade_fact_id == "fact-1"
            return fact

        async def apply_update(_session, review, trade_fact):
            assert review.id == "review-1"
            assert trade_fact["id"] == "fact-1"
            return {
                "updated": True,
                "skill_version": 1,
                "skill_version_row": {"id": "skill-version-1"},
            }

        enqueue_digest = AsyncMock()
        enqueue_walrus = AsyncMock()
        digest_module = ModuleType("app.workers.skill_digest_worker")
        digest_module.enqueue_skill_digest_job = enqueue_digest
        walrus_module = ModuleType("app.workers.walrus_sync_worker")
        walrus_module.enqueue_walrus_archive_job = enqueue_walrus
        monkeypatch.setitem(sys.modules, "app.workers.skill_digest_worker", digest_module)
        monkeypatch.setitem(sys.modules, "app.workers.walrus_sync_worker", walrus_module)
        monkeypatch.setattr(skill_memory_worker, "load_trade_fact", load_fact)
        monkeypatch.setattr(skill_memory_worker, "apply_skill_update_from_review", apply_update)

        result = await skill_memory_worker.process_skill_memory_job(
            session,
            {"review_id": "review-1"},
        )

        assert result["updated"] is True
        enqueue_digest.assert_awaited_once()
        enqueue_walrus.assert_awaited_once()
        session.commit.assert_awaited_once()

    asyncio.run(scenario())

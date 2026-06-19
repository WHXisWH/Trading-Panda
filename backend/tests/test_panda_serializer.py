"""Panda detail serializer — active strategy id on wire."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.panda_serializer import panda_detail_dict


def _mock_panda() -> MagicMock:
    panda = MagicMock()
    panda.id = "panda-1"
    panda.sui_object_id = "0xpanda"
    panda.owner_id = "user-1"
    panda.boldness = 50
    panda.patience = 50
    panda.intuition = 50
    panda.focus = 50
    panda.contrarian = 50
    panda.talent = 1
    panda.experience_level = 10
    panda.emotion_state = "focused"
    panda.emotion_stability = 50
    panda.is_trading = False
    panda.subscribed_pools = ["DEEP/SUI"]
    panda.walrus_sync_status = "pending"
    panda.generation = 1
    panda.created_at = None
    panda.updated_at = None
    return panda


@pytest.mark.asyncio
async def test_panda_detail_dict_includes_active_strategy_id(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        "app.services.panda_serializer.trade_stats_for_panda",
        AsyncMock(return_value=(0, None)),
    )

    panda = _mock_panda()
    strategy = MagicMock()
    strategy.id = "strategy-abc"
    strategy.philosophy = "trend_following"
    strategy.proficiency = 42

    data = await panda_detail_dict(panda, AsyncMock(), strategy=strategy)

    assert data["active_strategy_id"] == "strategy-abc"
    assert data["current_strategy"] == {
        "philosophy": "trend_following",
        "proficiency": 42,
    }


@pytest.mark.asyncio
async def test_panda_detail_dict_null_active_strategy_id_without_strategy(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        "app.services.panda_serializer.trade_stats_for_panda",
        AsyncMock(return_value=(0, None)),
    )

    data = await panda_detail_dict(_mock_panda(), AsyncMock(), strategy=None)

    assert data["active_strategy_id"] is None
    assert data["current_strategy"] is None

"""TradeFactWriter uses the freshest TradingPolicy mirror before execution."""

from __future__ import annotations

import pytest
from types import SimpleNamespace

from app.db.models import PandaVault, TradingPolicy
from app.engine.decision_pipeline import DecisionResult
from app.engine.market_event import MarketEvent
from app.services.policy_compatibility import PolicyMirror
from app.services.trade_fact_writer import TradeFactWriter


class _FakeSession:
    def __init__(self, policy_row, vault_row) -> None:
        self.policy_row = policy_row
        self.vault_row = vault_row
        self.added = []

    async def get(self, model, row_id):
        if model is TradingPolicy:
            return self.policy_row
        if model is PandaVault:
            return self.vault_row
        return None

    def add(self, row) -> None:
        self.added.append(row)

    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        return None


class _FakeLedger:
    async def get_or_create_account(self, *args, **kwargs):
        return SimpleNamespace(equity=10_000, cash_balance=10_000)

    async def daily_realized_loss(self, *args, **kwargs):
        return 0

    async def apply_execution(self, *args, **kwargs):
        raise AssertionError("paused policy must reject before ledger mutation")


def _event() -> MarketEvent:
    return MarketEvent(
        asset="DEEP",
        pair="DEEP-SUI",
        timestamp=1_700_000_000,
        price=0.024,
        prev_price=0.023,
        volume=1_000,
        rsi=82,
        ma20=0.02,
        prev_ma20=0.019,
        macd_signal=True,
        volatility=0.03,
        trend_strength=0.8,
        market_regime="bull",
        reference_price=0.024,
        stale=False,
        health="fresh",
    )


def _execute_result() -> DecisionResult:
    return DecisionResult(
        final_score=0.92,
        action="BUY",
        steps=[],
        zone="EXECUTE",
        entry_delay=0,
        entry_threshold=0.65,
        position_factor=1.0,
        emotion_position_mod=1.0,
        emotion_stoploss_mod=1.0,
        signal_direction=1,
    )


@pytest.mark.asyncio
async def test_commit_tick_reloads_paused_policy_before_execution():
    stale_policy = PolicyMirror(
        version=1,
        allowed_pairs=["DEEP-SUI"],
        max_notional_per_trade=100,
        max_daily_loss=8,
        paused=False,
        agent_revoked=False,
        mirror_synced=True,
    )
    fresh_policy_row = SimpleNamespace(
        id="policy-1",
        version=2,
        allowed_pairs=["DEEP-SUI"],
        max_notional_per_trade=100,
        max_daily_loss=8,
        paused=True,
        authorized_agent="0xagent",
        sui_object_id="0xpolicy",
    )
    vault_row = SimpleNamespace(sui_object_id="0xvault")
    session = _FakeSession(fresh_policy_row, vault_row)
    writer = TradeFactWriter(ledger=_FakeLedger())

    result = await writer.commit_tick(
        session,
        panda_id="panda-1",
        vault_id="vault-1",
        policy_id="policy-1",
        policy=stale_policy,
        simulation_id="sim-1",
        strategy_id="strategy-1",
        event=_event(),
        result=_execute_result(),
        emotion="focused",
        strategy_version=1,
        skill_version=0,
        initial_capital=10_000,
        position_pct=0.01,
        stop_loss=0.03,
    )

    assert result.status == "REJECTED"
    assert result.executed is False
    assert result.trade_fact_payload is None
    assert result.rejection_reason == "TradingPolicy is paused — paper execution blocked."
    assert result.order_intent_payload["policy_version"] == 2

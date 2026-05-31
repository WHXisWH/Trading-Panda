"""PandaActor — one asyncio coroutine per trading panda."""
from __future__ import annotations

import asyncio
import logging
import random
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from sqlalchemy import select, update

from app.config import settings
from app.db.database import AsyncSessionLocal, ensure_engine, ensure_engine
from app.db.models import EmotionLog, Panda, Simulation, Trade
from app.engine.decision_pipeline import DecisionPipeline, DecisionResult
from app.engine.emotion_state_machine import EmotionContext, EmotionStateMachine
from app.engine.event_publisher import EventPublisher
from app.engine.experience_engine import ExperienceEngine
from app.engine.market_event import MarketEvent
from app.engine.merkle_worker import compute_merkle_root
from app.engine.panda_loader import load_actor_context
from app.engine.strategy_ghost import GhostManager
from app.integrations.deepseek import agent_coordinator

logger = logging.getLogger(__name__)


@dataclass
class PandaActorState:
    panda_id: str
    simulation_id: str
    speed: str
    emotion: str = "focused"
    trade_count: int = 0
    equity: float = 10_000.0
    personality: dict[str, Any] = field(default_factory=dict)
    active_strategy: dict[str, Any] = field(default_factory=dict)
    experience: dict[str, Any] = field(default_factory=dict)
    subscribed_assets: list[str] = field(default_factory=list)
    positions: dict[str, float] = field(default_factory=dict)
    last_decision: dict[str, Any] | None = None


class PandaActor:
    """One actor = one panda running in simulation."""

    def __init__(
        self,
        panda_id: str,
        simulation_id: str,
        speed: str,
        publisher: EventPublisher | None = None,
        seed: int | None = None,
    ) -> None:
        self.state = PandaActorState(
            panda_id=panda_id,
            simulation_id=simulation_id,
            speed=speed,
        )
        self._pipeline = DecisionPipeline(rng=random.Random(seed))
        self._emotion_machine = EmotionStateMachine()
        self._emotion_ctx = EmotionContext()
        self._experience_engine = ExperienceEngine(panda_id)
        self._ghosts = GhostManager()
        self._publisher = publisher
        self._running = False
        self._tick_queue: asyncio.Queue[MarketEvent] = asyncio.Queue(maxsize=64)
        self._pending_delay: dict[str, Any] | None = None
        self._peak_equity = 10_000.0

    async def hydrate(self) -> bool:
        ensure_engine()
        if AsyncSessionLocal is None:
            return False
        async with AsyncSessionLocal() as session:
            ctx = await load_actor_context(session, self.state.panda_id)
        if ctx is None:
            return False
        self.state.personality = ctx["personality"]
        self.state.active_strategy = ctx["strategy"]
        self.state.experience = ctx["experience"]
        self.state.emotion = ctx["emotion"]
        self._ghosts = GhostManager()
        for ghost in ctx.get("ghosts") or []:
            self._ghosts.ghosts.append(ghost)
        self._emotion_ctx = EmotionContext(
            current=ctx["emotion"],
            talent=int(ctx["personality"].get("talent", 0)),
        )
        return True

    def accepts_asset(self, asset: str) -> bool:
        if not self.state.subscribed_assets:
            return True
        return asset in self.state.subscribed_assets

    def subscribe_asset(self, asset: str) -> None:
        max_assets = 1 + int(self.state.personality.get("focus", 50)) // 25
        if asset not in self.state.subscribed_assets:
            self.state.subscribed_assets.append(asset)
        self.state.subscribed_assets = self.state.subscribed_assets[:max_assets]

    async def enqueue_tick(self, event: MarketEvent) -> None:
        if not self.accepts_asset(event.asset):
            return
        try:
            self._tick_queue.put_nowait(event)
        except asyncio.QueueFull:
            try:
                self._tick_queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
            self._tick_queue.put_nowait(event)

    async def run(self) -> None:
        self._running = True
        await self.hydrate()
        while self._running:
            try:
                event = await asyncio.wait_for(self._tick_queue.get(), timeout=60.0)
                await self._tick(event)
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Actor %s tick error: %s", self.state.panda_id, exc)

    def stop(self) -> None:
        self._running = False

    async def _tick(self, event: MarketEvent) -> None:
        if self._pending_delay is not None:
            self._pending_delay["remaining_delay"] -= 1
            if self._pending_delay["remaining_delay"] > 0:
                return
            event = self._pending_delay.get("event", event)
            self._pending_delay = None

        market = event.to_market_dict()
        self.subscribe_asset(event.asset)

        ghost_weight, ghost_strategy = self._ghosts.blended_old_signal_strength(market)
        result = self._pipeline.run(
            market_data=market,
            personality=self.state.personality,
            strategy=self.state.active_strategy,
            experience=self.state.experience,
            emotion=self.state.emotion,
            ghost_weight=ghost_weight,
            ghost_strategy=ghost_strategy,
            positions=self.state.positions,
        )

        if result.entry_delay > 0 and result.zone == "EXECUTE":
            self._pending_delay = {
                "remaining_delay": result.entry_delay,
                "event": event,
                "result": result,
            }
            return

        await self._apply_decision(event, result)

    async def _apply_decision(self, event: MarketEvent, result: DecisionResult) -> None:
        if result.zone == "OBSERVE" and self.state.speed != "instant":
            if settings.deepseek_api_key:
                try:
                    agent = await agent_coordinator(
                        {
                            "final_score": result.final_score,
                            "emotion": self.state.emotion,
                            "market_summary": f"{event.asset} rsi={event.rsi:.1f}",
                            "philosophy": self.state.active_strategy.get("philosophy"),
                        },
                        timeout=float(settings.agent_timeout_seconds),
                    )
                    if agent.get("decision") in ("BUY", "SELL"):
                        result = DecisionResult(
                            final_score=result.final_score,
                            action=agent["decision"],
                            steps=result.steps,
                            zone="EXECUTE",
                            entry_delay=result.entry_delay,
                            entry_threshold=result.entry_threshold,
                            position_factor=result.position_factor,
                            emotion_position_mod=result.emotion_position_mod,
                            emotion_stoploss_mod=result.emotion_stoploss_mod,
                            signal_direction=1 if agent["decision"] == "BUY" else -1,
                        )
                except Exception:
                    pass

        self.state.last_decision = {
            "action": result.action,
            "final_score": round(result.final_score, 4),
            "zone": result.zone,
            "steps": result.steps,
            "asset": event.asset,
            "price": event.price,
            "timestamp": event.timestamp,
        }

        if self._publisher:
            await self._publisher.publish_decision(
                self.state.panda_id,
                self.state.last_decision,
            )

        if result.zone == "EXECUTE":
            await self._execute_trade(event, result)
        elif result.zone == "OBSERVE":
            self._emotion_ctx.idle_count += 1
            new_emotion = self._emotion_machine.transition(self._emotion_ctx, "idle")
            await self._update_emotion(new_emotion, "idle")
        else:
            self._emotion_ctx.idle_count += 1
            self._emotion_machine.transition(self._emotion_ctx, "idle")

    async def _execute_trade(self, event: MarketEvent, result: DecisionResult) -> None:
        sizing = self.state.active_strategy.get("position_sizing", {})
        risk = self.state.active_strategy.get("risk_management", {})
        base_pct = float(sizing.get("value", sizing.get("max_position_pct", 0.05)))
        position_pct = min(
            0.25,
            base_pct * result.position_factor * result.emotion_position_mod,
        )
        stop_loss = max(
            0.03,
            float(risk.get("stop_loss_pct", risk.get("stopLoss", 0.08)))
            * result.emotion_stoploss_mod,
        )

        pnl_pct = self._simulate_pnl(event, result.action, position_pct, stop_loss)
        self.state.equity *= 1 + pnl_pct
        self._peak_equity = max(self._peak_equity, self.state.equity)
        drawdown = 1 - self.state.equity / self._peak_equity if self._peak_equity else 0

        if pnl_pct > 0:
            new_emotion = self._emotion_machine.transition(self._emotion_ctx, "win", pnl_pct)
        else:
            new_emotion = self._emotion_machine.transition(
                self._emotion_ctx, "loss", abs(pnl_pct)
            )
        if drawdown > 0.10:
            new_emotion = self._emotion_machine.transition(
                self._emotion_ctx, "drawdown", drawdown
            )
        await self._update_emotion(new_emotion, "trade")

        self.state.trade_count += 1
        self._ghosts.on_trade()
        qty = position_pct * self.state.equity / max(event.price, 1e-9)
        if result.action == "BUY":
            self.state.positions[event.asset] = self.state.positions.get(event.asset, 0) + qty
        elif result.action == "SELL":
            self.state.positions[event.asset] = max(
                0, self.state.positions.get(event.asset, 0) - qty
            )

        await self._persist_trade(event, result, position_pct, pnl_pct, stop_loss)

    def _simulate_pnl(
        self, event: MarketEvent, action: str, position_pct: float, stop_loss: float
    ) -> float:
        """MVP paper trade — bias from RSI mean reversion + noise."""
        edge = (50 - event.rsi) / 500
        if action == "SELL":
            edge = -edge
        noise = self._pipeline._rng.uniform(-stop_loss, stop_loss)
        return (edge + noise) * position_pct

    async def _update_emotion(self, new_state: str, trigger: str) -> None:
        if new_state == self.state.emotion:
            return
        old = self.state.emotion
        self.state.emotion = new_state
        self._emotion_ctx.current = new_state  # type: ignore[assignment]

        if self._publisher:
            await self._publisher.publish_emotion(
                self.state.panda_id,
                {"from": old, "to": new_state, "trigger": trigger},
            )

        ensure_engine()
        if AsyncSessionLocal is None:
            return
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Panda)
                .where(Panda.id == self.state.panda_id)
                .values(emotion_state=new_state)
            )
            session.add(
                EmotionLog(
                    panda_id=self.state.panda_id,
                    from_state=old,
                    to_state=new_state,
                    trigger=trigger,
                )
            )
            await session.commit()

    async def _persist_trade(
        self,
        event: MarketEvent,
        result: DecisionResult,
        position_pct: float,
        pnl_pct: float,
        stop_loss: float,
    ) -> None:
        ensure_engine()
        if AsyncSessionLocal is None:
            return
        strategy_id = self.state.active_strategy.get("strategy_id")
        if not strategy_id:
            return

        async with AsyncSessionLocal() as session:
            trade = Trade(
                panda_id=self.state.panda_id,
                strategy_id=strategy_id,
                simulation_id=self.state.simulation_id,
                asset=event.asset[:5],
                action=result.action,
                price=Decimal(str(event.price)),
                quantity=Decimal(str(position_pct * self.state.equity / max(event.price, 1))),
                position_size_pct=Decimal(str(position_pct)),
                final_score=Decimal(str(round(result.final_score, 4))),
                emotion_at_trade=self.state.emotion,
                proficiency_at_trade=int(
                    self.state.active_strategy.get("proficiency", 0)
                ),
                pnl_pct=Decimal(str(round(pnl_pct, 6))),
                decision_details={"steps": result.steps, "zone": result.zone},
            )
            session.add(trade)
            await session.flush()

            sim_result = await session.execute(
                select(Simulation).where(Simulation.id == self.state.simulation_id)
            )
            sim = sim_result.scalar_one_or_none()
            if sim:
                sim.total_trades = int(sim.total_trades or 0) + 1
                sim.final_equity = Decimal(str(round(self.state.equity, 2)))

            await self._experience_engine.record_trade(
                session,
                {"asset": event.asset, "pnl_pct": pnl_pct},
            )
            await session.commit()

            if self._publisher:
                await self._publisher.publish_trade_executed(
                    self.state.panda_id,
                    {
                        "id": trade.id,
                        "panda_id": self.state.panda_id,
                        "simulation_id": self.state.simulation_id,
                        "strategy_id": strategy_id,
                        "asset": trade.asset,
                        "action": trade.action,
                        "price": float(trade.price),
                        "quantity": float(trade.quantity),
                        "position_size_pct": float(trade.position_size_pct),
                        "final_score": float(trade.final_score),
                        "emotion_at_trade": trade.emotion_at_trade,
                        "pnl_pct": float(trade.pnl_pct) if trade.pnl_pct is not None else None,
                        "decision_details": trade.decision_details,
                        "created_at": trade.created_at.isoformat() if trade.created_at else None,
                        "pair": event.pair,
                    },
                )

        if self.state.trade_count % settings.merkle_batch_size == 0:
            logger.info(
                "Merkle batch ready for panda %s (%d trades)",
                self.state.panda_id,
                self.state.trade_count,
            )
            compute_merkle_root([])

    def snapshot(self) -> dict:
        return {
            "panda_id": self.state.panda_id,
            "simulation_id": self.state.simulation_id,
            "emotion": self.state.emotion,
            "trade_count": self.state.trade_count,
            "equity": round(self.state.equity, 2),
            "speed": self.state.speed,
            "subscribed_assets": self.state.subscribed_assets,
            "last_decision": self.state.last_decision,
            "positions": self.state.positions,
        }

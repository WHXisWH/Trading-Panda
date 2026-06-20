"""PandaActor — one asyncio coroutine per trading panda."""
from __future__ import annotations

import asyncio
import logging
import random
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select, update

from app.config import settings
import app.db.database as database
from app.db.database import ensure_engine
from app.db.models import EmotionLog, Panda, PandaVault, TradingPolicy
from app.services.policy_compatibility import PolicyMirror, policy_mirror_from_row
from app.services.trade_fact_writer import TradeFactWriter
from app.engine.decision_pipeline import DecisionPipeline, DecisionResult
from app.engine.emotion_state_machine import EmotionContext, EmotionStateMachine
from app.engine.event_publisher import EventPublisher
from app.engine.experience_engine import ExperienceEngine
from app.engine.market_event import MarketEvent
from app.engine.panda_loader import load_actor_context, load_skill_memories
from app.engine.social_signal import derive_social_signal
from app.engine.strategy_ghost import GhostManager
from app.integrations.deepseek import agent_coordinator
from app.services.market_pairs import canonical_market_pair

logger = logging.getLogger(__name__)


@dataclass
class PandaActorState:
    panda_id: str
    simulation_id: str
    speed: str
    emotion: str = "focused"
    trade_count: int = 0
    equity: float = 10_000.0
    initial_capital: float = 10_000.0
    vault_id: str | None = None
    policy_id: str | None = None
    policy_mirror: PolicyMirror | None = None
    personality: dict[str, Any] = field(default_factory=dict)
    active_strategy: dict[str, Any] = field(default_factory=dict)
    experience: dict[str, Any] = field(default_factory=dict)
    skill_memories: list[dict[str, Any]] = field(default_factory=list)
    subscribed_assets: list[str] = field(default_factory=list)
    positions: dict[str, float] = field(default_factory=dict)
    last_decision: dict[str, Any] | None = None
    last_order_intent: dict[str, Any] | None = None
    last_trade_fact: dict[str, Any] | None = None


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
        self._trade_writer = TradeFactWriter()
        self._running = False
        self._tick_queue: asyncio.Queue[MarketEvent] = asyncio.Queue(maxsize=64)
        self._pending_delay: dict[str, Any] | None = None
        self._peak_equity = 10_000.0
        self._tick_count = 0

    async def hydrate(self) -> bool:
        ensure_engine()
        if database.AsyncSessionLocal is None:
            return False
        async with database.AsyncSessionLocal() as session:
            ctx = await load_actor_context(session, self.state.panda_id)
            panda_row = await session.get(Panda, self.state.panda_id)
            if panda_row and panda_row.active_policy_id:
                policy_row = await session.get(TradingPolicy, panda_row.active_policy_id)
                vault_row = (
                    await session.get(PandaVault, panda_row.active_vault_id)
                    if panda_row.active_vault_id
                    else None
                )
                if policy_row:
                    from app.services.agent_wallet import is_mirror_synced

                    self.state.policy_id = policy_row.id
                    self.state.vault_id = panda_row.active_vault_id
                    self.state.policy_mirror = policy_mirror_from_row(
                        policy_row,
                        mirror_synced=is_mirror_synced(vault_row, policy_row),
                    )
        if ctx is None:
            return False
        if ctx.get("strategy_id") is None:
            logger.warning("Actor hydrate failed for %s — no active strategy", self.state.panda_id)
            return False
        self.state.personality = ctx["personality"]
        self.state.active_strategy = ctx["strategy"]
        self.state.experience = ctx["experience"]
        self.state.skill_memories = ctx.get("skill_memories") or []
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
        normalized = canonical_market_pair(asset).upper()
        subscribed = {canonical_market_pair(item).upper() for item in self.state.subscribed_assets}
        if normalized in subscribed:
            return True
        if "-" not in normalized:
            return normalized in {item for item in subscribed if "-" not in item}
        return False

    def subscribe_asset(self, asset: str) -> None:
        max_assets = 1 + int(self.state.personality.get("focus", 50)) // 25
        if asset not in self.state.subscribed_assets:
            self.state.subscribed_assets.append(asset)
        self.state.subscribed_assets = self.state.subscribed_assets[:max_assets]

    async def enqueue_tick(self, event: MarketEvent) -> None:
        if not self.accepts_asset(event.asset) and not self.accepts_asset(event.pair):
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
        if not self.state.active_strategy and not await self.hydrate():
            self._running = False
            return
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
        if not event.is_tradeable():
            await self._apply_stale_hold(event)
            return

        if self._pending_delay is not None:
            self._pending_delay["remaining_delay"] -= 1
            if self._pending_delay["remaining_delay"] > 0:
                return
            delayed_event = self._pending_delay["event"]
            delayed_result = self._pending_delay["result"]
            self._pending_delay = None
            await self._apply_decision(delayed_event, delayed_result)
            return

        self._tick_count += 1
        if (
            self._tick_count % settings.skill_reload_tick_interval == 0
            and self._tick_count > 0
        ):
            await self._reload_skill_memories()

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
            social_signal=derive_social_signal(event),
            skill_memories=self.state.skill_memories,
        )

        if result.entry_delay > 0 and result.zone == "EXECUTE":
            self._pending_delay = {
                "remaining_delay": result.entry_delay,
                "event": event,
                "result": result,
            }
            return

        await self._apply_decision(event, result)

    async def _apply_stale_hold(self, event: MarketEvent) -> None:
        self.state.last_decision = {
            "action": "HOLD",
            "final_score": 0.0,
            "zone": "OBSERVE",
            "steps": [],
            "asset": event.asset,
            "price": event.price,
            "timestamp": event.timestamp,
            "market_stale": True,
            "health": event.health,
        }
        if self._publisher:
            await self._publisher.publish_decision(
                self.state.panda_id,
                self.state.last_decision,
            )
            await self._publisher.publish_market_stale(
                self.state.panda_id,
                {"health": event.health, "pair": event.pair, "asset": event.asset},
            )

    async def _apply_decision(self, event: MarketEvent, result: DecisionResult) -> None:
        if (
            result.zone == "OBSERVE"
            and self.state.speed != "instant"
            and abs(result.final_score) >= 0.40
            and settings.deepseek_api_key
        ):
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
            except Exception as exc:
                logger.warning(
                    "Agent coordinator failed for panda %s: %s",
                    self.state.panda_id,
                    exc,
                )

        self.state.last_decision = {
            "action": result.action,
            "final_score": round(result.final_score, 4),
            "zone": result.zone,
            "steps": result.steps,
            "asset": event.asset,
            "price": event.price,
            "timestamp": event.timestamp,
            "entry_threshold": round(result.entry_threshold, 4),
        }

        if self._publisher:
            await self._publisher.publish_decision(
                self.state.panda_id,
                self.state.last_decision,
            )

        if result.zone == "EXECUTE":
            await self._execute_trade(event, result)
        elif result.zone in ("OBSERVE", "IGNORE"):
            await self._persist_hold_intent(event, result)
            self._emotion_ctx.idle_count += 1
            new_emotion = self._emotion_machine.transition(self._emotion_ctx, "idle")
            await self._update_emotion(new_emotion, "idle")

    def _position_sizing(self, result: DecisionResult) -> tuple[float, float]:
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
        return position_pct, stop_loss

    async def _persist_hold_intent(self, event: MarketEvent, result: DecisionResult) -> None:
        ensure_engine()
        if database.AsyncSessionLocal is None:
            return
        hold_result = DecisionResult(
            final_score=result.final_score,
            action="HOLD",
            steps=result.steps,
            zone=result.zone,
            entry_delay=result.entry_delay,
            entry_threshold=result.entry_threshold,
            position_factor=result.position_factor,
            emotion_position_mod=result.emotion_position_mod,
            emotion_stoploss_mod=result.emotion_stoploss_mod,
            signal_direction=0,
        )
        async with database.AsyncSessionLocal() as session:
            commit = await self._trade_writer.commit_tick(
                session,
                panda_id=self.state.panda_id,
                vault_id=self.state.vault_id,
                policy_id=self.state.policy_id,
                policy=self.state.policy_mirror,
                simulation_id=self.state.simulation_id,
                strategy_id=self.state.active_strategy.get("strategy_id"),
                event=event,
                result=hold_result,
                emotion=self.state.emotion,
                strategy_version=int(self.state.active_strategy.get("strategy_version", 0)),
                skill_version=int(self.state.active_strategy.get("skill_version", 0)),
                initial_capital=self.state.initial_capital,
                position_pct=0.0,
                stop_loss=0.0,
                publisher=self._publisher,
            )
        self.state.last_order_intent = commit.order_intent_payload

    async def _execute_trade(self, event: MarketEvent, result: DecisionResult) -> None:
        position_pct, stop_loss = self._position_sizing(result)

        ensure_engine()
        if database.AsyncSessionLocal is None:
            return

        async with database.AsyncSessionLocal() as session:
            commit = await self._trade_writer.commit_tick(
                session,
                panda_id=self.state.panda_id,
                vault_id=self.state.vault_id,
                policy_id=self.state.policy_id,
                policy=self.state.policy_mirror,
                simulation_id=self.state.simulation_id,
                strategy_id=self.state.active_strategy.get("strategy_id"),
                event=event,
                result=result,
                emotion=self.state.emotion,
                strategy_version=int(self.state.active_strategy.get("strategy_version", 0)),
                skill_version=int(self.state.active_strategy.get("skill_version", 0)),
                initial_capital=self.state.initial_capital,
                position_pct=position_pct,
                stop_loss=stop_loss,
                publisher=self._publisher,
            )

        self.state.last_order_intent = commit.order_intent_payload
        self.state.last_trade_fact = commit.trade_fact_payload

        if not commit.executed:
            if commit.rejection_reason and self._publisher:
                await self._publisher.publish_policy_rejected(
                    self.state.panda_id,
                    {
                        "order_intent_id": commit.order_intent_id,
                        "reason": commit.rejection_reason,
                    },
                )
            return

        pnl_pct = 0.0
        if commit.trade_fact_payload:
            realized = commit.trade_fact_payload.get("realized_pnl")
            if realized is not None:
                pnl_pct = float(realized) / max(self.state.initial_capital, 1.0)

        self.state.equity = float(
            (commit.trade_fact_payload or {}).get("ledger_snapshot_after", {}).get(
                "equity", self.state.equity
            )
        )
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
        ledger_positions = (
            (commit.trade_fact_payload or {})
            .get("ledger_snapshot_after", {})
            .get("positions", [])
        )
        for pos in ledger_positions:
            self.state.positions[pos["asset"]] = pos["quantity"]

        if commit.executed and commit.trade_fact_payload:
            ensure_engine()
            if database.AsyncSessionLocal is not None:
                async with database.AsyncSessionLocal() as session:
                    await self._experience_engine.record_trade(
                        session,
                        {
                            "asset": event.asset,
                            "pnl_pct": pnl_pct,
                            "trade_id": commit.trade_fact_id,
                        },
                        market=event.to_market_dict(),
                    )
                    await session.commit()

        if self._publisher and commit.trade_fact_payload:
            await self._publisher.publish_trade_executed(
                self.state.panda_id,
                {
                    **commit.trade_fact_payload,
                    "order_intent_id": commit.order_intent_id,
                    "simulation_id": self.state.simulation_id,
                    "pair": event.pair,
                },
            )

        if self.state.trade_count % settings.merkle_batch_size == 0:
            await self._enqueue_merkle_batch()

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
        if database.AsyncSessionLocal is None:
            return
        async with database.AsyncSessionLocal() as session:
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

    async def _enqueue_merkle_batch(self) -> None:
        """Every MERKLE_BATCH_SIZE trades: enqueue durable Merkle batch job."""
        from sqlalchemy.exc import OperationalError, ProgrammingError

        from app.workers.merkle_worker import enqueue_merkle_batch_job

        ensure_engine()
        if database.AsyncSessionLocal is None:
            return
        batch_index = self.state.trade_count // settings.merkle_batch_size
        try:
            async with database.AsyncSessionLocal() as session:
                await enqueue_merkle_batch_job(
                    session,
                    panda_id=self.state.panda_id,
                    batch_index=batch_index,
                    trade_count=self.state.trade_count,
                )
                await session.commit()
                logger.info(
                    "Merkle batch %d queued for panda %s (%d trades)",
                    batch_index,
                    self.state.panda_id,
                    self.state.trade_count,
                )
        except (ProgrammingError, OperationalError):
            pass

    async def _reload_skill_memories(self) -> None:
        ensure_engine()
        if database.AsyncSessionLocal is None:
            return
        try:
            async with database.AsyncSessionLocal() as session:
                memories = await load_skill_memories(session, self.state.panda_id)
            if memories:
                self.state.skill_memories = memories
        except Exception as exc:
            logger.debug("Skill memory reload skipped for %s: %s", self.state.panda_id, exc)

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
            "last_order_intent": self.state.last_order_intent,
            "last_trade_fact": self.state.last_trade_fact,
            "positions": self.state.positions,
            "policy_version": (
                self.state.policy_mirror.version if self.state.policy_mirror else None
            ),
        }

"""PandaActor — one asyncio coroutine per trading panda.

Listens to market data on Redis channel, runs the 8-step decision pipeline,
updates emotion state machine, updates experience engine, triggers Merkle Root
worker every MERKLE_BATCH_SIZE trades.
"""
import asyncio
from dataclasses import dataclass, field
from typing import Any, Dict

from app.engine.decision_pipeline import DecisionPipeline
from app.engine.emotion_state_machine import EmotionStateMachine
from app.engine.experience_engine import ExperienceEngine


@dataclass
class PandaActorState:
    panda_id: str
    simulation_id: str
    speed: str
    emotion: str = "focused"
    trade_count: int = 0
    equity: float = 10_000.0
    personality: Dict[str, Any] = field(default_factory=dict)
    active_strategy: Dict[str, Any] = field(default_factory=dict)


class PandaActor:
    """One actor = one panda running in simulation."""

    def __init__(self, panda_id: str, simulation_id: str, speed: str) -> None:
        self.state = PandaActorState(
            panda_id=panda_id, simulation_id=simulation_id, speed=speed
        )
        self._pipeline = DecisionPipeline()
        self._emotion_machine = EmotionStateMachine()
        self._experience = ExperienceEngine(panda_id)
        self._running = False

    async def run(self) -> None:
        """Main loop — subscribe to Redis market data and tick."""
        self._running = True
        # TODO: connect to Redis Pub/Sub channel f"market:{asset}"
        # TODO: on each market event → self._tick(market_data)
        while self._running:
            await asyncio.sleep(1)  # placeholder

    async def _tick(self, market_data: dict) -> None:
        """Run 8-step decision pipeline for one market tick."""
        # TODO: load panda personality + active strategy from DB
        # TODO: call self._pipeline.run(...)
        # TODO: if trade executed → update experience + emotion + check Merkle
        pass

    def snapshot(self) -> dict:
        return {
            "panda_id": self.state.panda_id,
            "simulation_id": self.state.simulation_id,
            "emotion": self.state.emotion,
            "trade_count": self.state.trade_count,
            "equity": self.state.equity,
            "speed": self.state.speed,
        }

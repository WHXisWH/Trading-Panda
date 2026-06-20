"""ActorManager — manages concurrent PandaActors + market tick fan-out."""
from __future__ import annotations

import asyncio
import logging
from typing import Optional
from datetime import datetime

from app.config import settings
import app.db.database as database
from app.db.database import ensure_engine
from app.db.models import Panda, Simulation
from app.engine.event_publisher import EventPublisher
from app.engine.market_consumer import MarketDataConsumer
from app.engine.market_event import MarketEvent
from app.engine.panda_actor import PandaActor
from app.services.market_pairs import canonical_market_pair
from app.services.pool_catalog import normalize_subscribed_pools

logger = logging.getLogger(__name__)


class ActorManager:
    def __init__(self) -> None:
        self._actors: dict[str, PandaActor] = {}
        self._tasks: dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()
        self._publisher = EventPublisher(settings.redis_url)
        self._market_consumer = MarketDataConsumer(
            settings.redis_url,
            self.broadcast_market_tick,
        )

    async def startup(self) -> None:
        await self._publisher.connect()
        await self._market_consumer.start()

    async def shutdown(self) -> None:
        for panda_id in list(self._actors.keys()):
            await self.stop(panda_id)
        await self._market_consumer.stop()
        await self._publisher.close()

    async def start(
        self,
        panda_id: str,
        simulation_id: str,
        speed: str,
        subscribed_pools: list[str] | None = None,
        initial_capital: float | None = None,
    ) -> None:
        async with self._lock:
            if panda_id in self._actors:
                return

            if len(self._actors) >= settings.max_actors:
                raise RuntimeError(f"Max actor limit ({settings.max_actors}) reached")

            actor = PandaActor(
                panda_id=panda_id,
                simulation_id=simulation_id,
                speed=speed,
                publisher=self._publisher,
            )
            if subscribed_pools:
                actor.state.subscribed_assets = [
                    canonical_market_pair(pool) for pool in subscribed_pools
                ]
            if not await actor.hydrate():
                raise RuntimeError("PandaActor hydrate failed — active strategy required")
            if initial_capital is not None and initial_capital > 0:
                actor.state.equity = float(initial_capital)
                actor.state.initial_capital = float(initial_capital)
                actor._peak_equity = float(initial_capital)
            self._actors[panda_id] = actor
            self._tasks[panda_id] = asyncio.create_task(actor.run(), name=f"actor-{panda_id}")
            logger.info("Started PandaActor %s (sim=%s, speed=%s)", panda_id, simulation_id, speed)

    async def stop(self, panda_id: str) -> None:
        actor = self._actors.get(panda_id)
        if actor:
            actor.stop()
        task = self._tasks.pop(panda_id, None)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        self._actors.pop(panda_id, None)

    async def get_state(self, panda_id: str) -> Optional[dict]:
        actor = self._actors.get(panda_id)
        if actor is None:
            return None
        return actor.snapshot()

    async def broadcast_market_tick(self, event: MarketEvent) -> None:
        if not self._actors:
            return
        for actor in list(self._actors.values()):
            if actor.accepts_asset(event.asset) or actor.accepts_asset(event.pair):
                await actor.enqueue_tick(event)

    def set_subscribed_pools(self, panda_id: str, pools: list[str]) -> None:
        actor = self._actors.get(panda_id)
        if actor is not None:
            actor.state.subscribed_assets = [canonical_market_pair(pool) for pool in pools]

    async def reconcile_running_simulation(
        self,
        panda: Panda,
        simulation: Simulation,
    ) -> bool:
        """Ensure a DB-running simulation has an in-memory actor, or mark it stopped."""
        if panda.id in self._actors:
            return True
        try:
            await self.start(
                panda.id,
                simulation.id,
                simulation.speed,
                subscribed_pools=normalize_subscribed_pools(panda.subscribed_pools),
                initial_capital=float(simulation.initial_capital),
            )
            return True
        except Exception as exc:
            logger.warning(
                "Failed to recover PandaActor %s for simulation %s: %s",
                panda.id,
                simulation.id,
                exc,
            )
            simulation.status = "stopped"
            simulation.completed_at = datetime.utcnow()
            panda.is_trading = False
            return False

    async def recover_running_simulations(self, limit: int | None = None) -> int:
        """Recover DB-running simulations after process restart; invalid rows are stopped."""
        ensure_engine()
        if database.AsyncSessionLocal is None:
            return 0
        recovered = 0
        max_rows = limit or settings.max_actors
        async with database.AsyncSessionLocal() as session:
            from sqlalchemy import select

            rows = await session.execute(
                select(Simulation, Panda)
                .join(Panda, Panda.id == Simulation.panda_id)
                .where(Simulation.status == "running")
                .order_by(Simulation.started_at.desc())
                .limit(max_rows)
            )
            for simulation, panda in rows.all():
                if await self.reconcile_running_simulation(panda, simulation):
                    recovered += 1
            await session.commit()
        if recovered:
            logger.info("Recovered %d running PandaActor(s)", recovered)
        return recovered

    @property
    def active_count(self) -> int:
        return len(self._actors)

    def market_consumer_status(self) -> dict:
        return self._market_consumer.status()


actor_manager = ActorManager()

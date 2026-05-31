"""ActorManager — manages concurrent PandaActors + market tick fan-out."""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from app.config import settings
from app.engine.event_publisher import EventPublisher
from app.engine.market_consumer import MarketDataConsumer
from app.engine.market_event import MarketEvent
from app.engine.panda_actor import PandaActor

logger = logging.getLogger(__name__)


class ActorManager:
    def __init__(self) -> None:
        self._actors: dict[str, PandaActor] = {}
        self._tasks: dict[str, asyncio.Task] = {}
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
            actor.state.subscribed_assets = list(subscribed_pools)
        if initial_capital is not None and initial_capital > 0:
            actor.state.equity = float(initial_capital)
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
        for actor in list(self._actors.values()):
            if actor.accepts_asset(event.asset):
                await actor.enqueue_tick(event)

    def set_subscribed_pools(self, panda_id: str, pools: list[str]) -> None:
        actor = self._actors.get(panda_id)
        if actor is not None:
            actor.state.subscribed_assets = list(pools)

    @property
    def active_count(self) -> int:
        return len(self._actors)


actor_manager = ActorManager()

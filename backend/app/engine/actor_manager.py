"""ActorManager — manages up to MAX_ACTORS concurrent PandaActors.

Each PandaActor is an asyncio Task that runs the 8-step decision pipeline
on a loop, receiving market data via Redis Pub/Sub.
"""

import asyncio
from typing import Dict, Optional
from app.config import settings
from app.engine.panda_actor import PandaActor


class ActorManager:
    def __init__(self) -> None:
        self._actors: Dict[str, PandaActor] = {}
        self._tasks: Dict[str, asyncio.Task] = {}  # type: ignore[type-arg]

    async def start(self, panda_id: str, simulation_id: str, speed: str) -> None:
        if panda_id in self._actors:
            return  # already running

        if len(self._actors) >= settings.max_actors:
            raise RuntimeError(f"Max actor limit ({settings.max_actors}) reached")

        actor = PandaActor(panda_id=panda_id, simulation_id=simulation_id, speed=speed)
        self._actors[panda_id] = actor
        self._tasks[panda_id] = asyncio.create_task(actor.run(), name=f"actor-{panda_id}")

    async def stop(self, panda_id: str) -> None:
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


actor_manager = ActorManager()

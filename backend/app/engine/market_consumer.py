"""Subscribes to Redis market:tick:* and fans out to active PandaActors."""
from __future__ import annotations

import asyncio
import json
import logging

import redis.asyncio as aioredis

from app.engine.market_event import MarketEvent

logger = logging.getLogger(__name__)


class MarketDataConsumer:
    def __init__(self, redis_url: str, on_tick) -> None:
        self._redis_url = redis_url
        self._on_tick = on_tick
        self._client: aioredis.Redis | None = None
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        if not self._redis_url:
            logger.info("REDIS_URL not set — market consumer disabled")
            return
        self._client = aioredis.from_url(self._redis_url, decode_responses=True)
        self._task = asyncio.create_task(self._listen(), name="market-data-consumer")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _listen(self) -> None:
        assert self._client is not None
        pubsub = self._client.pubsub()
        await pubsub.psubscribe("market:tick:*")
        logger.info("Subscribed to market:tick:*")
        try:
            async for message in pubsub.listen():
                if message["type"] not in ("pmessage", "message"):
                    continue
                raw = message.get("data")
                if not raw:
                    continue
                try:
                    data = json.loads(raw) if isinstance(raw, str) else raw
                    event = MarketEvent.from_json(data)
                    await self._on_tick(event)
                except Exception as exc:
                    logger.warning("Failed to parse market tick: %s", exc)
        except asyncio.CancelledError:
            await pubsub.punsubscribe("market:tick:*")
            raise

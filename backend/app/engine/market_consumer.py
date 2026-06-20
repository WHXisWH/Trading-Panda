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
        self._subscribed = False
        self._last_error: str | None = None
        self._message_count = 0

    async def start(self) -> None:
        if not self._redis_url:
            logger.info("REDIS_URL not set — market consumer disabled")
            return
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
        self._subscribed = False

    async def _listen(self) -> None:
        while True:
            pubsub = None
            try:
                if self._client is None:
                    self._client = aioredis.from_url(self._redis_url, decode_responses=True)
                pubsub = self._client.pubsub()
                await pubsub.psubscribe("market:tick:*")
                self._subscribed = True
                self._last_error = None
                logger.info("Subscribed to market:tick:*")
                async for message in pubsub.listen():
                    if message["type"] not in ("pmessage", "message"):
                        continue
                    raw = message.get("data")
                    if not raw:
                        continue
                    try:
                        data = json.loads(raw) if isinstance(raw, str) else raw
                        event = MarketEvent.from_json(data)
                        self._message_count += 1
                        await self._on_tick(event)
                    except Exception as exc:
                        logger.warning("Failed to parse market tick: %s", exc)
            except asyncio.CancelledError:
                if pubsub is not None:
                    await pubsub.punsubscribe("market:tick:*")
                    await pubsub.aclose()
                self._subscribed = False
                raise
            except Exception as exc:
                self._subscribed = False
                self._last_error = str(exc)
                logger.warning("Market consumer disconnected: %s", exc)
                if pubsub is not None:
                    await pubsub.aclose()
                if self._client is not None:
                    await self._client.aclose()
                    self._client = None
                await asyncio.sleep(5)

    def status(self) -> dict:
        return {
            "enabled": bool(self._redis_url),
            "task_running": self._task is not None and not self._task.done(),
            "subscribed": self._subscribed,
            "last_error": self._last_error,
            "message_count": self._message_count,
        }

"""Redis Pub/Sub publisher for panda real-time events."""
from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


class EventPublisher:
    def __init__(self, redis_url: str) -> None:
        self._redis_url = redis_url
        self._client: aioredis.Redis | None = None

    async def connect(self) -> None:
        if not self._redis_url:
            return
        self._client = aioredis.from_url(self._redis_url, decode_responses=True)

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def publish(self, channel: str, payload: dict[str, Any]) -> None:
        if self._client is None:
            return
        try:
            await self._client.publish(channel, json.dumps(payload))
        except Exception as exc:
            logger.warning("Redis publish failed on %s: %s", channel, exc)

    async def publish_decision(self, panda_id: str, payload: dict[str, Any]) -> None:
        await self.publish(f"panda:{panda_id}:decision", {"event": "decision", "payload": payload})

    async def publish_emotion(self, panda_id: str, payload: dict[str, Any]) -> None:
        await self.publish(f"panda:{panda_id}:emotion", {"event": "emotion", "payload": payload})

    async def publish_trade_executed(self, panda_id: str, payload: dict[str, Any]) -> None:
        await self.publish(
            f"panda:{panda_id}:trade",
            {"event": "trade_executed", "payload": payload},
        )

    async def publish_order_intent(self, panda_id: str, payload: dict[str, Any]) -> None:
        await self.publish(
            f"panda:{panda_id}:order_intent",
            {"event": "order_intent", "payload": payload},
        )

    async def publish_execution(self, panda_id: str, payload: dict[str, Any]) -> None:
        await self.publish(
            f"panda:{panda_id}:execution",
            {"event": "execution", "payload": payload},
        )

    async def publish_policy_rejected(self, panda_id: str, payload: dict[str, Any]) -> None:
        await self.publish(
            f"panda:{panda_id}:policy",
            {"event": "policy_rejected", "payload": payload},
        )

    async def publish_market_stale(self, panda_id: str, payload: dict[str, Any]) -> None:
        await self.publish(
            f"panda:{panda_id}:market",
            {"event": "market_stale", "payload": payload},
        )

    async def publish_policy_paused(self, panda_id: str, payload: dict[str, Any]) -> None:
        await self.publish(
            f"panda:{panda_id}:policy",
            {"event": "policy_paused", "payload": payload},
        )

    async def publish_review(self, panda_id: str, payload: dict[str, Any]) -> None:
        await self.publish(
            f"panda:{panda_id}:review",
            {"event": "review_completed", "payload": payload},
        )

    async def publish_skill(self, panda_id: str, payload: dict[str, Any]) -> None:
        await self.publish(
            f"panda:{panda_id}:skill",
            {"event": "skill_updated", "payload": payload},
        )

import json
import logging

import redis.asyncio as redis

from broadcast.schemas import MarketEvent, canonical_market_pair

logger = logging.getLogger(__name__)


class RedisPublisher:
    def __init__(self, redis_url: str) -> None:
        self._redis_url = redis_url
        self._client: redis.Redis | None = None

    async def connect(self) -> None:
        if not self._redis_url:
            logger.warning("REDIS_URL not set — ticks will not be published")
            return
        self._client = redis.from_url(self._redis_url, decode_responses=True)
        await self._client.ping()

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    @property
    def is_connected(self) -> bool:
        return self._client is not None

    async def publish_tick(self, pair: str, event: MarketEvent) -> int:
        if self._client is None:
            return 0
        channel_pair = canonical_market_pair(pair)
        channel = f"market:tick:{channel_pair}"
        payload = json.dumps(event.to_publish_dict(), ensure_ascii=False)
        return await self._client.publish(channel, payload)

    async def publish_heartbeat(
        self, status: str, pools: dict[str, dict[str, float | str | None]]
    ) -> int:
        if self._client is None:
            return 0
        body = json.dumps({"status": status, "pools": pools}, ensure_ascii=False)
        return await self._client.publish("market:heartbeat", body)

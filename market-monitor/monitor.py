import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from broadcast.publisher import RedisPublisher
from broadcast.schemas import CandlePayload, MarketEvent, pair_to_asset, pool_to_pair
from config import Settings
from feed.deepbook_client import DeepBookClient
from feed.orderbook import orderbook_imbalance
from pipeline.indicators import compute_indicators
from pipeline.market_state import detect_regime

logger = logging.getLogger(__name__)


@dataclass
class PoolRuntime:
    pool: str
    pair: str
    asset: str
    last_candle_ts: float | None = None
    last_publish_ts: float | None = None
    last_error: str | None = None


@dataclass
class MonitorState:
    deepbook_ok: bool = False
    pools: dict[str, PoolRuntime] = field(default_factory=dict)
    last_heartbeat_ts: float = 0.0


class MarketMonitorService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = DeepBookClient(settings.deepbook_server_url)
        self._publisher = RedisPublisher(settings.redis_url)
        self._state = MonitorState()
        self._task: asyncio.Task[None] | None = None
        self._running = False
        self._backoff_sec = settings.poll_interval_sec

    @property
    def state(self) -> MonitorState:
        return self._state

    async def start(self) -> None:
        await self._publisher.connect()
        self._running = True
        self._task = asyncio.create_task(self._run_loop(), name="market-monitor")

    async def stop(self) -> None:
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        await self._publisher.close()

    async def _run_loop(self) -> None:
        while self._running:
            try:
                await self._tick()
                self._backoff_sec = self._settings.poll_interval_sec
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("monitor tick failed")
                self._backoff_sec = min(self._backoff_sec * 2, 60.0)
            await asyncio.sleep(self._backoff_sec)

    async def _tick(self) -> None:
        self._state.deepbook_ok = await self._client.ping()
        if not self._state.deepbook_ok:
            await self._maybe_heartbeat("degraded")
            return

        pools = await self._resolve_pools()
        for pool in pools:
            await self._poll_pool(pool)

        await self._maybe_heartbeat("ok")

    async def _resolve_pools(self) -> list[str]:
        configured = self._settings.pool_list
        if configured:
            return configured
        try:
            return await self._client.get_pools()
        except Exception as exc:
            logger.warning("get_pools failed: %s", exc)
            return list(self._state.pools.keys())

    async def _poll_pool(self, pool: str) -> None:
        pair = pool_to_pair(pool)
        asset = pair_to_asset(pair)
        runtime = self._state.pools.get(pool)
        if runtime is None:
            runtime = PoolRuntime(pool=pool, pair=pair, asset=asset)
            self._state.pools[pool] = runtime

        try:
            candles = await self._client.get_ohlcv(
                pool,
                period=self._settings.candle_period,
                limit=self._settings.ohlcv_limit,
            )
            book = await self._client.get_orderbook(pool)
            runtime.last_error = None
        except Exception as exc:
            runtime.last_error = str(exc)
            logger.warning("pool %s fetch failed: %s", pool, exc)
            return

        if not candles:
            return

        indicators = compute_indicators(candles)
        if indicators is None:
            return

        last_candle = candles[-1]
        stale = False
        if runtime.last_candle_ts is not None and last_candle.timestamp <= runtime.last_candle_ts:
            stale = True
        else:
            runtime.last_candle_ts = last_candle.timestamp

        imbalance = orderbook_imbalance(book)
        regime = detect_regime(
            indicators.price,
            indicators.ma20,
            indicators.trend_strength,
            indicators.rsi,
        )

        event = MarketEvent(
            asset=asset,
            pair=pair,
            timestamp=last_candle.timestamp,
            price=indicators.price,
            prev_price=indicators.prev_price,
            volume=indicators.volume,
            rsi=round(indicators.rsi, 4),
            ma20=round(indicators.ma20, 6),
            prev_ma20=round(indicators.prev_ma20, 6),
            macd_signal=indicators.macd_signal,
            volatility=round(indicators.volatility, 6),
            trend_strength=round(indicators.trend_strength, 4),
            market_regime=regime,
            funding_rate=0.0,
            orderbook_imbalance=round(imbalance, 4),
            candle=CandlePayload(
                open=last_candle.open,
                high=last_candle.high,
                low=last_candle.low,
                close=last_candle.close,
                volume=last_candle.volume,
                interval=self._settings.candle_period,
            ),
            stale=stale,
        )

        if stale and runtime.last_publish_ts is not None:
            if time.time() - runtime.last_publish_ts < self._settings.poll_interval_sec * 2:
                return

        receivers = await self._publisher.publish_tick(pair, event)
        runtime.last_publish_ts = time.time()
        logger.debug("published %s subscribers=%s stale=%s", pair, receivers, stale)

    async def _maybe_heartbeat(self, status: str) -> None:
        now = time.time()
        if now - self._state.last_heartbeat_ts < self._settings.publish_heartbeat_sec:
            return
        pools_payload: dict[str, dict[str, Any]] = {}
        for pool, rt in self._state.pools.items():
            pools_payload[rt.pair] = {
                "last_event_ts": rt.last_candle_ts,
                "last_publish_ts": rt.last_publish_ts,
                "error": rt.last_error,
            }
        await self._publisher.publish_heartbeat(status, pools_payload)
        self._state.last_heartbeat_ts = now

    def health_payload(self) -> dict[str, Any]:
        pools_out: dict[str, dict[str, Any]] = {}
        for pool, rt in self._state.pools.items():
            pools_out[rt.pair] = {
                "pool": pool,
                "last_event_ts": rt.last_candle_ts,
                "last_publish_ts": rt.last_publish_ts,
                "error": rt.last_error,
            }
        status = "ok" if self._state.deepbook_ok else "degraded"
        if not self._publisher.is_connected:
            status = "degraded"
        return {
            "status": status,
            "deepbook_server": self._settings.deepbook_server_url,
            "deepbook_reachable": self._state.deepbook_ok,
            "redis_connected": self._publisher.is_connected,
            "pools": pools_out,
        }

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from broadcast.publisher import RedisPublisher
from broadcast.schemas import CandlePayload, MarketEvent, pair_to_asset, pool_to_pair
from config import Settings
from feed.deepbook_client import Candle, DeepBookClient
from feed.fills_client import FillsClient
from feed.orderbook import orderbook_imbalance
from feed.sui_pool_client import discover_pools_via_rpc, normalize_pool_list
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
    pg_ok: bool = False
    sui_rpc_ok: bool = False
    pool_discovery_error: str | None = None
    pg_error: str | None = None
    pools: dict[str, PoolRuntime] = field(default_factory=dict)
    last_heartbeat_ts: float = 0.0


class MarketMonitorService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = DeepBookClient(
            settings.deepbook_server_url,
            orderbook_depth=settings.orderbook_depth,
            orderbook_level=settings.orderbook_level,
        )
        self._fills = FillsClient(
            settings.deepbook_database_url,
            price_scale=settings.price_scale,
            qty_scale=settings.qty_scale,
        )
        self._publisher = RedisPublisher(settings.redis_url)
        self._state = MonitorState()
        self._pool_directory: dict[str, str] = {}
        self._task: asyncio.Task[None] | None = None
        self._running = False
        self._backoff_sec = settings.poll_interval_sec

    @property
    def state(self) -> MonitorState:
        return self._state

    def _use_pg_ohlcv(self) -> bool:
        return self._fills.is_configured and not self._settings.use_ohlcv_fallback

    async def start(self) -> None:
        await self._publisher.connect()
        if self._fills.is_configured:
            try:
                await self._fills.connect()
                self._state.pg_ok = await self._fills.ping()
                self._state.pg_error = None
            except Exception as exc:
                self._state.pg_ok = False
                self._state.pg_error = str(exc)
                logger.exception("DeepBook PG connect failed")
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
        await self._fills.close()
        await self._publisher.close()

    async def get_candles(
        self,
        pool: str,
        interval: str | None = None,
        limit: int | None = None,
    ) -> list[Candle]:
        period = interval or self._settings.candle_period
        count = limit or self._settings.ohlcv_limit
        if self._use_pg_ohlcv():
            return await self._fills.get_candles(
                pool,
                period,
                count,
                lookback_sec=float(self._settings.fills_lookback_sec),
            )
        return await self._client.get_ohlcv(pool, period=period, limit=count)

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
        if self._state.deepbook_ok and not self._pool_directory:
            try:
                self._pool_directory = await self._client.fetch_pool_directory()
                if self._pool_directory:
                    self._fills.set_pool_directory(self._pool_directory)
            except Exception as exc:
                logger.debug("fetch_pool_directory: %s", exc)
        if self._fills.is_configured:
            self._state.pg_ok = await self._fills.ping()
        pools = await self._resolve_pools()
        for pool in pools:
            self._ensure_pool_runtime(pool)

        can_poll = pools and (self._state.pg_ok or self._state.deepbook_ok)
        if can_poll:
            for pool in pools:
                await self._poll_pool(pool)

        status = "ok" if (self._state.pg_ok or self._state.deepbook_ok) else "degraded"
        await self._maybe_heartbeat(status)

    def _ensure_pool_runtime(self, pool: str) -> None:
        pair = pool_to_pair(pool)
        asset = pair_to_asset(pair)
        if pool not in self._state.pools:
            self._state.pools[pool] = PoolRuntime(pool=pool, pair=pair, asset=asset)

    async def _resolve_pools(self) -> list[str]:
        configured = self._settings.pool_list
        if configured:
            self._state.pool_discovery_error = None
            self._state.sui_rpc_ok = True
            return configured

        pools: list[str] = []
        self._state.pool_discovery_error = None
        self._state.sui_rpc_ok = False

        if self._settings.use_sui_rpc_for_pools and self._settings.sui_rpc_url.strip():
            try:
                rpc_pools = await discover_pools_via_rpc(
                    self._settings.sui_rpc_url.strip(),
                    self._settings.deepbook_package_id.strip(),
                    pool_module=self._settings.deepbook_pool_module.strip(),
                    limit_per_page=self._settings.pool_rpc_limit_per_page,
                    max_pages=self._settings.pool_rpc_max_pages,
                )
                self._state.sui_rpc_ok = True
                pools = normalize_pool_list(rpc_pools)
            except Exception as exc:
                self._state.pool_discovery_error = str(exc)
                self._state.sui_rpc_ok = False
                logger.warning("Sui RPC pool discovery failed: %s", exc)

        if not pools and self._settings.use_http_get_pools_fallback:
            try:
                directory = await self._client.fetch_pool_directory()
                self._pool_directory = directory
                http_pools = await self._client.get_pools()
                pools = normalize_pool_list(pools + http_pools)
            except Exception as exc:
                if self._state.pool_discovery_error is None:
                    self._state.pool_discovery_error = str(exc)
                logger.warning("HTTP get_pools failed: %s", exc)

        if pools:
            if self._pool_directory:
                self._fills.set_pool_directory(self._pool_directory)
            return pools
        return list(self._state.pools.keys())

    async def _fetch_candles(self, pool: str) -> list[Candle]:
        if self._use_pg_ohlcv():
            return await self._fills.get_candles(
                pool,
                self._settings.candle_period,
                self._settings.ohlcv_limit,
                lookback_sec=float(self._settings.fills_poll_lookback_sec),
            )
        return await self._client.get_ohlcv(
            pool,
            period=self._settings.candle_period,
            limit=self._settings.ohlcv_limit,
        )

    async def _describe_empty_candles(self, pool: str) -> str:
        if not self._use_pg_ohlcv():
            return "no_candles: ohlcv_fallback_empty"
        pool_key = await self._fills.resolve_pool_key(pool)
        if pool_key is None:
            return "pool_unresolved: check get_pools / DEEPBOOK_POOLS"
        total = await self._fills.count_fills(pool)
        if total == 0:
            return "no_fills_ever: indexer has no trades for this pool"
        since = time.time() - float(self._settings.fills_poll_lookback_sec)
        in_window = await self._fills.count_fills(pool, since_sec=since)
        if in_window == 0:
            hours = int(self._settings.fills_poll_lookback_sec / 3600)
            return f"no_fills_in_poll_window: no trades in last {hours}h"
        return "no_candles: fills present but aggregation produced no bars"

    async def _poll_pool(self, pool: str) -> None:
        pair = pool_to_pair(pool)
        asset = pair_to_asset(pair)
        runtime = self._state.pools.get(pool)
        if runtime is None:
            runtime = PoolRuntime(pool=pool, pair=pair, asset=asset)
            self._state.pools[pool] = runtime

        book: dict[str, Any] = {}
        try:
            candles = await self._fetch_candles(pool)
        except Exception as exc:
            runtime.last_error = str(exc)
            logger.warning("pool %s candle fetch failed: %s", pool, exc)
            return

        if self._state.deepbook_ok:
            try:
                book = await self._client.get_orderbook(pool)
            except Exception as exc:
                logger.warning(
                    "pool %s orderbook failed (tick continues, imbalance=0): %s",
                    pool,
                    exc,
                )
                book = {}

        runtime.last_error = None

        if not candles:
            runtime.last_error = await self._describe_empty_candles(pool)
            return

        indicators = compute_indicators(candles)
        if indicators is None:
            runtime.last_error = (
                f"insufficient_candles: need >=2 bars, got {len(candles)}"
            )
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
        status = "ok" if (self._state.pg_ok or self._state.deepbook_ok) else "degraded"
        if not self._publisher.is_connected:
            status = "degraded"
        return {
            "status": status,
            "ohlcv_source": "order_fills" if self._use_pg_ohlcv() else "deepbook_http",
            "poll_interval_sec": self._settings.poll_interval_sec,
            "fills_poll_lookback_sec": self._settings.fills_poll_lookback_sec,
            "fills_lookback_sec": self._settings.fills_lookback_sec,
            "deepbook_server": self._settings.deepbook_server_url,
            "deepbook_reachable": self._state.deepbook_ok,
            "deepbook_database_configured": self._fills.is_configured,
            "pg_ok": self._state.pg_ok,
            "pg_error": self._state.pg_error,
            "sui_rpc_url": self._settings.sui_rpc_url,
            "sui_rpc_ok": self._state.sui_rpc_ok,
            "pool_discovery_error": self._state.pool_discovery_error,
            "redis_connected": self._publisher.is_connected,
            "pools": pools_out,
        }

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from broadcast.publisher import RedisPublisher
from broadcast.schemas import (
    CandlePayload,
    MarketEvent,
    PairMetaPayload,
    pair_to_asset,
    pool_to_pair,
)
from config import Settings
from feed.deepbook_client import Candle, DeepBookClient, PoolCatalogEntry
from feed.fills_client import FillsClient
from feed.orderbook import orderbook_imbalance, orderbook_summary
from feed.pair_registry import (
    PairMeta,
    build_pair_meta,
    filter_pools_for_network,
    preferred_pool_candidates,
)
from feed.sui_pool_client import discover_pools_via_rpc, normalize_pool_list
from pipeline.indicators import compute_indicators
from pipeline.market_state import detect_regime
from pipeline.pair_ranking import (
    HEALTH_FRESH,
    HEALTH_STALE,
    PairQualitySignals,
    RankedPair,
    rank_pairs,
    resolve_health,
)

logger = logging.getLogger(__name__)


@dataclass
class PoolRuntime:
    pool: str
    pair: str
    asset: str
    last_candle_ts: float | None = None
    last_publish_ts: float | None = None
    last_error: str | None = None
    health: str = HEALTH_FRESH
    freshness_sec: float | None = None
    spread_bps: float | None = None
    bid_depth: float | None = None
    ask_depth: float | None = None
    volume_24h: float = 0.0
    volume_7d: float = 0.0
    rank_score: float | None = None


@dataclass
class MonitorState:
    deepbook_ok: bool = False
    pg_ok: bool = False
    sui_rpc_ok: bool = False
    pool_discovery_error: str | None = None
    pg_error: str | None = None
    pools: dict[str, PoolRuntime] = field(default_factory=dict)
    ranked_pairs: list[RankedPair] = field(default_factory=list)
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
        self._pool_catalog: dict[str, PoolCatalogEntry] = {}
        self._discovered_pools: list[str] = []
        self._task: asyncio.Task[None] | None = None
        self._running = False
        self._backoff_sec = settings.poll_interval_sec

    @property
    def state(self) -> MonitorState:
        return self._state

    def _use_pg_ohlcv(self) -> bool:
        return self._fills.is_configured and not self._settings.use_ohlcv_fallback

    def _ohlcv_source_label(self) -> str:
        if self._use_pg_ohlcv():
            return "order_fills"
        return "indexer_http"

    async def _fetch_volume_stats(self, pool: str) -> tuple[float, float]:
        if self._fills.is_configured and self._state.pg_ok:
            return await self._fills.get_volume_stats(pool)
        if not self._state.deepbook_ok:
            return 0.0, 0.0
        catalog = self._catalog_for_pool(pool)
        quote_decimals = catalog.quote_decimals if catalog and catalog.quote_decimals else 6
        return await self._client.get_volume_stats(pool, quote_decimals=quote_decimals)

    def _catalog_for_pool(self, pool: str) -> PoolCatalogEntry | None:
        return self._pool_catalog.get(pool) or self._pool_catalog.get(
            pool.replace("/", "_")
        )

    def _pair_meta_for_pool(self, pool: str) -> PairMeta:
        catalog = self._catalog_for_pool(pool)
        pool_id = (
            self._pool_directory.get(pool)
            or self._pool_directory.get(pool.replace("/", "_"))
            or (catalog.pool_id if catalog else None)
        )
        return build_pair_meta(
            pool,
            pool_id=pool_id,
            base_decimals=catalog.base_decimals if catalog else None,
            quote_decimals=catalog.quote_decimals if catalog else None,
            min_tick_size=catalog.min_tick_size if catalog else None,
        )

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

    async def list_ranked_pairs(self) -> list[RankedPair]:
        if self._state.ranked_pairs:
            return self._state.ranked_pairs
        pools = await self._resolve_pools()
        return await self._build_rankings(pools)

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
                directory = await self._client.fetch_pool_directory()
                if directory:
                    self._pool_directory = directory
                    self._fills.set_pool_directory(self._pool_directory)
            except Exception as exc:
                logger.debug("fetch_pool_directory: %s", exc)
        if self._state.deepbook_ok and not self._pool_catalog:
            try:
                self._pool_catalog = await self._client.fetch_pool_catalog()
            except Exception as exc:
                logger.debug("fetch_pool_catalog: %s", exc)
        if self._fills.is_configured:
            self._state.pg_ok = await self._fills.ping()
        pools = await self._resolve_pools()
        for pool in pools:
            self._ensure_pool_runtime(pool)

        if self._settings.use_pair_ranking:
            self._state.ranked_pairs = await self._build_rankings(pools)

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

    async def _discover_all_pools(self) -> list[str]:
        pools: list[str] = []
        self._state.pool_discovery_error = None
        self._state.sui_rpc_ok = False

        if self._settings.use_http_pool_discovery_primary and self._settings.use_http_get_pools_fallback:
            try:
                self._state.deepbook_ok = await self._client.ping()
                if self._state.deepbook_ok:
                    directory = await self._client.fetch_pool_directory()
                    if directory:
                        self._pool_directory = directory
                        self._fills.set_pool_directory(self._pool_directory)
                    self._pool_catalog = await self._client.fetch_pool_catalog()
                    http_pools = await self._client.get_pools()
                    pools = normalize_pool_list(http_pools)
                    pools = filter_pools_for_network(
                        pools,
                        network=self._settings.deepbook_network,
                    )
            except Exception as exc:
                self._state.pool_discovery_error = str(exc)
                logger.warning("HTTP get_pools failed: %s", exc)

        if not pools and self._settings.use_sui_rpc_for_pools and self._settings.sui_rpc_url.strip():
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

        if not pools and self._settings.use_http_get_pools_fallback and not self._settings.use_http_pool_discovery_primary:
            try:
                directory = await self._client.fetch_pool_directory()
                self._pool_directory = directory
                http_pools = await self._client.get_pools()
                pools = normalize_pool_list(pools + http_pools)
                pools = filter_pools_for_network(
                    pools,
                    network=self._settings.deepbook_network,
                )
            except Exception as exc:
                if self._state.pool_discovery_error is None:
                    self._state.pool_discovery_error = str(exc)
                logger.warning("HTTP get_pools failed: %s", exc)

        if pools:
            self._discovered_pools = pools
            if self._pool_directory:
                self._fills.set_pool_directory(self._pool_directory)
            return preferred_pool_candidates(
                pools,
                network=self._settings.deepbook_network,
            )
        return []

    async def _resolve_pools(self) -> list[str]:
        configured = self._settings.pool_list
        if configured:
            self._state.pool_discovery_error = None
            self._state.sui_rpc_ok = True
            return configured

        discovered = await self._discover_all_pools()
        if not discovered:
            return list(self._state.pools.keys())

        if self._settings.use_pair_ranking:
            ranked = await self._build_rankings(discovered)
            selected = [row.meta.pool for row in ranked[: self._settings.max_publish_pairs]]
            if selected:
                return selected
        return discovered[: self._settings.max_publish_pairs]

    async def _build_rankings(self, pools: list[str]) -> list[RankedPair]:
        signal_rows: list[PairQualitySignals] = []
        for pool in pools:
            runtime = self._state.pools.get(pool)
            spread_bps = runtime.spread_bps if runtime and runtime.spread_bps is not None else 9999.0
            bid_depth = runtime.bid_depth if runtime and runtime.bid_depth is not None else 0.0
            ask_depth = runtime.ask_depth if runtime and runtime.ask_depth is not None else 0.0
            last_candle_ts = runtime.last_candle_ts if runtime else None
            monitor_error = runtime.last_error if runtime else None
            volume_24h = runtime.volume_24h if runtime else 0.0
            volume_7d = runtime.volume_7d if runtime else 0.0

            if self._fills.is_configured and self._state.pg_ok:
                try:
                    volume_24h, volume_7d = await self._fills.get_volume_stats(pool)
                except Exception as exc:
                    logger.debug("volume stats for %s: %s", pool, exc)
            elif self._state.deepbook_ok:
                try:
                    volume_24h, volume_7d = await self._fetch_volume_stats(pool)
                except Exception as exc:
                    logger.debug("indexer volume stats for %s: %s", pool, exc)

            if self._state.deepbook_ok and spread_bps >= 9999:
                try:
                    book = await self._client.get_orderbook(pool)
                    summary = orderbook_summary(book, depth=self._settings.orderbook_depth)
                    spread_bps = summary.spread_bps
                    bid_depth = summary.bid_depth
                    ask_depth = summary.ask_depth
                except Exception:
                    pass

            signal_rows.append(
                PairQualitySignals(
                    pool=pool,
                    volume_24h=volume_24h,
                    volume_7d=volume_7d,
                    spread_bps=spread_bps,
                    bid_depth=bid_depth,
                    ask_depth=ask_depth,
                    last_candle_ts=last_candle_ts,
                    candle_count=2 if last_candle_ts else 0,
                    monitor_error=monitor_error,
                    orderbook_available=spread_bps < 9999,
                    pg_ok=self._state.pg_ok,
                    deepbook_ok=self._state.deepbook_ok,
                )
            )

        return rank_pairs(
            signal_rows,
            self._pool_directory,
            stale_threshold_sec=self._settings.stale_threshold_sec,
            max_pairs=len(pools),
        )

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
            return "no_candles: indexer_http_empty"
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
        summary = orderbook_summary({}, depth=self._settings.orderbook_depth)
        try:
            candles = await self._fetch_candles(pool)
        except Exception as exc:
            runtime.last_error = str(exc)
            logger.warning("pool %s candle fetch failed: %s", pool, exc)
            return

        if self._state.deepbook_ok:
            try:
                book = await self._client.get_orderbook(pool)
                summary = orderbook_summary(book, depth=self._settings.orderbook_depth)
            except Exception as exc:
                logger.warning(
                    "pool %s orderbook failed (tick continues, imbalance=0): %s",
                    pool,
                    exc,
                )
                book = {}

        if self._fills.is_configured and self._state.pg_ok:
            try:
                runtime.volume_24h, runtime.volume_7d = await self._fills.get_volume_stats(pool)
            except Exception as exc:
                logger.debug("volume stats for %s: %s", pool, exc)
        elif self._state.deepbook_ok:
            try:
                runtime.volume_24h, runtime.volume_7d = await self._fetch_volume_stats(pool)
            except Exception as exc:
                logger.debug("indexer volume stats for %s: %s", pool, exc)

        runtime.spread_bps = summary.spread_bps
        runtime.bid_depth = summary.bid_depth
        runtime.ask_depth = summary.ask_depth
        runtime.last_error = None

        if not candles:
            runtime.last_error = await self._describe_empty_candles(pool)
            health, freshness = resolve_health(
                PairQualitySignals(
                    pool=pool,
                    monitor_error=runtime.last_error,
                    pg_ok=self._state.pg_ok,
                    deepbook_ok=self._state.deepbook_ok,
                ),
                stale_threshold_sec=self._settings.stale_threshold_sec,
            )
            runtime.health = health
            runtime.freshness_sec = freshness
            return

        indicators = compute_indicators(candles)
        if indicators is None:
            runtime.last_error = (
                f"insufficient_candles: need >=2 bars, got {len(candles)}"
            )
            health, freshness = resolve_health(
                PairQualitySignals(
                    pool=pool,
                    monitor_error=runtime.last_error,
                    last_candle_ts=candles[-1].timestamp if candles else None,
                    candle_count=len(candles),
                    pg_ok=self._state.pg_ok,
                    deepbook_ok=self._state.deepbook_ok,
                ),
                stale_threshold_sec=self._settings.stale_threshold_sec,
            )
            runtime.health = health
            runtime.freshness_sec = freshness
            return

        last_candle = candles[-1]
        stale = False
        if runtime.last_candle_ts is not None and last_candle.timestamp <= runtime.last_candle_ts:
            stale = True
        else:
            runtime.last_candle_ts = last_candle.timestamp

        now = time.time()
        freshness_sec = max(0.0, now - last_candle.timestamp)
        health, _ = resolve_health(
            PairQualitySignals(
                pool=pool,
                spread_bps=summary.spread_bps,
                bid_depth=summary.bid_depth,
                ask_depth=summary.ask_depth,
                last_candle_ts=last_candle.timestamp,
                candle_count=len(candles),
                orderbook_available=summary.mid_price > 0,
                pg_ok=self._state.pg_ok,
                deepbook_ok=self._state.deepbook_ok,
            ),
            now=now,
            stale_threshold_sec=self._settings.stale_threshold_sec,
            stale_flag=stale,
        )
        runtime.health = health
        runtime.freshness_sec = freshness_sec

        imbalance = orderbook_imbalance(book)
        regime = detect_regime(
            indicators.price,
            indicators.ma20,
            indicators.trend_strength,
            indicators.rsi,
        )

        meta = self._pair_meta_for_pool(pool)
        reference_price = summary.mid_price if summary.mid_price > 0 else indicators.price

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
            stale=stale or health == HEALTH_STALE,
            source="deepbook",
            reference_price=round(reference_price, 6),
            spread_bps=summary.spread_bps if summary.mid_price > 0 else None,
            bid_depth=summary.bid_depth if summary.mid_price > 0 else None,
            ask_depth=summary.ask_depth if summary.mid_price > 0 else None,
            freshness_sec=round(freshness_sec, 2),
            health=health,
            pair_meta=PairMetaPayload(
                pool=meta.pool,
                pair=meta.pair,
                base_asset=meta.base_asset,
                quote_asset=meta.quote_asset,
                pool_id=meta.pool_id,
                stable_quote=meta.stable_quote,
                launch_priority=meta.launch_priority,
                is_fallback=meta.is_fallback,
                base_decimals=meta.base_decimals,
                quote_decimals=meta.quote_decimals,
                min_tick_size=meta.min_tick_size,
            ),
        )

        if stale and runtime.last_publish_ts is not None:
            if time.time() - runtime.last_publish_ts < self._settings.poll_interval_sec * 2:
                return

        receivers = await self._publisher.publish_tick(pair, event)
        runtime.last_publish_ts = time.time()
        logger.debug(
            "published %s subscribers=%s stale=%s health=%s",
            pair,
            receivers,
            event.stale,
            health,
        )

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
                "health": rt.health,
                "freshness_sec": rt.freshness_sec,
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
                "health": rt.health,
                "freshness_sec": rt.freshness_sec,
                "spread_bps": rt.spread_bps,
                "volume_24h": rt.volume_24h,
            }
        ranked_out = [
            {
                "rank": row.rank,
                "pool": row.meta.pool,
                "pair": row.meta.pair,
                "score": row.score,
                "health": row.health,
                "launch_priority": row.meta.launch_priority,
                "is_fallback": row.meta.is_fallback,
            }
            for row in self._state.ranked_pairs
        ]
        status = "ok" if (self._state.pg_ok or self._state.deepbook_ok) else "degraded"
        if not self._publisher.is_connected:
            status = "degraded"
        return {
            "status": status,
            "network": self._settings.deepbook_network,
            "ohlcv_source": self._ohlcv_source_label(),
            "poll_interval_sec": self._settings.poll_interval_sec,
            "stale_threshold_sec": self._settings.stale_threshold_sec,
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
            "ranked_pairs": ranked_out,
            "pools": pools_out,
        }

    def pairs_payload(self) -> dict[str, Any]:
        rows = []
        for row in self._state.ranked_pairs:
            meta = self._pair_meta_for_pool(row.meta.pool)
            rows.append(
                {
                    "rank": row.rank,
                    "score": row.score,
                    "health": row.health,
                    "freshness_sec": row.freshness_sec,
                    "pool": meta.pool,
                    "pair": meta.pair,
                    "pool_id": meta.pool_id,
                    "base_asset": meta.base_asset,
                    "quote_asset": meta.quote_asset,
                    "stable_quote": meta.stable_quote,
                    "launch_priority": meta.launch_priority,
                    "is_fallback": meta.is_fallback,
                    "base_decimals": meta.base_decimals,
                    "quote_decimals": meta.quote_decimals,
                    "min_tick_size": meta.min_tick_size,
                    "volume_24h": row.signals.volume_24h,
                    "volume_7d": row.signals.volume_7d,
                    "spread_bps": row.signals.spread_bps,
                    "bid_depth": row.signals.bid_depth,
                    "ask_depth": row.signals.ask_depth,
                }
            )
        return {
            "network": self._settings.deepbook_network,
            "launch_pairs": self._settings.launch_pair_list,
            "pairs": rows,
        }

"""Market Monitor — DeepBook mainnet indexer (HTTP ± optional PG) → Redis market:tick:*"""

import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Query

from broadcast.schemas import pool_to_pair, normalize_pool_name
from candles_page import DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT
from config import get_settings
from monitor import MarketMonitorService
from pipeline.kline_aggregate import interval_to_seconds

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

monitor: MarketMonitorService | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    global monitor
    settings = get_settings()
    monitor = MarketMonitorService(settings)
    try:
        await monitor.start()
        logger.info(
            "Market monitor started pg=%s deepbook=%s poll=%ss",
            bool(settings.deepbook_database_url),
            settings.deepbook_server_url,
            settings.poll_interval_sec,
        )
    except Exception:
        logger.exception("Market monitor failed to start — /health still available")
    yield
    if monitor is not None:
        await monitor.stop()
    monitor = None


app = FastAPI(
    title="TradingPanda Market Monitor",
    version="0.1.0",
    description="Aggregates OHLCV from DeepBook mainnet indexer (HTTP or optional PG) and publishes market:tick:{pair} to Redis",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict:
    if monitor is None:
        return {"status": "starting"}
    return monitor.health_payload()


@app.get("/pairs")
async def list_pairs() -> dict:
    if monitor is None:
        raise HTTPException(status_code=503, detail="monitor not ready")
    return monitor.pairs_payload()


def _normalize_pool_param(pool: str) -> str:
    """Accept DEEP/SUI, DEEP-SUI, DEEP%2FSUI → DeepBook pool_name DEEP_SUI."""
    return normalize_pool_name(unquote(pool.strip()))


@app.get("/candles")
async def get_candles_query(
    pool: str = Query(..., description="Pool name, e.g. DEEP/SUI"),
    interval: str = Query(default="1m"),
    limit: int = Query(default=DEFAULT_PAGE_LIMIT, ge=1, le=MAX_PAGE_LIMIT),
    before: int | None = Query(
        default=None,
        description="Unix seconds — return candles strictly before this time (lazy load)",
    ),
) -> dict[str, Any]:
    return await _candles_response(_normalize_pool_param(pool), interval, limit, before)


@app.get("/candles/{pool:path}")
async def get_candles_path(
    pool: str,
    interval: str = Query(default="1m"),
    limit: int = Query(default=DEFAULT_PAGE_LIMIT, ge=1, le=MAX_PAGE_LIMIT),
    before: int | None = Query(default=None),
) -> dict[str, Any]:
    return await _candles_response(_normalize_pool_param(pool), interval, limit, before)


async def _candles_response(
    pool: str,
    interval: str,
    limit: int,
    before: int | None,
) -> dict[str, Any]:
    if monitor is None:
        raise HTTPException(status_code=503, detail="monitor not ready")
    try:
        interval_to_seconds(interval)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    page = await monitor.get_candles_page(pool, interval=interval, limit=limit, before=before)
    if not page.candles:
        raise HTTPException(
            status_code=404,
            detail=f"no candle data for pool={pool!r}",
        )
    pair = pool_to_pair(pool)
    return {
        "pool": pool,
        "pair": pair,
        "interval": interval,
        "has_more": page.has_more,
        "oldest_t": page.oldest_t,
        "newest_t": page.newest_t,
        "candles": [
            {
                "t": int(c.timestamp),
                "o": c.open,
                "h": c.high,
                "l": c.low,
                "c": c.close,
                "v": c.volume,
            }
            for c in page.candles
        ],
    }

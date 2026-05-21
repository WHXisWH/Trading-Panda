"""Market Monitor — order_fills (PG) or DeepBook HTTP → Redis market:tick:*"""

import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Query

from broadcast.schemas import pool_to_pair
from config import get_settings
from monitor import MarketMonitorService

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
    description="Aggregates OHLCV from order_fills (PG) and publishes market:tick:{pair} to Redis",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict:
    if monitor is None:
        return {"status": "starting"}
    return monitor.health_payload()


def _normalize_pool_param(pool: str) -> str:
    """Accept DEEP/SUI path segment or DEEP%2FSUI (decoded by Starlette)."""
    return unquote(pool.strip())


@app.get("/candles")
async def get_candles_query(
    pool: str = Query(..., description="Pool name, e.g. DEEP/SUI"),
    interval: str = Query(default="1m"),
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    return await _candles_response(_normalize_pool_param(pool), interval, limit)


@app.get("/candles/{pool:path}")
async def get_candles_path(
    pool: str,
    interval: str = Query(default="1m"),
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    return await _candles_response(_normalize_pool_param(pool), interval, limit)


async def _candles_response(pool: str, interval: str, limit: int) -> dict[str, Any]:
    if monitor is None:
        raise HTTPException(status_code=503, detail="monitor not ready")
    candles = await monitor.get_candles(pool, interval=interval, limit=limit)
    if not candles:
        raise HTTPException(
            status_code=404,
            detail=f"no candle data for pool={pool!r}",
        )
    pair = pool_to_pair(pool)
    return {
        "pool": pool,
        "pair": pair,
        "interval": interval,
        "candles": [
            {
                "t": int(c.timestamp),
                "o": c.open,
                "h": c.high,
                "l": c.low,
                "c": c.close,
                "v": c.volume,
            }
            for c in candles
        ],
    }

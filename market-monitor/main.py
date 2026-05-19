"""Market Monitor — DeepBook Server API → Redis market:tick:*"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

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
            "Market monitor started deepbook=%s poll=%ss",
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
    description="Polls DeepBook Server API and publishes market:tick:{pair} to Redis",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict:
    if monitor is None:
        return {"status": "starting"}
    return monitor.health_payload()

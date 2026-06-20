"""TradingPanda Decision Engine — FastAPI entry point"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import settings

logger = logging.getLogger(__name__)


async def _start_runtime_services() -> None:
    from app.engine.actor_manager import actor_manager
    from app.workers.job_runner import job_runner

    try:
        await actor_manager.startup()
    except Exception as exc:
        logger.exception("Actor runtime startup failed; /health remains available: %s", exc)

    try:
        await actor_manager.recover_running_simulations()
    except Exception as exc:
        logger.exception("Running simulation recovery failed: %s", exc)

    try:
        await job_runner.start()
    except Exception as exc:
        logger.exception("Async job runner startup failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema: run `alembic upgrade head` (see backend/README.md § Database)
    from app.db.database import get_engine
    from app.engine.actor_manager import actor_manager
    from app.workers.job_runner import job_runner

    db_engine = get_engine()
    runtime_task = asyncio.create_task(
        _start_runtime_services(),
        name="runtime-services-startup",
    )

    yield

    if not runtime_task.done():
        runtime_task.cancel()
        try:
            await runtime_task
        except asyncio.CancelledError:
            pass
    await job_runner.stop()
    await actor_manager.shutdown()
    if db_engine is not None:
        await db_engine.dispose()


app = FastAPI(
    title="TradingPanda Decision Engine",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    from sqlalchemy import text

    from app.db.database import get_engine

    engine = get_engine()
    from app.engine.actor_manager import actor_manager

    if engine is None:
        db_status = "not configured"
    else:
        try:
            async def _ping_db() -> None:
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))

            await asyncio.wait_for(_ping_db(), timeout=1.5)
            db_status = "connected"
        except Exception:
            db_status = "error"
    return {
        "status": "ok",
        "version": "0.1.0",
        "db": db_status,
        "redis": "configured" if settings.redis_url else "not configured",
        "active_actors": actor_manager.active_count,
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=settings.debug,
    )

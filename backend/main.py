"""TradingPanda Decision Engine — FastAPI entry point"""
import os
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema: run `alembic upgrade head` (see backend/README.md § Database)
    from app.db.database import get_engine
    from app.engine.actor_manager import actor_manager
    from app.workers.job_runner import job_runner

    db_engine = get_engine()
    await actor_manager.startup()
    await job_runner.start()

    yield

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
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
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

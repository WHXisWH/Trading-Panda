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
    # Create all tables on startup (dev convenience; use alembic in production)
    from app.db.database import engine, Base
    if engine is not None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup
    if engine is not None:
        await engine.dispose()


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
    from app.db.database import engine
    db_status = "connected" if engine is not None else "not configured"
    return {"status": "ok", "version": "0.1.0", "db": db_status}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=settings.debug,
    )

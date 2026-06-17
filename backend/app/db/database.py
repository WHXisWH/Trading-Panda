"""Async SQLAlchemy engine setup."""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.db.base import Base

__all__ = [
    "Base",
    "engine",
    "AsyncSessionLocal",
    "get_db",
    "get_engine",
    "normalize_database_url",
    "ensure_engine",
]


def normalize_database_url(url: str) -> str:
    """Ensure asyncpg driver for SQLAlchemy asyncio."""
    if not url:
        return url
    if url.startswith("postgresql://") and "+asyncpg" not in url.split("://", 1)[0]:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


def get_engine():
    url = normalize_database_url(settings.database_url)
    if not url:
        return None
    connect_args: dict[str, object] = {"timeout": 10}
    if "supabase" in url:
        connect_args["ssl"] = "require"
    # Transaction pooler (:6543) needs PgBouncer workarounds; session pooler (:5432) is fine.
    if "pooler.supabase.com" in url and ":6543" in url:
        connect_args["statement_cache_size"] = 0
        return create_async_engine(
            url,
            poolclass=NullPool,
            pool_pre_ping=True,
            echo=settings.debug,
            connect_args=connect_args,
        )
    return create_async_engine(
        url,
        pool_pre_ping=True,
        echo=settings.debug,
        connect_args=connect_args,
    )


engine = None
AsyncSessionLocal = None


def ensure_engine():
    global engine, AsyncSessionLocal
    if engine is None and settings.database_url:
        engine = get_engine()
        if engine is not None:
            AsyncSessionLocal = async_sessionmaker(
                engine, expire_on_commit=False, class_=AsyncSession
            )


async def get_db():
    ensure_engine()
    if AsyncSessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured")
    async with AsyncSessionLocal() as session:
        yield session

import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

# Ensure `backend/` is on sys.path when running `alembic` from any cwd
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from app.config import settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Sprint 0.2: only core tables are migrated; other ORM tables come in later revisions.
from app.db.models import (  # noqa: F401 — register metadata
    Panda,
    Simulation,
    Strategy,
    StrategyHistory,
    Trade,
    User,
)
from app.db.base import Base

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = _database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=_include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def _include_object(object, name, type_, reflected, compare_to):
    """Limit autogenerate to Sprint 0.2 core tables when used."""
    if type_ == "table":
        return name in {
            "users",
            "pandas",
            "strategies",
            "strategy_history",
            "simulations",
            "trades",
            "alembic_version",
        }
    return True


def do_run_migrations(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=_include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def _database_url() -> str:
    from app.db.database import normalize_database_url

    url = normalize_database_url(settings.database_url)
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy backend/.env.example → .env and configure PostgreSQL."
        )
    return url


async def run_async_migrations() -> None:
    # 不从 alembic.ini 读 URL，避免 ConfigParser 解析 %(DATABASE_URL)s 报错
    configuration = {"sqlalchemy.url": _database_url()}
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run() -> None:
    if context.is_offline_mode():
        run_migrations_offline()
    else:
        asyncio.run(run_async_migrations())


run()

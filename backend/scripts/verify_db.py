#!/usr/bin/env python3
"""Verify DATABASE_URL connectivity and Sprint 0.2 core tables."""
from __future__ import annotations

import asyncio
import sys

import _bootstrap  # noqa: F401 — must run before `app` imports

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.db.database import normalize_database_url

CORE_TABLES = (
    "users",
    "pandas",
    "strategies",
    "strategy_history",
    "simulations",
    "trades",
    # 003_growth_experience
    "experience_patterns",
    "experience_mastery",
    "experience_mistakes",
    "experience_cycles",
    "emotions_log",
    "merkle_roots",
    "achievements",
    "user_achievements",
    "checkins",
    "market_data_cache",
    "correlation_matrix",
    "panda_diary",
)


async def main() -> int:
    if not settings.database_url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 1

    url = normalize_database_url(settings.database_url)
    engine = create_async_engine(url, pool_pre_ping=True)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            print("ping: ok")

            for table in CORE_TABLES:
                result = await conn.execute(
                    text(
                        "SELECT EXISTS ("
                        "  SELECT 1 FROM information_schema.tables "
                        "  WHERE table_schema = 'public' AND table_name = :name"
                        ")"
                    ),
                    {"name": table},
                )
                exists = result.scalar()
                status = "ok" if exists else "MISSING"
                print(f"table {table}: {status}")
                if not exists:
                    return 2

            rev = await conn.execute(
                text("SELECT version_num FROM alembic_version LIMIT 1")
            )
            row = rev.first()
            print(f"alembic_version: {row[0] if row else '(empty)'}")
    finally:
        await engine.dispose()

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

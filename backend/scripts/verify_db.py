#!/usr/bin/env python3
"""Verify DATABASE_URL connectivity and core + v3.1 tables."""
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

V31_TABLES = (
    "panda_vaults",
    "trading_policies",
    "panda_accounts",
    "panda_positions",
    "order_intents",
    "ledger_entries",
    "trade_facts",
    "trade_reviews",
    "skill_memories",
    "skill_versions",
    "chain_execution_logs",
    "async_jobs",
    "outbox_events",
)

V31_INDEXES = (
    "idx_panda_vaults_panda",
    "idx_trading_policies_panda",
    "idx_panda_accounts_panda",
    "idx_order_intents_decision_hash",
    "idx_trade_facts_hash",
    "idx_async_jobs_idempotency",
    "idx_chain_execution_logs_digest",
    "idx_chain_execution_logs_idempotency",
)


async def _table_exists(conn, name: str) -> bool:
    result = await conn.execute(
        text(
            "SELECT EXISTS ("
            "  SELECT 1 FROM information_schema.tables "
            "  WHERE table_schema = 'public' AND table_name = :name"
            ")"
        ),
        {"name": name},
    )
    return bool(result.scalar())


async def _index_exists(conn, name: str) -> bool:
    result = await conn.execute(
        text(
            "SELECT EXISTS ("
            "  SELECT 1 FROM pg_indexes "
            "  WHERE schemaname = 'public' AND indexname = :name"
            ")"
        ),
        {"name": name},
    )
    return bool(result.scalar())


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

            for table in (*CORE_TABLES, *V31_TABLES):
                exists = await _table_exists(conn, table)
                status = "ok" if exists else "MISSING"
                print(f"table {table}: {status}")
                if not exists:
                    return 2

            for index in V31_INDEXES:
                exists = await _index_exists(conn, index)
                status = "ok" if exists else "MISSING"
                print(f"index {index}: {status}")
                if not exists:
                    return 3

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

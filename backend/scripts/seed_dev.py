#!/usr/bin/env python3
"""Dev-only seed: one test user, mock panda, strategy, and simulation.

Usage (from backend/):
  alembic upgrade head
  python scripts/seed_dev.py

Re-run is idempotent (skips if dev wallet already exists).
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import sys

import _bootstrap  # noqa: F401 — must run before `app` imports

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.db.database import normalize_database_url
from app.db.models import Panda, Simulation, Strategy, User

DEV_WALLET = "0xdev_seed_user_trading_panda_local_only"
DEV_SUI_OBJECT_ID = "0xdev_mock_panda_sui_object_id"

MOCK_PARSED = {
    "philosophy": "trend_following",
    "position_sizing": {"type": "fixed", "value": 0.1},
    "signal_rules": [{"indicator": "RSI", "condition": "<30", "action": "BUY"}],
    "risk_management": {"stop_loss_pct": 5, "max_drawdown_pct": 15},
}


async def main() -> int:
    if not settings.database_url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 1

    engine = create_async_engine(normalize_database_url(settings.database_url), pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with session_factory() as session:
        existing = await session.execute(
            select(User).where(User.wallet_address == DEV_WALLET)
        )
        user = existing.scalar_one_or_none()
        if user is not None:
            panda_result = await session.execute(
                select(Panda).where(Panda.owner_id == user.id).limit(1)
            )
            panda = panda_result.scalar_one_or_none()
            print("seed: already exists")
            if panda:
                print(f"  user_id={user.id}")
                print(f"  panda_id={panda.id}")
            return 0

        user = User(
            wallet_address=DEV_WALLET,
            display_name="Dev Trader",
            experience_level="intermediate",
        )
        session.add(user)
        await session.flush()

        panda = Panda(
            sui_object_id=DEV_SUI_OBJECT_ID,
            owner_id=user.id,
            boldness=72,
            patience=45,
            intuition=60,
            focus=55,
            contrarian=38,
            talent=0,
            generation=1,
            experience_level=10,
            emotion_state="focused",
            emotion_stability=48,
        )
        session.add(panda)
        await session.flush()

        strategy_hash = hashlib.sha256(
            json.dumps(MOCK_PARSED, sort_keys=True).encode()
        ).hexdigest()
        strategy = Strategy(
            panda_id=panda.id,
            raw_text="Dev seed: RSI oversold buy",
            parsed_json=MOCK_PARSED,
            strategy_hash=strategy_hash,
            philosophy="trend_following",
            proficiency=15,
            is_active=True,
        )
        session.add(strategy)
        await session.flush()

        simulation = Simulation(
            panda_id=panda.id,
            strategy_id=strategy.id,
            status="running",
            speed="1x",
            initial_capital=10000,
            final_equity=10000,
            data_source="deepbook",
        )
        session.add(simulation)
        await session.commit()

        print("seed: created dev fixtures")
        print(f"  user_id={user.id}")
        print(f"  panda_id={panda.id}")
        print(f"  strategy_id={strategy.id}")
        print(f"  simulation_id={simulation.id}")
        print(f"  wallet={DEV_WALLET}")

    await engine.dispose()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

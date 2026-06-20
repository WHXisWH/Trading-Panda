#!/usr/bin/env python3
"""Prepare a local Panda for deterministic Training Ledger BUY E2E.

Usage (from backend/):
  ./.venv-local/bin/python scripts/prepare_e2e_trade.py --panda-id <uuid>
"""
from __future__ import annotations

import argparse
import asyncio
import sys

import _bootstrap  # noqa: F401 — must run before `app` imports

from sqlalchemy import select

import app.db.database as database
from app.db.models import Panda, Strategy
from app.services.e2e_trade_fixture import (
    E2E_PERSONALITY,
    build_e2e_buy_strategy,
    build_e2e_sell_strategy,
    build_e2e_tick,
    build_e2e_sell_tick,
    e2e_strategy_hash,
)


async def prepare_panda(panda_id: str, pair: str, side: str) -> int:
    database.ensure_engine()
    if database.AsyncSessionLocal is None:
        print("DATABASE_URL is not configured", file=sys.stderr)
        return 1

    normalized_side = side.upper()
    parsed = (
        build_e2e_sell_strategy(pair)
        if normalized_side == "SELL"
        else build_e2e_buy_strategy(pair)
    )
    async with database.AsyncSessionLocal() as session:
        panda = await session.get(Panda, panda_id)
        if panda is None:
            print(f"Panda not found: {panda_id}", file=sys.stderr)
            return 1

        for field, value in E2E_PERSONALITY.items():
            setattr(panda, field, value)
        panda.emotion_state = "focused"
        panda.subscribed_pools = sorted({*(panda.subscribed_pools or []), pair})
        panda.is_trading = False

        strategy = (
            await session.execute(
                select(Strategy)
                .where(Strategy.panda_id == panda_id, Strategy.is_active == True)  # noqa: E712
                .order_by(Strategy.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if strategy is None:
            strategy = Strategy(panda_id=panda_id, is_active=True)
            session.add(strategy)

        strategy.raw_text = f"E2E fixture: {normalized_side.lower()} {pair}"
        strategy.parsed_json = parsed
        strategy.strategy_hash = e2e_strategy_hash(parsed)
        strategy.philosophy = str(parsed["philosophy"])
        strategy.proficiency = 100

        await session.commit()

    tick = build_e2e_sell_tick(pair) if normalized_side == "SELL" else build_e2e_tick(pair)
    print("prepared=true")
    print(f"panda_id={panda_id}")
    print(f"pair={pair}")
    print(f"side={normalized_side}")
    print(f"strategy_hash={e2e_strategy_hash(parsed)}")
    print(f"tick_rsi={tick['rsi']}")
    print(f"position_pct={parsed['position_sizing']['value']}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--panda-id", required=True)
    parser.add_argument("--pair", default="DEEP-SUI")
    parser.add_argument("--side", choices=["BUY", "SELL"], default="BUY")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    raise SystemExit(asyncio.run(prepare_panda(args.panda_id, args.pair, args.side)))

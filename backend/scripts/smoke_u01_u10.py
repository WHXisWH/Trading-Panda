#!/usr/bin/env python3
"""Local U-01..U-10 smoke for an existing dev Panda.

This script cannot sign wallet transactions. It validates the server/agent path
after a Panda exists in the local DB, and can create a dev-only wallet mirror.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
import uuid
from decimal import Decimal
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import _bootstrap  # noqa: F401

from sqlalchemy import select

import app.db.database as database
from app.config import settings
from app.db.models import (
    AsyncJob,
    OrderIntent,
    Panda,
    PandaAccount,
    PandaVault,
    SkillVersion,
    Strategy,
    TradeFact,
    TradingPolicy,
    TradeReview,
    User,
)
from app.services.agent_wallet import compute_policy_hash
from app.services.auth_tokens import issue_access_token
from app.services.e2e_trade_fixture import (
    E2E_PERSONALITY,
    build_e2e_buy_strategy,
    build_e2e_sell_strategy,
    build_e2e_tick,
    build_e2e_sell_tick,
    e2e_strategy_hash,
)
from app.workers.queue_dispatcher import process_pending_jobs
from app.workers.walrus_sync_worker import enqueue_walrus_archive_job


class SmokeFailure(RuntimeError):
    pass


def log(step: str, message: str) -> None:
    print(f"[{step}] {message}")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SmokeFailure(message)


def request_json(
    method: str,
    url: str,
    *,
    token: str | None = None,
    body: dict[str, Any] | None = None,
    allow_error: bool = False,
) -> tuple[int, dict[str, Any]]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body or {}).encode() if body is not None else None
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read().decode())
            return resp.status, payload
    except HTTPError as exc:
        payload = json.loads(exc.read().decode())
        if allow_error:
            return exc.code, payload
        raise SmokeFailure(f"{method} {url} failed: {exc.code} {payload}") from exc
    except URLError as exc:
        raise SmokeFailure(f"{method} {url} failed: {exc}") from exc


async def choose_panda(panda_id: str | None) -> tuple[Panda, User]:
    database.ensure_engine()
    require(database.AsyncSessionLocal is not None, "DATABASE_URL is not configured")
    async with database.AsyncSessionLocal() as session:
        if panda_id:
            panda = await session.get(Panda, panda_id)
        else:
            panda = (
                await session.execute(select(Panda).order_by(Panda.created_at.desc()).limit(1))
            ).scalar_one_or_none()
        require(panda is not None, "No Panda found. Mint or run seed_dev.py first.")
        user = await session.get(User, panda.owner_id)
        require(user is not None, "Panda owner user not found")
        return panda, user


async def ensure_dev_wallet(panda_id: str, *, pair: str, allow_create: bool) -> None:
    async with database.AsyncSessionLocal() as session:  # type: ignore[misc]
        panda = await session.get(Panda, panda_id)
        require(panda is not None, "Panda not found")
        vault = await session.get(PandaVault, panda.active_vault_id) if panda.active_vault_id else None
        policy = (
            await session.get(TradingPolicy, panda.active_policy_id)
            if panda.active_policy_id
            else None
        )
        if vault and policy and vault.sui_object_id and policy.sui_object_id:
            policy.paused = False
            vault.status = "active"
            await session.commit()
            return
        require(allow_create, "Agent Wallet mirror missing. Re-run with --prepare-dev-wallet.")

        owner = (await session.get(User, panda.owner_id)).wallet_address  # type: ignore[union-attr]
        vault_id = str(uuid.uuid4())
        policy_id = str(uuid.uuid4())
        policy_hash = compute_policy_hash([pair], 50, 8, 1, 0, 10, "manual", 10000)
        vault = PandaVault(
            id=vault_id,
            panda_id=panda.id,
            sui_object_id=f"0xdev_vault_{vault_id.replace('-', '')[:24]}",
            mode="training_ledger",
            status="active",
            owner_address=owner,
            authorized_agent=settings.agent_signer_address or "0xdev_agent_signer",
            policy_id=policy_id,
            policy_version=1,
            training_budget=Decimal("10000"),
            created_tx_digest=f"DEV_SMOKE_VAULT_{vault_id}",
        )
        policy = TradingPolicy(
            id=policy_id,
            panda_id=panda.id,
            vault_id=vault_id,
            sui_object_id=f"0xdev_policy_{policy_id.replace('-', '')[:24]}",
            owner_address=owner,
            authorized_agent=settings.agent_signer_address or "0xdev_agent_signer",
            mode="training_ledger",
            allowed_pairs=[pair],
            max_notional_per_trade=Decimal("50"),
            max_daily_loss=Decimal("8"),
            max_open_positions=1,
            paused=False,
            version=1,
            policy_hash=policy_hash,
            created_tx_digest=f"DEV_SMOKE_POLICY_{policy_id}",
        )
        account = PandaAccount(
            id=str(uuid.uuid4()),
            panda_id=panda.id,
            vault_id=vault_id,
            mode="training_ledger",
            base_asset="vUSDC",
            cash_balance=Decimal("10000"),
            equity=Decimal("10000"),
            status="active",
        )
        session.add_all([vault, policy, account])
        panda.active_vault_id = vault_id
        panda.active_policy_id = policy_id
        panda.subscribed_pools = sorted({*(panda.subscribed_pools or []), pair})
        await session.commit()


async def prepare_strategy(panda_id: str, *, pair: str, side: str) -> None:
    parsed = build_e2e_sell_strategy(pair) if side == "SELL" else build_e2e_buy_strategy(pair)
    async with database.AsyncSessionLocal() as session:  # type: ignore[misc]
        panda = await session.get(Panda, panda_id)
        require(panda is not None, "Panda not found")
        for field, value in E2E_PERSONALITY.items():
            setattr(panda, field, value)
        panda.emotion_state = "focused"
        panda.subscribed_pools = sorted({*(panda.subscribed_pools or []), pair})
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
        strategy.raw_text = f"Smoke fixture: {side.lower()} {pair}"
        strategy.parsed_json = parsed
        strategy.strategy_hash = e2e_strategy_hash(parsed)
        strategy.philosophy = str(parsed["philosophy"])
        strategy.proficiency = 100
        await session.commit()


async def latest_fact(panda_id: str, *, side: str | None = None) -> TradeFact | None:
    async with database.AsyncSessionLocal() as session:  # type: ignore[misc]
        stmt = select(TradeFact).where(TradeFact.panda_id == panda_id)
        if side:
            stmt = stmt.where(TradeFact.side == side)
        return (await session.execute(stmt.order_by(TradeFact.created_at.desc()).limit(1))).scalar_one_or_none()


async def latest_intent(panda_id: str) -> OrderIntent | None:
    async with database.AsyncSessionLocal() as session:  # type: ignore[misc]
        return (
            await session.execute(
                select(OrderIntent)
                .where(OrderIntent.panda_id == panda_id)
                .order_by(OrderIntent.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()


async def run_jobs(rounds: int = 3) -> list[dict[str, Any]]:
    outcomes: list[dict[str, Any]] = []
    async with database.AsyncSessionLocal() as session:  # type: ignore[misc]
        for _ in range(rounds):
            batch = await process_pending_jobs(session, limit=10, worker_id="smoke-u01-u10")
            outcomes.extend(batch)
            await session.commit()
            if not batch:
                break
    return outcomes


async def set_policy_paused(panda_id: str, paused: bool) -> None:
    async with database.AsyncSessionLocal() as session:  # type: ignore[misc]
        panda = await session.get(Panda, panda_id)
        require(panda is not None and panda.active_policy_id, "Active policy not found")
        policy = await session.get(TradingPolicy, panda.active_policy_id)
        require(policy is not None, "Active policy not found")
        policy.paused = paused
        await session.commit()


async def enqueue_latest_walrus(panda_id: str) -> None:
    async with database.AsyncSessionLocal() as session:  # type: ignore[misc]
        version = (
            await session.execute(
                select(SkillVersion)
                .where(SkillVersion.panda_id == panda_id)
                .order_by(SkillVersion.version.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if version is not None:
            await enqueue_walrus_archive_job(
                session,
                archive_type="skill_snapshot",
                panda_id=panda_id,
                skill_version_id=version.id,
            )
            await session.commit()


async def run_smoke(args: argparse.Namespace) -> int:
    panda, user = await choose_panda(args.panda_id)
    token, _ = issue_access_token(user.id, user.wallet_address, "wallet")
    base = args.backend_url.rstrip("/")
    pair = args.pair

    log("U-01", f"JWT issued for wallet {user.wallet_address}; panda={panda.id}")

    status, health = request_json("GET", f"{base}/health")
    require(status == 200 and health.get("db") == "connected", f"backend health failed: {health}")
    log("I-01", f"backend healthy; active_actors={health.get('active_actors')}")

    status, detail = request_json("GET", f"{base}/panda/{panda.id}", token=token)
    require(status == 200 and detail.get("success"), "GET /panda/:id failed")
    log("U-02", f"Panda registered in DB; object={detail['data']['sui_object_id']}")

    await ensure_dev_wallet(panda.id, pair=pair, allow_create=args.prepare_dev_wallet)
    status, wallet = request_json("GET", f"{base}/panda/{panda.id}/agent-wallet", token=token)
    require(wallet["data"]["can_start_training"], f"Agent Wallet not ready: {wallet['data']}")
    log("U-03", f"Agent Wallet ready; allowed_pairs={wallet['data']['policy']['allowed_pairs']}")

    await prepare_strategy(panda.id, pair=pair, side="BUY")
    status, strategies = request_json("GET", f"{base}/panda/{panda.id}/strategies", token=token)
    require(strategies["data"], "No active strategy after prepare")
    log("U-04", "BUY fixture strategy active")

    request_json("POST", f"{base}/panda/{panda.id}/simulation/stop", token=token, body={})
    status, start = request_json(
        "POST",
        f"{base}/panda/{panda.id}/simulation/start",
        token=token,
        body={"speed": "1x", "subscribed_pools": [pair], "data_source": "deepbook"},
    )
    require(start["data"]["status"] == "running", f"Start training failed: {start}")
    request_json("POST", f"{base}/engine/market/tick", body=build_e2e_tick(pair))
    time.sleep(1.0)
    buy_fact = await latest_fact(panda.id, side="BUY")
    require(buy_fact is not None, "BUY TradeFact was not created")
    log("U-05", f"BUY executed; trade_fact={buy_fact.id}")

    request_json("POST", f"{base}/panda/{panda.id}/simulation/stop", token=token, body={})
    await prepare_strategy(panda.id, pair=pair, side="SELL")
    status, start = request_json(
        "POST",
        f"{base}/panda/{panda.id}/simulation/start",
        token=token,
        body={"speed": "1x", "subscribed_pools": [pair], "data_source": "deepbook"},
    )
    require(start["data"]["status"] == "running", f"Restart for SELL failed: {start}")
    request_json("POST", f"{base}/engine/market/tick", body=build_e2e_sell_tick(pair))
    time.sleep(1.0)
    sell_fact = await latest_fact(panda.id, side="SELL")
    require(sell_fact is not None and sell_fact.closed_at is not None, "Closed SELL TradeFact missing")
    log("U-05/U-08", f"SELL close executed; trade_fact={sell_fact.id}")
    request_json("POST", f"{base}/panda/{panda.id}/simulation/stop", token=token, body={})

    status, review = request_json(
        "POST",
        f"{base}/panda/{panda.id}/trade-facts/{sell_fact.id}/review",
        token=token,
        body={},
        allow_error=True,
    )
    if status >= 400:
        await run_jobs()
    else:
        require(review["data"].get("review"), f"Review was not returned: {review}")
    async with database.AsyncSessionLocal() as session:  # type: ignore[misc]
        review_row = (
            await session.execute(
                select(TradeReview).where(TradeReview.trade_fact_id == sell_fact.id)
            )
        ).scalar_one_or_none()
        require(review_row is not None, "TradeReview not created")
    log("U-08", "Review + Skill Memory job path completed")

    status, proof = request_json(
        "GET",
        f"{base}/panda/{panda.id}/chain-proof/{buy_fact.id}",
        token=token,
        allow_error=True,
    )
    require(status == 200, f"Chain Proof status failed: {proof}")
    eligibility = proof["data"]["eligibility"]
    exec_status = proof["data"]["chain_execution"]
    log(
        "U-07",
        f"chain proof status={exec_status['status']} dry_run={exec_status['dry_run']} eligible={eligibility['eligible']}",
    )

    await enqueue_latest_walrus(panda.id)
    await run_jobs()
    status, latest_skill = request_json(
        "GET",
        f"{base}/panda/{panda.id}/skill-versions/latest",
        token=token,
        allow_error=True,
    )
    if status == 200:
        archive = latest_skill["data"].get("walrus_archive")
        log("U-08", f"walrus_archive={archive}")

    request_json("POST", f"{base}/panda/{panda.id}/simulation/stop", token=token, body={})
    await set_policy_paused(panda.id, True)
    try:
        await prepare_strategy(panda.id, pair=pair, side="BUY")
        status, paused_start = request_json(
            "POST",
            f"{base}/panda/{panda.id}/simulation/start",
            token=token,
            body={"speed": "1x", "subscribed_pools": [pair], "data_source": "deepbook"},
            allow_error=True,
        )
        if status < 400:
            request_json("POST", f"{base}/engine/market/tick", body=build_e2e_tick(pair))
            time.sleep(1.0)
            latest = await latest_intent(panda.id)
            require(
                latest is not None and latest.status == "REJECTED",
                f"Paused policy did not reject execution: {paused_start}",
            )
        else:
            error_code = (paused_start.get("error") or {}).get("code")
            require(
                error_code == "POLICY_PAUSED",
                f"Paused policy should fail with POLICY_PAUSED, got {error_code}: {paused_start}",
            )
        error_code = (paused_start.get("error") or {}).get("code")
        log(
            "U-09",
            f"paused policy blocks training/execution; response_status={status} error_code={error_code}",
        )
    finally:
        await set_policy_paused(panda.id, False)
        request_json("POST", f"{base}/panda/{panda.id}/simulation/stop", token=token, body={})

    status, stopped = request_json(
        "POST",
        f"{base}/panda/{panda.id}/simulation/stop",
        token=token,
        body={},
    )
    require(stopped["data"]["status"] == "stopped", f"Stop failed: {stopped}")
    status, final_health = request_json("GET", f"{base}/health")
    require(final_health.get("active_actors") == 0, f"Actors still running: {final_health}")
    log("U-06/U-10", "Stop training verified; active_actors=0")

    print("\nSMOKE PASSED")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend-url", default="http://localhost:8000")
    parser.add_argument("--panda-id")
    parser.add_argument("--pair", default="DEEP-SUI")
    parser.add_argument(
        "--prepare-dev-wallet",
        action="store_true",
        help="Create/repair a dev-only active PandaVault/TradingPolicy mirror if missing.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(run_smoke(parse_args())))
    except SmokeFailure as exc:
        print(f"\nSMOKE FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)

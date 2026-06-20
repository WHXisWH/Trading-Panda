#!/usr/bin/env python3
"""Local smoke for leaderboard, achievements, and check-in.

Run from backend/:
  ./.venv-local/bin/python scripts/smoke_growth.py --panda-id <uuid>
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import _bootstrap  # noqa: F401

from sqlalchemy import select

import app.db.database as database
from app.db.models import Panda, User
from app.services.auth_tokens import issue_access_token


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
) -> tuple[int, dict[str, Any]]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body or {}).encode() if body is not None else None
    req = Request(url, headers=headers, data=data, method=method)
    try:
        with urlopen(req, timeout=20) as resp:
            return resp.status, json.loads(resp.read().decode())
    except HTTPError as exc:
        payload = json.loads(exc.read().decode())
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


def assert_success(payload: dict[str, Any], label: str) -> dict[str, Any]:
    require(payload.get("success") is True, f"{label} did not return success=true: {payload}")
    data = payload.get("data")
    require(isinstance(data, dict), f"{label} data is not an object: {payload}")
    return data


def smoke_leaderboard(base: str) -> None:
    for dimension in ("pnl", "winrate", "level"):
        status, payload = request_json(
            "GET",
            f"{base}/leaderboard?dimension={dimension}&limit=20",
        )
        require(status == 200, f"leaderboard {dimension} status={status}")
        data = assert_success(payload, f"leaderboard {dimension}")
        entries = data.get("entries")
        require(isinstance(entries, list), f"leaderboard {dimension} entries missing")
        if entries:
            first = entries[0]
            require("rank" in first and "panda_id" in first, f"bad leaderboard entry: {first}")
        log("leaderboard", f"{dimension}: {len(entries)} entries")


def smoke_achievements(base: str, token: str) -> None:
    status, payload = request_json("GET", f"{base}/achievements", token=token)
    require(status == 200, f"achievements status={status}")
    data = assert_success(payload, "achievements")
    items = data.get("achievements")
    require(isinstance(items, list) and len(items) >= 1, "achievement catalog is empty")
    unlocked_codes = {item["code"] for item in items if item.get("unlocked")}
    require("first_panda" in unlocked_codes, "first_panda should unlock for an owner with a Panda")
    log("achievements", f"{data.get('unlocked', 0)}/{data.get('total', len(items))} unlocked")


def smoke_checkin(base: str, token: str) -> None:
    status, before = request_json("GET", f"{base}/checkin", token=token)
    require(status == 200, f"checkin GET before status={status}")
    before_data = assert_success(before, "checkin before")
    status, claim = request_json("POST", f"{base}/checkin", token=token, body={})
    require(status == 200, f"checkin POST status={status}")
    claim_data = assert_success(claim, "checkin claim")
    status, after = request_json("GET", f"{base}/checkin", token=token)
    require(status == 200, f"checkin GET after status={status}")
    after_data = assert_success(after, "checkin after")
    require(after_data.get("checked_in_today") is True, "checkin did not mark today as checked")
    require(int(after_data.get("streak") or 0) >= 1, "checkin streak should be >= 1")
    log(
        "checkin",
        f"before_checked={before_data.get('checked_in_today')} claim_already={claim_data.get('already_checked_in')} streak={after_data.get('streak')}",
    )


def smoke_frontend_bff(frontend: str, token: str) -> None:
    status, leaderboard = request_json("GET", f"{frontend}/api/leaderboard?dimension=pnl&limit=20")
    require(status == 200, f"BFF leaderboard status={status}")
    assert_success(leaderboard, "BFF leaderboard")
    status, achievements = request_json("GET", f"{frontend}/api/achievements", token=token)
    require(status == 200, f"BFF achievements status={status}")
    assert_success(achievements, "BFF achievements")
    status, checkin = request_json("GET", f"{frontend}/api/checkin", token=token)
    require(status == 200, f"BFF checkin status={status}")
    assert_success(checkin, "BFF checkin")
    log("frontend-bff", "leaderboard/achievements/checkin API routes passed")


async def run_smoke(args: argparse.Namespace) -> int:
    panda, user = await choose_panda(args.panda_id)
    token, _ = issue_access_token(user.id, user.wallet_address, "wallet")
    backend = args.backend_url.rstrip("/")
    frontend = args.frontend_url.rstrip("/")

    log("auth", f"JWT issued for wallet {user.wallet_address}; panda={panda.id}")
    smoke_leaderboard(backend)
    smoke_achievements(backend, token)
    smoke_checkin(backend, token)
    if args.frontend_url:
        smoke_frontend_bff(frontend, token)
    print("\nGROWTH SMOKE PASSED")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend-url", default="http://localhost:8000")
    parser.add_argument("--frontend-url", default="http://localhost:3001")
    parser.add_argument("--panda-id")
    return parser.parse_args()


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(run_smoke(parse_args())))
    except SmokeFailure as exc:
        print(f"\nGROWTH SMOKE FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)

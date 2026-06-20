# Local U-01..U-10 Smoke Checklist

> Scope: local demo-path verification after the four local services are running.

## Preconditions

Run these services first:

```bash
# backend
cd backend && ./.venv-local/bin/uvicorn main:app --host 0.0.0.0 --port 8000

# market-monitor
cd market-monitor && ./.venv-local/bin/uvicorn main:app --host 0.0.0.0 --port 8001

# websocket hub
cd websocket && corepack pnpm dev

# frontend
cd frontend && PORT=3001 corepack pnpm dev
```

Health checks:

```bash
curl -sS http://localhost:8000/health | python3 -m json.tool
curl -sS http://localhost:8001/health | python3 -m json.tool
curl -sS http://127.0.0.1:8787/health | python3 -m json.tool
```

Expected:

- Backend `db=connected`, `redis=configured`, `active_actors=0` before starting.
- Market monitor `status=ok` and Redis connected.
- WebSocket hub `status=ok`.

## Manual Wallet Steps

These steps require wallet signatures and cannot be fully automated by a local script.

| Step | Page | Pass signal |
|---|---|---|
| U-01 Login | `/mint` | Wallet connected, `/api/auth/nonce`, `/api/auth/connect`, `/api/auth/me` are 200. |
| U-02 Mint | `/mint` | Mint toast succeeds, Panda appears in `/profile`, DB has `pandas` row. |
| U-03 Agent Wallet | `/agent-wallet?panda=<panda_id>` | Setup status is Ready, mirror synced, Vault/Policy object ids visible. |

If a local Panda already exists, continue with the automated smoke below.

## Automated Server/Agent Smoke

Run from `backend/`:

```bash
./.venv-local/bin/python scripts/smoke_u01_u10.py \
  --panda-id <panda_id> \
  --pair DEEP-SUI \
  --prepare-dev-wallet
```

If you omit `--panda-id`, the script uses the latest local Panda.

`--prepare-dev-wallet` is dev-only. It creates or repairs a local DB mirror for
`PandaVault`, `TradingPolicy`, and `PandaAccount` when the wallet setup was not
completed by a real testnet transaction.

The script verifies:

| Step | Automated check |
|---|---|
| U-01 | Issues a local JWT for the Panda owner and calls authenticated APIs. |
| U-02 | Confirms the Panda is readable from `GET /panda/:id`. |
| U-03 | Confirms Agent Wallet can start training. |
| U-04 | Installs deterministic BUY/SELL strategy fixtures. |
| U-05 | Starts Training Ledger, injects BUY tick, verifies BUY `TradeFact`. |
| U-08 | Restarts with SELL fixture, injects SELL tick, verifies closed SELL and review path. |
| U-07 | Reads Chain Proof status and reports real/dry-run/disabled state. |
| U-08 Walrus | Enqueues latest skill snapshot archive and reports `walrus_archive` status. |
| U-09 | Pauses policy mirror and verifies training/execution is blocked. |
| U-06/U-10 | Stops training and verifies backend `active_actors=0`. |

Pass signal:

```text
SMOKE PASSED
```

Fail triage:

- `Agent Wallet mirror missing`: rerun with `--prepare-dev-wallet`, or complete U-03 in wallet UI.
- `BUY TradeFact was not created`: check backend `/health.market_consumer`, active policy allowed pairs, and strategy threshold.
- `Closed SELL TradeFact missing`: make sure the BUY step created a position before SELL.
- `Chain Proof eligible=false`: acceptable when `CHAIN_PROOF_ENABLED=false`; the script reports status instead of forcing a PTB.
- `walrus_archive.status=failed`: acceptable if Walrus publisher is currently unavailable; Review/Skill Memory must still remain usable.

## Browser Regression Spot Checks

After `SMOKE PASSED`, verify these URLs:

```text
http://localhost:3001/training-ledger/<panda_id>
http://localhost:3001/review?panda=<panda_id>&fact=<closed_sell_trade_fact_id>
http://localhost:3001/chain-proof?panda=<panda_id>&fact=<buy_trade_fact_id>
http://localhost:3001/safety/<panda_id>
http://localhost:3001/strategy/<panda_id>
```

Expected:

- Training Ledger shows recent BUY/SELL decisions.
- Review shows Skill Memory and Walrus archive status.
- Chain Proof shows disabled, dry-run, or real tx state explicitly.
- Safety loads current policy state.
- `/strategy/<panda_id>` redirects to `/training-ledger/<panda_id>?feed=strategy`.

## Growth Smoke: Leaderboard / Achievements / Check-in

Run from `backend/` after at least one local Panda exists:

```bash
./.venv-local/bin/python scripts/smoke_growth.py \
  --panda-id <panda_id> \
  --frontend-url http://localhost:3001
```

This verifies:

- Backend `GET /leaderboard?dimension=pnl|winrate|level`
- Backend `GET /achievements`
- Backend `GET/POST /checkin`
- Frontend BFF `/api/leaderboard`, `/api/achievements`, `/api/checkin`

Pass signal:

```text
GROWTH SMOKE PASSED
```

Browser spot checks:

```text
http://localhost:3001/leaderboard
http://localhost:3001/achievements
http://localhost:3001/profile
```

Expected:

- Leaderboard shows ranked Panda rows or a clear empty state.
- Achievements shows the catalog and `first_panda` unlocked for a wallet with a Panda.
- Profile shows Daily Check-in, and after claiming it shows `Checked` plus a streak.

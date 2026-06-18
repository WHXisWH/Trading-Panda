# TradingPanda Local Manual Test Guide

> Version 1.0 · 2026-06-18  
> Scope: local four-service manual verification for MVP user journey.

This guide is for testing the app manually on localhost. It assumes the product intent is:

- Market data comes from real DeepBook mainnet data via `market-monitor`.
- User wallet / Panda NFT / PandaVault / TradingPolicy / Chain Proof actions run on Sui Testnet.
- Training Ledger is the paper execution truth; Chain Proof is only for selected/manual testnet proof moments.

## 0. Test Philosophy

Manual testing should answer three questions:

| Question | Pass signal |
|---|---|
| Can a new user complete the core journey? | Connect wallet -> mint Panda -> create Agent Wallet -> feed strategy -> start Training Ledger |
| Are the live data pipes working? | `market-monitor` returns fresh candles; Redis publishes ticks; WebSocket Hub forwards market/panda events |
| Do safety boundaries hold? | Policy blocks invalid actions; pause/revoke affects execution; proof failure does not rollback ledger state |

Record every failed step with:

```text
Time:
Page / API:
Action:
Expected:
Actual:
Console error:
Backend log:
Market-monitor log:
WebSocket log:
Screenshot / tx digest:
```

## 1. Local Services

Run four services in four terminals:

| Terminal | Service | Port | Purpose |
|---|---:|---:|---|
| T1 | `backend` | `8000` | FastAPI Decision Engine, auth, DB, PandaActor |
| T2 | `market-monitor` | `8001` | DeepBook mainnet OHLCV/orderbook -> Redis `market:tick:*` |
| T3 | `websocket` | `8787` | Cloudflare Worker local Hub, forwards `market.tick` + `panda:*` |
| T4 | `frontend` | `3000` | Next.js app + BFF API routes |

### Required Local Accounts / Credentials

| Item | Required for | Notes |
|---|---|---|
| Sui Testnet wallet with SUI gas | Mint, Agent Wallet setup, Safety owner action | Slush or compatible Sui wallet is recommended |
| Supabase/Postgres `DATABASE_URL` | Backend DB | Must already be at Alembic head `006_trust_merkle_columns` |
| Upstash Redis TCP `rediss://` | Backend + market-monitor | Must be the same Redis instance |
| Upstash Redis REST URL/token | WebSocket Hub | Must point to the same Upstash instance |
| Google OAuth client ID | zkLogin path only | Wallet login path can be tested without it |
| DeepSeek API key | Natural-language parsing / agent coordinator | Rule-block strategy tests may not need full LLM coverage |
| Agent Signer private key | Chain Proof real PTB | If missing, expect dry-run / disabled behavior depending config |

## 2. Environment Checklist

### `backend/.env`

Minimum:

```env
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=rediss://...
JWT_SECRET=<same-as-frontend-and-websocket>
INTERNAL_SECRET=<same-as-frontend>
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PACKAGE_ID=0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465
REGISTRY_ID=0x5cbf822c3fe346d7001125ff0ad52d675611148b2c4734d1e200ebf23d53baa5
DEEPBOOK_LAUNCH_PAIRS=DEEP/SUI,SUI/USDC
```

Optional but needed for deeper flows:

```env
DEEPSEEK_API_KEY=...
AGENT_SIGNER_ADDRESS=0x...
AGENT_SIGNER_PRIVATE_KEY=...
CHAIN_PROOF_ENABLED=true
SUI_PRIVATE_KEY=...
ADMIN_CAP_ID=0xf6ff3f496b7471353dc2ea3c7732cd822f596cdb62d27bdb0362171862b60a00
```

### `market-monitor/.env`

Recommended mainnet real-market setup:

```env
REDIS_URL=rediss://...
DEEPBOOK_SERVER_URL=https://deepbook-indexer.mainnet.mystenlabs.com
DEEPBOOK_NETWORK=mainnet
DEEPBOOK_POOLS=
LAUNCH_PAIRS=SUI_USDC,DEEP_USDC,WAL_USDC,NS_USDC
USE_PAIR_RANKING=true
MAX_PUBLISH_PAIRS=4
POLL_INTERVAL_SEC=15
```

Important risk to verify: the current frontend pool constants include `DEEP/SUI` and `SUI/DBUSDC`. If market-monitor publishes `SUI_USDC` / `DEEP_USDC` while the Training Ledger UI subscribes to `DEEP/SUI`, the page may show stale ticks or candle errors. Treat this as a configuration mismatch, not a user-flow failure.

### `websocket/.dev.vars`

```env
JWT_SECRET=<same-as-backend-and-frontend>
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
MARKET_MONITOR_URL=http://localhost:8001
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8787/ws
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465
NEXT_PUBLIC_REGISTRY_ID=0x5cbf822c3fe346d7001125ff0ad52d675611148b2c4734d1e200ebf23d53baa5
JWT_SECRET=<same-as-backend-and-websocket>
INTERNAL_SECRET=<same-as-backend>
```

## 3. Start Services

### T1 Backend

```bash
cd backend
source .venv/bin/activate
python -m alembic upgrade head
python scripts/verify_db.py
uvicorn main:app --reload --port 8000
```

Expected:

- `python scripts/verify_db.py` passes.
- `GET http://localhost:8000/health` returns `status=ok`, `db=connected`, `redis=configured`.

### T2 Market Monitor

```bash
cd market-monitor
source .venv/bin/activate
PYTHONPATH=. uvicorn main:app --reload --port 8001
```

Wait at least one `POLL_INTERVAL_SEC` after startup.

Expected:

- `GET http://localhost:8001/health` returns `status=ok`.
- `ohlcv_source` should usually be `indexer_http` unless optional PG is configured.
- `redis_connected=true`.
- At least one pool has recent `last_publish_ts`.

### T3 WebSocket Hub

```bash
cd websocket
pnpm install
pnpm run dev
```

Expected:

- `GET http://127.0.0.1:8787/health` returns `status=ok`.
- No startup error about missing `JWT_SECRET` or Upstash REST credentials.

### T4 Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

Expected:

- `http://localhost:3000` loads.
- `http://localhost:3000/api/market/health` proxies market-monitor health.
- `http://localhost:3000/api/market/candles?pool=SUI_USDC&limit=20` returns candles if monitor is publishing mainnet `SUI_USDC`.

## 4. Infrastructure Smoke Tests

Run these before clicking the product journey.

### I-01 Backend Health

```bash
curl -sS http://localhost:8000/health | python3 -m json.tool
```

Pass:

- `status` is `ok`.
- `db` is `connected`.
- `redis` is `configured`.

Fail first checks:

- If `db=error`, run `cd backend && python scripts/verify_db.py`.
- If Redis is not configured, check `REDIS_URL`.

### I-02 Market Monitor Health

```bash
curl -sS http://localhost:8001/health | python3 -m json.tool
curl -sS http://localhost:8001/pairs | python3 -m json.tool
```

Pass:

- `network=mainnet`.
- `deepbook_reachable=true`.
- `redis_connected=true`.
- `pairs` has launch pairs or ranked pairs.

Fail first checks:

- If `deepbook_reachable=false`, test network access to `https://deepbook-indexer.mainnet.mystenlabs.com`.
- If `redis_connected=false`, check `market-monitor/.env REDIS_URL`.
- If all pools are stale, verify `DEEPBOOK_POOLS` and `LAUNCH_PAIRS`.

### I-03 Historical Candles

Try the monitor directly:

```bash
curl -sS "http://localhost:8001/candles?pool=SUI_USDC&interval=1m&limit=20" | python3 -m json.tool
```

Try the frontend BFF:

```bash
curl -sS "http://localhost:3000/api/market/candles?pool=SUI_USDC&interval=1m&limit=20" | python3 -m json.tool
```

Pass:

- Response has `candles`.
- `candles.length > 0`.
- Each candle has `t/o/h/l/c/v`.

If using old local/testnet pool names, also test:

```bash
curl -sS "http://localhost:8001/candles?pool=DEEP/SUI&interval=1m&limit=20" | python3 -m json.tool
```

If `SUI_USDC` passes but `DEEP/SUI` fails, update frontend/Training Ledger pool configuration before judging the UI.

### I-04 WebSocket Hub Health

```bash
curl -sS http://127.0.0.1:8787/health | python3 -m json.tool
```

Pass:

- `service=trading-panda-websocket-hub`.
- `status=ok`.

### I-05 Frontend Page Smoke

Open:

- `http://localhost:3000`
- `http://localhost:3000/mint`
- `http://localhost:3000/market`
- `http://localhost:3000/leaderboard`

Pass:

- No full-page crash.
- Navbar logo renders as PNG.
- Browser console has no repeated red errors.

## 5. Core User Journey Manual Tests

Use a fresh wallet or a wallet whose previous Pandas you can ignore.

### U-01 Wallet Login

Path: `http://localhost:3000/mint`

Steps:

1. Click `Connect Wallet`.
2. Select Slush or another Sui wallet.
3. Approve the wallet connection.
4. Sign the login message if prompted.

Pass:

- Button no longer says `Connect Wallet`.
- Navbar shows authenticated wallet/user state.
- `GET /api/auth/me` in Network tab returns 200.

Fail first checks:

- Backend log for `/auth/nonce` and `/auth/connect`.
- Browser console for wallet adapter errors.
- `JWT_SECRET` consistency across frontend/backend/websocket.

### U-02 Mint Panda NFT

Path: `/mint`

Preconditions:

- Wallet is on Sui Testnet.
- Wallet has enough Testnet SUI gas.
- `NEXT_PUBLIC_PACKAGE_ID` and `NEXT_PUBLIC_REGISTRY_ID` match `dev-docs/DEV_CONTEXT.md`.

Steps:

1. Click `Mint Panda NFT`.
2. Confirm the signing modal.
3. Approve the wallet transaction.
4. Wait for backend registration.
5. Click `View mint details`.

Pass:

- Toast shows mint submitted/success.
- Panda reveal state appears.
- Details drawer shows tx digest and object id.
- `Create Agent Wallet` CTA appears.
- Backend has a `pandas` row with `active_vault_id=NULL` and `active_policy_id=NULL`.

Fail first checks:

- If wallet rejects, UI should show safe failure and not create DB row.
- If chain succeeds but backend sync fails, use `Retry backend sync`.
- Check backend `/panda/mint` logs.

### U-03 Create Agent Wallet

Path: `/agent-wallet?panda=<panda_id>`

Steps:

1. Confirm the page shows `Agent Wallet Setup`.
2. Review default TradingPolicy draft.
3. Click `Review Agent Signer`.
4. Confirm the Authorized Agent review modal.
5. Approve `Create PandaVault + Policy` wallet transaction.
6. Wait for backend mirror sync.
7. Click `View objects`.

Pass:

- Setup state becomes `Ready`.
- Mirror status is `synced`.
- Object drawer shows PandaVault / TradingPolicy IDs and tx digest.
- Buttons appear: `Feed strategy`, `Training Ledger`, `Safety`.

Fail first checks:

- If button is disabled, backend did not return `agent_signer_address`.
- If validation fails, fix policy draft fields.
- If chain tx succeeds but mirror fails, use retry sync and inspect `/api/panda/:id/agent-wallet/sync`.

### U-04 Feed Strategy Rules

Path: `/strategy/<panda_id>`

Steps:

1. Apply a template from the strategy rack.
2. Confirm Policy compatibility panel is visible.
3. Click validate / save strategy.
4. If conflicts appear, adjust target pairs or risk settings.
5. Save strategy.

Pass:

- Strategy version bar shows active version.
- Policy compatibility is pass or clearly lists conflicts.
- `Start Training` CTA becomes available.
- Refresh page; saved strategy still loads.

Fail first checks:

- Backend `/panda/:id/strategy/validate`.
- Backend `/panda/:id/strategy`.
- If LLM key is missing, use structured rule/template path instead of natural language.

### U-05 Start Training Ledger

Path: `/training-ledger/<panda_id>`

Preconditions:

- Agent Wallet is ready.
- Strategy is active.
- Market monitor publishes the same pair that the frontend subscribes to.

Steps:

1. Confirm top strip shows Training Ledger cockpit.
2. Confirm market chart loads historical candles.
3. Click start training in the `SimulationStatusBar`.
4. Wait 30-60 seconds.
5. Open Decision timeline items as they appear.

Pass:

- Actor status becomes active/running.
- WebSocket status opens.
- Decision timeline receives OrderIntent entries.
- Ledger summary updates every few seconds.
- Policy banner shows pass/reject/stale intentionally.
- Trade Fact drawer can open for an intent.

Fail first checks:

- If chart history fails, test `/api/market/candles?pool=<pool>`.
- If WebSocket stays closed, check Worker logs and token validation.
- If no decisions, check Redis `market:tick:*` freshness and backend actor logs.
- If policy rejects every intent, inspect TradingPolicy allowed pairs / caps.

### U-06 Stop Training

Path: `/training-ledger/<panda_id>`

Steps:

1. Click stop/pause training control.
2. Wait for status change.
3. Refresh page.

Pass:

- Session status becomes stopped/idle.
- Actor active indicator turns off.
- Refresh does not resurrect running state unexpectedly.

Fail first checks:

- Backend `/panda/:id/simulation/stop`.
- `actor_manager.active_count` from `GET /health`.

### U-07 Chain Proof Moment

Path: `/chain-proof?panda=<panda_id>` or from Training Ledger `Chain Proof` link.

Preconditions:

- At least one Trade Fact exists, or page supports empty state.
- `CHAIN_PROOF_ENABLED` and Agent Signer config determine whether real PTB is possible.

Steps:

1. Open Chain Proof page.
2. Check eligibility panel.
3. If eligible, click request proof.
4. Confirm modal.
5. Wait for proof job timeline.

Pass:

- Ineligible state explains why.
- Eligible request creates a proof job.
- If real signing is configured, tx digest appears.
- If disabled/dry-run, UI shows safe non-destructive status.
- Training Ledger PnL is not rolled back if proof fails.

Fail first checks:

- Backend `chain_execution_worker` logs.
- `async_jobs` row for idempotency/retry status.
- Agent Signer env values.

### U-08 Review Journal And Skill Memory

Path: `/review?panda=<panda_id>`

Steps:

1. Open Review Journal.
2. Select a review or a Trade Fact review link from Training Ledger.
3. Trigger review if available.
4. Open evidence drawer.
5. Check whether Skill Memory was updated or rejected.

Pass:

- Review explains win/loss using evidence.
- Unsupported hypothesis does not update skill memory.
- Supported/verified memory appears only after evidence threshold.

Fail first checks:

- Backend review worker logs.
- `trade_facts`, `trade_reviews`, `skill_memories`, `skill_versions`.

### U-09 Safety Controls

Path: `/safety/<panda_id>`

Steps:

1. Open Safety page.
2. Click `Pause now`.
3. Approve owner action if required.
4. Return to Training Ledger and try to start/continue training.
5. Resume policy.
6. Optionally test tighten/revoke if you are okay with changing the test Panda.

Pass:

- Pause blocks Training Ledger execution.
- Panda cannot unpause itself.
- Resume restores allowed execution.
- Revoke disables proof path.
- Tighten reduces allowed notional/pairs and creates visible policy result.

Fail first checks:

- `/api/panda/:id/safety`.
- `/api/panda/:id/safety/owner-action`.
- TradingPolicy object id and wallet owner.

### U-10 Growth Pages

Paths:

- `/leaderboard`
- `/achievements`
- `/profile`

Steps:

1. Open each page after login.
2. Trigger check-in on profile if available.
3. Confirm leaderboard and achievements render real API data.

Pass:

- Pages do not show only mock data.
- Check-in updates streak/reward state.
- Leaderboard has stable empty/loading/error states.

Fail first checks:

- `/api/leaderboard`.
- `/api/achievements`.
- `/api/checkin`.

## 6. Negative Tests

Run these after the happy path.

| ID | Scenario | Expected |
|---|---|---|
| N-01 | Reject wallet login signature | Login remains unauthenticated; no crash |
| N-02 | Reject mint transaction | UI returns to safe idle/error state; no Panda DB row |
| N-03 | Disconnect/kill market-monitor | Training Ledger marks market stale and Panda holds |
| N-04 | Start training without strategy | Start is blocked with clear message |
| N-05 | Create strategy outside allowed policy pair | Strategy save/validate reports policy conflict |
| N-06 | Pause policy then start training | PolicyGate blocks execution |
| N-07 | Request duplicate Chain Proof | Idempotency prevents duplicate job/PTB |
| N-08 | Stop backend while frontend open | UI shows recoverable API errors; no silent success |
| N-09 | Wrong JWT secret between frontend/backend | Auth fails clearly; WebSocket rejects token |
| N-10 | Wrong Upstash REST credentials in websocket | Hub health may pass but subscriptions fail; logs show Redis error |

## 7. Database Spot Checks

Use Supabase SQL editor or `psql`.

After mint:

```sql
select id, sui_object_id, owner_address, active_vault_id, active_policy_id
from pandas
order by created_at desc
limit 5;
```

After Agent Wallet setup:

```sql
select panda_id, sui_object_id, status from panda_vaults order by created_at desc limit 5;
select panda_id, sui_object_id, version, is_paused, is_revoked from trading_policies order by created_at desc limit 5;
```

After strategy save:

```sql
select panda_id, version, is_active, policy_version from strategies order by created_at desc limit 5;
select panda_id, ghost_weight from strategy_history order by created_at desc limit 5;
```

After training:

```sql
select panda_id, status, action, target_pair, rejection_reason from order_intents order by created_at desc limit 10;
select panda_id, action, target_pair, realized_pnl, proof_status from trade_facts order by created_at desc limit 10;
select panda_id, cash_balance, equity, realized_pnl, unrealized_pnl from panda_accounts order by updated_at desc limit 5;
```

After proof/review:

```sql
select panda_id, trade_fact_id, status, tx_digest from chain_execution_logs order by created_at desc limit 10;
select panda_id, trade_fact_id, verdict, reason_summary from trade_reviews order by created_at desc limit 10;
select panda_id, status, confidence from skill_memories order by created_at desc limit 10;
select job_type, status, idempotency_key, last_error from async_jobs order by created_at desc limit 20;
```

## 8. Final Acceptance Checklist

| Area | Pass? | Notes |
|---|---|---|
| Backend health is ok and DB connected | [ ] | |
| Market monitor uses mainnet Indexer and returns candles | [ ] | |
| WebSocket Hub health is ok | [ ] | |
| Frontend loads without console crash | [ ] | |
| Wallet login works | [ ] | |
| Mint succeeds and DB registers Panda | [ ] | |
| Agent Wallet setup creates/syncs vault + policy | [ ] | |
| Strategy validate/save works inside policy | [ ] | |
| Training starts and receives market ticks | [ ] | |
| Decision timeline and ledger update | [ ] | |
| Training stop works | [ ] | |
| Chain Proof shows eligible/ineligible status safely | [ ] | |
| Review Journal can show/trigger reviews | [ ] | |
| Safety pause/resume blocks/unblocks execution | [ ] | |
| Leaderboard/Achievements/Profile render | [ ] | |

## 9. Known Local-Test Risks

| Risk | Symptom | What to do |
|---|---|---|
| Frontend pool constants mismatch monitor mainnet pairs | Candle 404, stale tick, no decisions | Align frontend subscribed pools with monitor `/pairs` |
| Missing Testnet SUI | Mint/setup tx fails | Use Sui testnet faucet |
| Missing Agent Signer config | Chain Proof cannot create real PTB | Treat as expected unless testing Mode 2 |
| Missing DeepSeek key | Natural-language strategy parse fails | Use template/rule strategy path |
| JWT secret mismatch | Login works in one layer but WS/API rejects | Make frontend/backend/websocket secrets identical |
| Upstash TCP vs REST mixed up | Backend/monitor or hub cannot subscribe/publish | Python services use `rediss://`; Worker uses REST URL/token |
| Browser wallet on wrong network | Mint/setup fails | Switch wallet to Sui Testnet |

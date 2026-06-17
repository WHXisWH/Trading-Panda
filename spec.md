# TradingPanda SPEC — Autonomous Agent Wallet MVP

> Version 1.0 · 2026-06-17  
> Inputs: `docs/PRD.md` v3.1, `docs/architecture.md`, `CONTEXT.md`

## 1. Scope

Build a Sui-native Panda agent wallet training MVP:

```text
DeepBook mainnet market data
→ PandaActor decision
→ TradingPolicy check
→ Training Ledger execution
→ Trade Fact
→ selected Chain Proof Moment
→ testnet PandaCoin PTB
→ Review
→ Skill Memory
```

Out of scope:

- Real user funds.
- DeepBook testnet liquidity as PnL truth.
- Per-trade PTB submission for every Training Ledger action.
- Production-grade per-user signer isolation.

## 2. Resolved Architecture Decisions

| Topic | Decision |
|---|---|
| `PandaVault` | Shared Move object |
| `TradingPolicy` | Standalone shared Move object |
| Agent Signer | One environment-level testnet signer for MVP Mode 2 |
| Chain proof | Selected automatic Chain Proof Moments plus manual proof |
| Queue | PostgreSQL `async_jobs` is durable truth; Redis only wakes workers |
| Market selection | Liquidity-first DeepBook mainnet pools |

## 3. Module Contracts

### 3.1 Hot Path

| Module | Input | Output | Contract |
|---|---|---|---|
| `MarketDataConsumer` | Redis `market:tick:{pair}` | `MarketEvent` | Drops are acceptable; stale events must be marked. |
| `PandaActor` | `MarketEvent`, Panda state | `OrderIntent` | Must not move funds or call Sui directly. |
| `DecisionPipeline` | Market, strategy, personality, memory | Score and side | Uses `>0.65` execute, `0.40-0.65` hold, `<0.40` ignore. |
| `PolicyGate` | `OrderIntent`, policy mirror | accepted/rejected snapshot | Rejections are persisted, not silently dropped. |
| `LedgerService` | accepted intent | ledger mutation | Runs inside DB transaction. |
| `TradeFactWriter` | intent, ledger result | Trade Fact + async jobs | Async jobs are created atomically after durable fact commit. |

### 3.2 Async Workers

| Worker | Trigger | Contract |
|---|---|---|
| `ProofSelector` | `trade_fact_committed` or manual request | Creates `chain_proof_requested` only when policy, cooldown, cap, and idempotency pass. |
| `ChainExecutionWorker` | `chain_proof_requested` | Builds selected Mode 2 PTB and records tx digest or failure. |
| `AgentSignerService` | PTB signing request | Signs only authorized testnet PandaCoin demo PTBs. |
| `ReviewWorker` | position close or review request | Produces evidence-backed win/loss review. |
| `SkillMemoryWorker` | reviewed trade | Updates only supported or verified hypotheses. |
| `MerkleWorker` | batch threshold | Submits deterministic Trade Fact roots. |
| `WalrusSyncWorker` | memory/archive job | Stores review and memory archives. |

## 4. Chain Proof Selection

Automatic proof eligibility:

```text
side in BUY/SELL
decision zone = EXECUTE
final_score >= 0.75
mode_2_demo_enabled = true
pair in demo_supported_pairs
TradingPolicy passes
cooldown passed, default 1 proof per Panda per 30 minutes
daily cap passed, default 10 proofs per Panda per day
```

Manual proof:

```text
User selects an existing Trade Fact
→ score threshold may be bypassed
→ policy, cooldown, daily cap, duplicate, and idempotency checks still apply
```

Idempotency key:

```text
trade_fact_id + policy_version + decision_hash
```

## 5. Data Contracts

Required new durable tables:

- `panda_vaults`
- `trading_policies`
- `panda_accounts`
- `panda_positions`
- `order_intents`
- `ledger_entries`
- `trade_facts`
- `trade_reviews`
- `skill_memories`
- `skill_versions`
- `chain_execution_logs`
- `async_jobs`
- `outbox_events`

Redis channels:

- `market:tick:{pair}`
- `market:heartbeat`
- `panda:{id}:decision`
- `panda:{id}:order_intent`
- `panda:{id}:execution`
- `panda:{id}:review`
- `panda:{id}:skill`
- `async:wakeup`

## 6. Move Contracts

Required modules:

- `trading_policy.move`
- `panda_vault.move`
- `panda_coin.move`
- `demo_executor.move`

Required checks in `demo_executor`:

- signer matches `authorized_agent`
- policy is active and unexpired
- policy, vault, and Panda IDs match
- pair is allowed
- notional is within limit
- daily loss is within limit
- policy version is current

## 7. Acceptance Mapping

| PRD acceptance | SPEC verification |
|---|---|
| User creates PandaVault and TradingPolicy | Move setup PTB succeeds and DB mirrors objects. |
| Panda trains on real DeepBook data | `market-monitor` emits mainnet `market:tick` events consumed by PandaActor. |
| Policy blocks invalid execution | PolicyGate persists rejected intent; Move demo PTB aborts for invalid policy. |
| Mode 2 proves selected action | `chain_execution_logs` has tx digest for selected Chain Proof Moment. |
| Sui failure does not corrupt PnL | Chain worker failure leaves Training Ledger balances unchanged. |
| Reviews update skills only with evidence | `SkillMemoryWorker` requires reviewed Trade Fact evidence. |
| Queue is durable | Restarted worker can resume pending `async_jobs`. |

## 8. REST API Surface (v3.1)

Canonical backend prefix: `/panda/{panda_id}/…` (BFF exposes `/api/panda/:id/…`).

| Domain | Method | Path suffix | Module |
|---|---|---|---|
| Agent Wallet | GET | `/agent-wallet` | `panda_agent_wallet` |
| Agent Wallet | POST | `/agent-wallet/validate-policy` | `panda_agent_wallet` |
| Agent Wallet | POST | `/agent-wallet/sync` | `panda_agent_wallet` |
| Training session (compat) | POST | `/simulation/start` | `panda_simulation` |
| Training session (compat) | POST | `/simulation/stop` | `panda_simulation` |
| Training session (compat) | GET | `/simulation/status` | `panda_simulation` |
| Training Ledger reads | GET | `/training/ledger` | `panda_training` |
| Training Ledger reads | GET | `/training/order-intents` | `panda_training` |
| Training Ledger reads | GET | `/training/trade-facts` | `panda_training` |
| Chain Proof | GET | `/chain-proof/{trade_fact_id}` | `panda_chain_proof` |
| Chain Proof | POST | `/chain-proof/{trade_fact_id}/request` | `panda_chain_proof` |
| Review | GET | `/reviews` · `/reviews/{review_id}` | `panda_review` |
| Review | GET/POST | `/trade-facts/{trade_fact_id}/review` | `panda_review` |
| Skill Memory | GET | `/skill-memories` · `/skill-versions/latest` | `panda_review` |
| Safety | GET | `/safety` | `panda_safety` |
| Safety | POST | `/safety/owner-action` | `panda_safety` |
| Trust | GET | `/trust/merkle` · `/trust/merkle/history` · `/trust/skill-digest` | `panda_trust` |

Hot-path write contract: `PandaActor` → `TradeFactWriter.commit_tick` persists `order_intents`, `ledger_entries`, and `trade_facts` (plus legacy `trades` row for compatibility). Rejected intents are stored with `status=REJECTED`.

Shared wire types: `frontend/src/types/autonomous-wallet.ts` · `backend/app/schemas/autonomous_wallet.py`.

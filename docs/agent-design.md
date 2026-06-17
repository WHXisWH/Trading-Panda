# TradingPanda Agent Design

> Version 2.1 · 2026-06-17  
> Source of truth: `docs/PRD.md` v3.1  
> Purpose: define how a Panda turns real market ticks into bounded decisions, facts, reviews, and Skill Memory.

---

## 1. Agent Role

A Panda is an autonomous trading agent represented by a Sui NFT. The Agent system does not own the user's wallet. It consumes real market data, creates `OrderIntent` records, passes them through policy checks, executes them in the correct mode, and learns only from reviewed outcomes.

```text
Market Tick
→ PandaActor
→ DecisionPipeline
→ OrderIntent
→ Policy Gate
→ Training Ledger
→ Trade Fact
→ Async Proof / Review
→ Review
→ Skill Memory
```

The Agent system must preserve one strict boundary:

```text
The Panda may decide autonomously.
The Panda may execute only inside a user-created TradingPolicy.
```

---

## 2. Runtime Architecture

```text
market-monitor
  └── PUBLISH market:tick:{pair}

MarketDataConsumer
  └── SUBSCRIBE market:tick:*

ActorManager
  └── fan out matching ticks to active PandaActors

PandaActor
  ├── hydrate personality, strategy, policy, skill memory
  ├── run DecisionPipeline
  ├── create OrderIntent
  └── send executable intents to PolicyGate

PolicyGate
  └── check current TradingPolicy snapshot

LedgerService
  └── Mode 1: Training Ledger mutation

TradeFactWriter
  └── commit OrderIntent + Trade Fact + async jobs

ProofSelector
  └── select eligible Chain Proof Moments

ChainExecutionWorker
  └── Mode 2: selected PandaCoin PTB demo

ReviewWorker
  └── review closed trades using evidence

SkillMemoryWorker
  └── version learned rules
```

---

## 3. Market Input

The Panda consumes `MarketEvent` objects from `market-monitor`.

```text
asset
pair
timestamp
price
prev_price
volume
rsi
ma20
prev_ma20
macd_signal
volatility
trend_strength
market_regime
funding_rate
orderbook_imbalance
candle
source
stale
```

Important rules:

- `market-monitor` is the only market data producer in MVP.
- PandaActor must not call DeepBook directly for routine decisions.
- Stale market events must either reduce confidence or block execution, depending on policy.
- Mainnet DeepBook reference prices are the source of training truth.

---

## 4. PandaActor State

### 4.1 Immutable State

Loaded from Panda NFT or its backend mirror:

```text
panda_id
sui_object_id
boldness
patience
intuition
focus
contrarian
talent
```

These values shape behavior but should not be modified by training.

### 4.2 Mutable Persistent State

```text
active_strategy
strategy_proficiency
strategy_ghosts
experience_level
asset_mastery
skill_memory
active_policy
vault_id
```

### 4.3 Runtime State

```text
emotion
positions
pending_delay
last_decision
tick_queue
peak_equity
```

Runtime state may be rebuilt from database snapshots if the process restarts.

---

## 5. DecisionPipeline

The existing 8-step pipeline remains the core deterministic decision engine.

| Step | Name | Responsibility |
|---|---|---|
| S1 | Strategy signal | Evaluate strategy rules against market data |
| S2 | Proficiency noise | Add skill-dependent execution noise |
| S3 | Experience correction | Apply reviewed historical corrections |
| S4 | Signal fusion | Blend strategy, experience, and skill memory |
| S5 | Personality filter | Apply boldness, patience, contrarian behavior |
| S6 | Environment adaptation | Adjust by market regime and asset mastery |
| S7 | Ghost / social bias | Blend strategy ghosts; social features remain future scope |
| S8 | Emotion distortion | Apply emotion state to confidence and sizing |

### 5.1 Routing

```text
final_score > 0.65     → executable BUY / SELL intent
0.40 <= score <= 0.65  → HOLD or optional LLM coordinator
final_score < 0.40     → ignored / HOLD intent
```

The pipeline produces an `OrderIntent`; it does not directly mutate balances.

---

## 6. OrderIntent

`OrderIntent` is the Panda's proposed action before approval and execution.

Required fields:

```text
id
panda_id
pair
side: BUY | SELL | HOLD
mode: TRAINING_LEDGER | PANDA_COIN_DEMO
notional
reference_price
max_slippage
reason
decision_hash
policy_version
status
created_at
```

`OrderIntent` statuses:

```text
DECIDED
REJECTED_BY_POLICY
PAPER_EXECUTED
CHAIN_SUBMITTED
CHAIN_CONFIRMED
CHAIN_FAILED
POSITION_CLOSED
REVIEWED
SKILL_UPDATED
```

All executable intents must preserve:

- Market snapshot.
- Decision snapshot.
- Policy snapshot.
- Active strategy hash.
- Skill memory version.

---

## 7. Policy Gate

The Policy Gate is mandatory.

Mode 1:

```text
Backend PolicyGate checks cached TradingPolicy before paper execution.
```

Mode 2:

```text
Move checks on-chain TradingPolicy inside the testnet PTB.
```

Required checks:

```text
authorized_agent matches
policy is not paused
policy has not expired
pair is allowed
notional <= max_notional_per_trade
open exposure <= max leverage / budget
daily realized loss <= max_daily_loss
market event is not too stale
```

Policy failure must produce a rejected intent. It must not disappear silently.

---

## 8. Execution Modes

### 8.1 Mode 1: Training Ledger

Mode 1 is the default.

```text
OrderIntent
→ backend policy check
→ LedgerService
→ virtual BUY / SELL / borrow / repay
→ ledger_entries
→ Trade Fact
```

Mode 1 does not submit a PTB for every buy or sell because no real chain assets move. PnL is calculated from real mainnet reference prices.

MVP constraints:

- Long-only.
- Borrow virtual quote asset only.
- No short selling.
- No real interest.
- No real liquidation engine.
- Policy controls max notional, max loss, max leverage, and allowed pairs.

### 8.2 Mode 2: PandaCoin Chain Execution Demo

Mode 2 proves Sui-native autonomous execution.

```text
Trade Fact selected as Chain Proof Moment
→ ProofSelector enqueues chain_proof_requested
→ ChainExecutionWorker builds PTB
→ AgentSignerService signs
→ demo_executor.move checks TradingPolicy
→ PandaCoin / PandaVault action
→ DemoTradeExecuted event
→ chain_execution_logs
```

Mode 2 is not the source of training PnL. It proves:

- The agent signer can submit a transaction.
- Move enforces the TradingPolicy.
- The action is linkable to `decision_hash`.

Mode 2 does not run for every signal. Automatic proof requires:

```text
side in BUY/SELL
final_score >= 0.75
decision zone = EXECUTE
mode_2_demo_enabled = true
pair in demo_supported_pairs
TradingPolicy passes
cooldown and daily cap pass
```

Users may manually request proof for an existing Trade Fact. Manual proof may bypass the score threshold, but it still must pass TradingPolicy, duplicate, cooldown, and daily-cap checks.

The idempotency key is:

```text
trade_fact_id + policy_version + decision_hash
```

---

## 9. Trade Fact

`TradeFact` is the canonical evidence record. It should contain:

```text
panda_id
order_intent_id
pair
side
mode
market_snapshot
decision_snapshot
policy_snapshot
ledger_snapshot_before
execution_snapshot
ledger_snapshot_after
outcome
review_status
skill_version_before
skill_version_after
```

The existing `trades` table may remain for compatibility, but new learning logic should use `trade_facts`.

---

## 10. ReviewService

Reviews occur when realized PnL is known.

Review questions:

- What did the Panda believe?
- What market evidence supported it?
- What actually happened?
- Was the decision right for the right reason?
- Was profit caused by skill, risk control, or luck?
- What hypothesis should be reinforced or weakened?

Reviews must cite `TradeFact` evidence. A review without evidence must not update Skill Memory.

---

## 11. SkillMemoryService

Skill Memory is reviewed, evidence-backed knowledge.

A Skill Memory entry should contain:

```text
panda_id
scope: pair | regime | global
rule_text
evidence_trade_fact_ids
confidence
status: proposed | supported | verified | weakened | retired
version
hash
created_at
updated_at
```

Only `supported` or `verified` memory may influence future decisions. `proposed` memory can appear in reviews but should not affect sizing.

---

## 12. Emotion

Emotion still affects behavior, but it does not override TradingPolicy.

```text
focused
excited
greedy
cautious
panicking
numb
```

Example effects:

- Greedy may increase desired position size.
- Cautious may reduce desired position size.
- Panicking may suppress executable intents.

Policy limits are hard caps.

---

## 13. LLM Coordinator

LLM use is optional and bounded.

Allowed:

- Explain ambiguous decisions.
- Produce Panda-style commentary.
- Draft review language.
- Suggest skill hypotheses.

Not allowed:

- Bypass Policy Gate.
- Update Skill Memory without evidence.
- Create trades without deterministic pipeline output.
- Increase user policy limits.

LLM timeout should degrade to deterministic behavior.

---

## 14. Redis Events

Input:

```text
market:tick:{pair}
```

Output:

```text
panda:{panda_id}:decision
panda:{panda_id}:order_intent
panda:{panda_id}:execution
panda:{panda_id}:review
panda:{panda_id}:skill
panda:{panda_id}:emotion
```

Events are for realtime UI, not durable storage.

---

## 15. Implementation Mapping

Existing code to extend:

| Existing file | Required PRD v3 direction |
|---|---|
| `backend/app/engine/panda_actor.py` | Produce OrderIntent before execution |
| `backend/app/engine/decision_pipeline.py` | Keep 8-step scoring; add Skill Memory inputs |
| `backend/app/engine/market_consumer.py` | Continue consuming `market:tick:*` |
| `backend/app/engine/event_publisher.py` | Add order intent, execution, review, skill events |
| `backend/app/db/models.py` | Add vault, policy, intent, fact, ledger, skill models |
| `backend/app/engine/experience_engine.py` | Split raw experience from evidence-backed Skill Memory |

New services:

```text
PolicyGate
OrderIntentService
LedgerService
TradeFactWriter
QueueDispatcher
ProofSelector
ChainExecutionWorker
AgentSignerService
ReviewWorker
SkillMemoryWorker
MerkleWorker
WalrusSyncWorker
```

---

## 16. Explicit Non-Goals

- Do not use DeepBook testnet fills as training truth.
- Do not let PandaActor directly move real user funds in MVP.
- Do not let LLM output bypass policy checks.
- Do not update Skill Memory from open positions.
- Do not hide policy rejection from the user.

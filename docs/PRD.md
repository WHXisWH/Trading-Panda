# TradingPanda PRD — Autonomous Agent Wallet

> Version 3.1 · 2026-06-17  
> Repositioning: from "AI trading pet simulation" to "Sui-native autonomous agent wallet training system"  
> Primary competition track: Autonomous Agent Wallet  
> Secondary capability: Autonomous Risk Guardian

---

## 1. Product Positioning

TradingPanda is a Sui-native autonomous trading agent wallet. A user mints a Panda NFT, grants it a bounded trading policy, and trains it on real DeepBook mainnet market data. The Panda agent watches markets, makes buy/sell/hold decisions, executes in a controlled training environment, records every decision as a fact, reviews wins and losses, and evolves its skill memory over time.

The core product sentence:

```text
The user is not using an AI bot; the user is training a Move-constrained autonomous trading wallet.
```

The Panda is allowed to act autonomously, but only inside a user-defined cage:

```text
Panda NFT = agent identity
TradingPolicy = risk collar
PandaVault = bounded training account / execution container
Agent Signer = automated paw print
PTB = chain action sheet
Market Monitor = real market radar
Fact Table = memory courtroom
Skill Memory = learned trading instinct
Chain Proof Moment = selected decision that gets a real testnet PTB proof
```

### 1.1 What Changed From The Previous PRD

| Previous direction | New direction |
|---|---|
| AI trading pet practicing in a simulated order book | Autonomous agent wallet trained on real DeepBook mainnet market data |
| DeepBook testnet execution as the primary simulation layer | Mainnet paper ledger is the training truth; testnet PandaCoin execution is a chain proof layer |
| "Simulation" as the main product word | "Training Ledger" and "Agent Wallet" as the main product words |
| Chain mostly proves NFT identity and Merkle roots | Chain also owns policy, vault, agent authorization, execution proofs, and skill hashes |
| Testnet pool liquidity expected to support meaningful training | Testnet execution is only a proof of autonomous PTB behavior, not a source of PnL truth |

---

## 2. Competition Fit

The target challenge requires AI projects to use Sui as a core technical component, not merely as a payment rail. TradingPanda satisfies that requirement through:

| Requirement | TradingPanda design |
|---|---|
| Sui object model | Panda NFT, TradingPolicy, PandaVault, PandaCoin, proof objects |
| zkLogin or wallet onboarding | Wallet login remains supported; zkLogin can be used for low-friction user identity |
| PTB | Mint, create policy, pause/revoke, submit proof, and demo execution actions are PTB transactions |
| DeepBook | Primary real market data source; future real execution venue |
| Walrus | Long-term skill memory and review archive |
| Autonomous agent wallet | Agent Signer submits bounded actions without waking the user every tick |
| Owner revocation | User can pause policy, revoke agent authorization, and withdraw from vault |
| On-chain activity log | Events + Merkle roots + skill hashes + demo trade execution digests |

The product should be described as:

```text
Autonomous Agent Wallet with a built-in risk guardian and learning loop.
```

Not:

```text
A generic LLM that happens to hold a Sui token.
```

---

## 3. MVP Product Thesis

MVP should not rely on DeepBook testnet liquidity for training quality. Testnet pools are sparse and may not reflect real market execution. Therefore MVP uses a two-track model:

```text
Track A — Training Truth
DeepBook mainnet real market data
→ Panda decision
→ backend paper margin ledger
→ PnL, reviews, skill updates

Track B — Chain Execution Proof
Same Panda decision intent
→ testnet PTB
→ PandaCoin / PandaVault demo action
→ TradingPolicy check
→ on-chain event + tx digest
```

This means:

```text
Real market intelligence comes from mainnet.
Real autonomous chain behavior is demonstrated on testnet.
The two are linked by decision_hash and trade_fact_id.
```

### 3.1 MVP Non-Negotiables

- The Panda must monitor real Sui market data, with DeepBook as the primary source.
- The Panda must make autonomous buy/sell/hold decisions without user clicking every time.
- Every execution must be bounded by a user-created TradingPolicy.
- Mode 1 paper trades must check the same policy rules as chain execution.
- Mode 2 selected demo trades must be real testnet PTB transactions.
- Profit and loss must be calculated from mainnet reference prices, not testnet toy liquidity.
- Each closed trade must produce a fact record and a review.
- Skill memory must be updated only from reviewed trade outcomes, not from raw LLM claims.
- Users must be able to pause or revoke the Panda agent.

### 3.2 Resolved Architecture Decisions

| Decision | MVP answer |
|---|---|
| PandaVault object model | `PandaVault` is a shared object so the user and authorized agent can interact with the same bounded execution container through Move checks. |
| TradingPolicy object model | `TradingPolicy` is a standalone object, not a dynamic field attached to Panda. It is shared/readable by agent PTBs and mutable only through owner-gated entry functions. |
| Agent Signer | MVP uses one environment-level testnet Agent Signer. Each Panda policy authorizes that signer address, and Move checks policy/vault/panda bindings on every demo PTB. |
| Agent Signer rotation | Rotation means generating a new backend signer, then requiring users to sign a `TradingPolicy` update that changes `authorized_agent` and increments `policy_version`. |
| Agent Signer revocation | Users can pause policy or revoke the agent. Mode 1 backend checks and Mode 2 Move checks must both block execution after revocation. |
| Mode 2 frequency | Mode 2 does not run for every signal. It runs for selected Chain Proof Moments and supports user-triggered manual proof for a specific Trade Fact. |
| Market pair selection | MVP promotes the most liquid DeepBook mainnet pairs available at release, using volume, spread, orderbook depth, and monitor health as ranking inputs. |

---

## 4. Core Modes

### 4.1 Mode 1 — Training Ledger

Mode 1 is the default MVP mode. It uses real mainnet market data and a backend virtual margin ledger.

```text
Real DeepBook market data
→ Panda decision
→ policy check in backend
→ virtual buy/sell/borrow/repay
→ fact table
→ review
→ skill memory update
```

Mode 1 does not submit a PTB for every buy or sell, because no real chain asset moves during the paper trade. It still uses chain objects for identity, authorization, policy, and proof.

Mode 1 PTBs:

- Mint Panda NFT.
- Create PandaVault.
- Create or update TradingPolicy.
- Pause or revoke the policy.
- Submit Merkle root of trade facts.
- Submit skill hash / memory digest.

Mode 1 does not use PTB for:

- Every virtual BUY.
- Every virtual SELL.
- Every internal borrow/repay ledger entry.

The user-facing explanation:

```text
The Panda practices in a backend dojo, but the dojo rules are copied from its real on-chain collar.
```

### 4.2 Mode 2 — PandaCoin Chain Execution Demo

Mode 2 proves that the Panda can execute real Sui transactions autonomously without depending on weak DeepBook testnet liquidity.

The user or system mints a testnet training token:

```text
PANDA_CREDIT or BAMBOO
```

The Panda executes a real testnet PTB:

```text
execute_demo_trade(
  vault,
  policy,
  side,
  pair,
  notional,
  mainnet_reference_price,
  decision_hash
)
```

The Move module checks TradingPolicy and emits a chain event. The backend still computes PnL from mainnet DeepBook data.

Mode 2 is not triggered for every Panda signal. It creates selected Chain Proof Moments.

Automatic proof eligibility:

```text
side in BUY | SELL
final_score >= 0.75
mode_2_demo_enabled = true
pair in demo_supported_pairs
policy allows the pair and notional
cooldown passed, default one proof per Panda per 30 minutes
daily proof cap not exceeded, default 10 proofs per Panda per day
```

Manual proof:

```text
User may click "Prove on-chain" for a specific Trade Fact.
Manual proof still must pass TradingPolicy, cooldown, daily cap, and idempotency checks.
```

Mode 2 proves:

- Agent Signer can submit a PTB 24/7.
- TradingPolicy is enforced by Move.
- PandaVault is a bounded execution container.
- The on-chain event links to the off-chain trade fact.

Mode 2 does not claim:

- Testnet pool prices are economically meaningful.
- PandaCoin is a real-money asset.
- Testnet execution PnL is the training truth.
- Every training trade needs a separate on-chain transaction.

### 4.3 Future Mode 3 — Real Agent Wallet

Mode 3 is out of MVP. It would allow real assets to be placed into a PandaVault and traded through DeepBook or DeepBook Margin under TradingPolicy constraints.

Mode 3 requires:

- Stronger risk controls.
- User warnings.
- Production key custody design.
- Real asset vault accounting.
- DeepBook execution integration.
- Slippage and partial fill handling.
- Legal and product risk review.

---

## 5. Domain Model

### 5.1 Panda NFT

The Panda NFT is the agent identity. Its personality is generated at mint time and should remain immutable.

Immutable personality:

- Boldness.
- Patience.
- Intuition.
- Focus.
- Contrarian.
- Talent.

Mutable agent state should not be mixed into the immutable personality. It belongs in separate objects or off-chain facts.

### 5.2 TradingPolicy

TradingPolicy is the Panda's risk collar. It defines what the Panda is allowed to do.

MVP object decision:

```text
TradingPolicy is a standalone shared object.
It is not stored as a dynamic field under Panda.
Owner-only entry functions control update, pause, and revoke.
Agent PTBs may read/check it but cannot loosen it.
```

Example fields:

```text
panda_id
owner
authorized_agent
mode
allowed_pairs
max_notional_per_trade
max_daily_loss
max_leverage
max_open_positions
expires_at
paused
policy_version
policy_hash
```

Policy update rules:

- Users may always tighten policy immediately.
- Users may loosen policy only by signing a new Sui transaction.
- Panda agents may suggest policy changes but cannot grant themselves more power.
- Policy updates must emit events.

### 5.3 PandaVault

PandaVault is the bounded account controlled by a Panda under TradingPolicy.

MVP object decision:

```text
PandaVault is a shared object.
It is not the user's whole wallet.
It is the bounded container that demo_executor can mutate only after TradingPolicy checks.
```

In Mode 1:

```text
PandaVault = on-chain training account license and proof anchor
```

In Mode 2:

```text
PandaVault = testnet PandaCoin execution container
```

In future Mode 3:

```text
PandaVault = real asset vault
```

PandaVault must never represent the user's whole wallet. It is a limited container.

### 5.4 Agent Signer

Agent Signer is a Sui key controlled by the backend execution service. It signs transactions for an authorized Panda agent.

MVP development key model:

```text
One environment-level testnet Agent Signer is used for all Pandas.
Each TradingPolicy stores authorized_agent = AGENT_SIGNER_ADDRESS.
Move checks panda_id, policy_id, vault_id, policy_version, limits, and paused state.
```

This is acceptable only because MVP Mode 2 uses testnet PandaCoin and does not move real user assets. It is not the target design for Mode 3 real funds.

Important rule:

```text
The chain does not sign for the user.
The user authorizes an agent address.
The agent address signs future bounded transactions.
Move enforces the boundary.
```

The user can revoke the Agent Signer by updating or pausing TradingPolicy.

Rotation / revocation rules:

- Backend generates a new testnet signer and exposes its address for future policies.
- Existing users must sign a `TradingPolicy` update to rotate `authorized_agent`.
- Old signer transactions fail once policy version or authorized agent no longer matches.
- `pause_policy` blocks both backend paper execution and Move demo execution.
- `revoke_agent` clears or invalidates `authorized_agent`.
- Production real-asset mode must use per-user, per-panda, session-key, or KMS-backed signer isolation before any real funds are allowed.

### 5.5 PandaCoin

PandaCoin is a testnet-only training token used for Mode 2 chain execution proof.

It is not:

- A real investment token.
- A substitute for USDC.
- A source of economic PnL.

It is:

- A demo credit.
- A testnet action medium.
- A way to show real PTB execution without relying on testnet DEX liquidity.

### 5.6 Trade Fact

A Trade Fact is the canonical record of a Panda decision and execution.

It should include:

- Market snapshot.
- Decision snapshot.
- Policy snapshot.
- Ledger snapshot before.
- Execution snapshot.
- Ledger snapshot after.
- Outcome.
- Review.
- Skill memory references.

Trade Facts are the source of truth for reviews and skill updates.

### 5.7 Skill Memory

Skill Memory is what the Panda has learned from reviewed outcomes. It is not a raw conversation log.

Skill Memory should be updated only after:

- A trade closes.
- PnL is known.
- Review is generated.
- Evidence supports or rejects a hypothesis.

---

## 6. User Journey

### 6.1 Mint Panda

```text
User connects wallet or zkLogin
→ User signs mint transaction
→ Panda NFT is created
→ Personality is generated by sui::random
→ Backend registers Panda
→ Frontend shows identity, personality, and first training prompt
```

### 6.2 Create Agent Wallet

```text
User opens "Create Agent Wallet"
→ Chooses mode: Training Ledger
→ Sets budget, max trade size, daily loss, allowed pairs
→ Reviews authorized_agent address
→ Signs transaction
→ PandaVault + TradingPolicy are created
```

This is the moment the Panda receives its collar and food bowl.

### 6.3 Start Training

```text
User starts training
→ Backend starts PandaActor
→ market-monitor publishes real DeepBook ticks
→ PandaActor consumes market ticks
→ Panda makes decisions
→ executor checks policy
→ paper ledger executes or rejects
→ frontend receives market.tick and panda events
```

### 6.4 Execute Demo Chain Action

If Mode 2 demo is enabled:

```text
Panda decision produces OrderIntent
→ Trade Fact is committed
→ proof selector marks it as a Chain Proof Moment
→ ChainExecutionWorker constructs testnet PTB
→ Agent Signer signs
→ Move checks TradingPolicy
→ PandaCoin / vault action occurs
→ DemoTradeExecuted event emitted
→ tx_digest attached to Trade Fact
```

### 6.5 Review And Learn

```text
Position closes
→ PnL becomes known
→ Review engine compares decision reason against market outcome
→ Winning or losing hypothesis is extracted
→ evidence is linked from Trade Facts
→ Skill Memory is updated
→ skill hash / memory digest is periodically submitted on-chain
```

---

## 7. Market Data Strategy

### 7.1 Primary Source

DeepBook is the primary source for MVP. Pair promotion should be liquidity-first rather than narrative-first.

Ranking inputs:

- Recent 24h / 7d fill volume.
- Tightness of spread.
- Orderbook depth around mid price.
- Frequency of fresh candles.
- Market-monitor health for the pair.
- Availability of stable quote pairs, especially USDC-style quote markets.

Priority pairs:

```text
SUI_USDC
DEEP_USDC
WAL_USDC
NS_USDC
```

If the local indexer or current deployment only supports existing MVP pool names, the system may temporarily map to:

```text
DEEP/SUI
SUI/DBUSDC
```

But product language should target mainnet DeepBook pairs, not sparse testnet-only pairs.

### 7.2 Market Monitor Responsibilities

market-monitor must:

- Read DeepBook fills / trades.
- Build OHLCV candles.
- Fetch orderbook snapshots.
- Compute indicators.
- Detect market regime.
- Publish market ticks over Redis.
- Provide historical candles over REST.

Default event path:

```text
DeepBook mainnet
→ market-monitor
→ Redis market:tick:{pair}
→ backend MarketDataConsumer
→ PandaActor
→ frontend WebSocket Hub
```

### 7.3 Future Auxiliary Sources

After DeepBook is stable, add sources in this order:

| Priority | Venue | Role |
|---|---|---|
| 1 | Cetus | First AMM reference source |
| 2 | Turbos | Second AMM reference source |
| 3 | Bluefin | Secondary venue / price confirmation |
| 4 | FlowX | Aggregated quote reference |

These sources should not replace DeepBook in MVP. They become market divergence and liquidity signals.

---

## 8. Decision And Execution Loop

### 8.1 Decision Loop

```text
market.tick
→ normalize market data
→ load Panda personality
→ load active strategy
→ load skill memory
→ run decision pipeline
→ produce OrderIntent
```

OrderIntent fields:

```text
panda_id
pair
side: BUY | SELL | HOLD
mode
notional
reference_price
max_slippage
reason
decision_hash
policy_version
```

### 8.2 Policy Gate

Every executable OrderIntent must pass a policy gate.

Mode 1:

```text
Backend policy gate checks the cached policy and records the policy snapshot.
```

Mode 2:

```text
Move policy gate checks the on-chain TradingPolicy during PTB execution.
```

Policy failures produce rejected intents, not silent drops.

### 8.3 Execution Results

Possible statuses:

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

### 8.4 Chain Proof Selection

The proof selector decides whether a Trade Fact should create a `chain_proof_requested` async job.

Default automatic rules:

```text
side != HOLD
zone == EXECUTE
final_score >= 0.75
trade_fact has not already been proven
policy.mode allows panda_coin_demo
policy.paused == false
panda proof cooldown has passed
panda daily proof cap has capacity
```

Manual rules:

```text
User may request proof for an existing Trade Fact from the Chain Proof Panel.
Manual proof uses the same TradingPolicy and idempotency checks.
Manual proof may bypass score threshold, but not policy, cooldown, duplicate, or daily cap checks.
```

Idempotency:

```text
proof_key = trade_fact_id + policy_version + decision_hash
```

Duplicate proof jobs for the same proof key must resolve to the existing chain execution log.

---

## 9. Ledger And PnL

### 9.1 Paper Margin Ledger

Mode 1 uses a backend paper margin ledger.

Core concepts:

```text
cash_balance
debt_balance
equity
positions
realized_pnl
unrealized_pnl
ledger_entries
```

MVP limitations:

- Long-only.
- Borrow virtual quote asset only.
- No short selling.
- No real interest rate.
- No real liquidation engine.
- Max leverage enforced by policy.

### 9.2 Closing A Trade

A trade outcome is only final when a position is reduced or closed.

```text
BUY opens or increases exposure
SELL reduces or closes exposure
Closed portion produces realized PnL
Realized PnL triggers review
```

Unrealized PnL can inform risk, but should not update Skill Memory as proven learning.

---

## 10. Review And Learning

### 10.1 Review Objective

The Panda must not simply say "I won because I am smart." It must argue from evidence.

Each review should answer:

- What did I believe at decision time?
- What market evidence supported it?
- What actually happened?
- Was the decision right for the right reason?
- Was it profitable due to luck, signal quality, or risk management?
- What hypothesis should be reinforced or weakened?

### 10.2 Hypothesis Lifecycle

```text
proposed
→ supported
→ verified
→ weakened
→ retired
```

Only verified or strongly supported hypotheses can update Skill Memory.

### 10.3 Skill Update Rules

Skill update must include:

- A natural language rule.
- Evidence references.
- Confidence score.
- Affected pair or regime.
- Version hash.

Example:

```text
When SUI_USDC is ranging and RSI recovers from below 30 while orderbook imbalance flips positive, small long entries have historically outperformed immediate full-size entries.
```

---

## 11. On-Chain Design

### 11.1 Move Modules To Add

New modules:

| Module | Purpose |
|---|---|
| `trading_policy.move` | Create, update, pause, revoke Panda TradingPolicy |
| `panda_vault.move` | Create PandaVault and bind it to Panda + policy |
| `panda_coin.move` | Mint / manage testnet training token |
| `demo_executor.move` | Execute Mode 2 PandaCoin demo trades with policy checks |

Existing modules remain:

| Module | Role |
|---|---|
| `panda.move` | Panda NFT and immutable personality |
| `strategy.move` | Strategy hash snapshots |
| `experience.move` | Experience milestones and Walrus blob pointer |
| `trust_proof.move` | Merkle roots for trade facts |

### 11.2 Required Events

```text
TradingPolicyCreated
TradingPolicyUpdated
TradingPolicyPaused
AgentAuthorized
AgentRevoked
PandaVaultCreated
DemoTradeExecuted
SkillDigestSubmitted
TradeBatchRootSubmitted
```

### 11.3 PTB Usage

PTB is used when a user or Agent Signer submits a real Sui transaction.

MVP PTBs:

- Mint Panda.
- Create PandaVault.
- Create TradingPolicy.
- Update / pause / revoke policy.
- Execute PandaCoin demo trade.
- Submit trade batch Merkle root.
- Submit skill digest.

Do not say "PTB signature" in product copy. Use:

```text
User signs a Sui transaction containing a PTB.
```

---

## 12. Backend Design Requirements

### 12.1 New Services

| Service | Responsibility |
|---|---|
| `PolicyGate` | Load, validate, and snapshot TradingPolicy before hot-path paper execution |
| `LedgerService` | Execute virtual ledger mutations in the same DB transaction as Trade Fact commit |
| `TradeFactWriter` | Create OrderIntent, TradeFact, ledger records, and async jobs atomically |
| `QueueDispatcher` | Claim durable `async_jobs` and dispatch background workers |
| `ProofSelector` | Decide which Trade Facts become Chain Proof Moments |
| `ChainExecutionWorker` | Execute selected Mode 2 PandaCoin demo PTBs |
| `ReviewWorker` | Produce evidence-backed reviews after realized PnL is known |
| `SkillMemoryWorker` | Update Panda skill memory from reviewed outcomes |
| `MerkleWorker` | Batch Trade Fact roots and submit proof anchors |
| `WalrusSyncWorker` | Archive review and skill memory snapshots |
| `AgentSignerService` | Sign authorized testnet PTBs for selected Mode 2 proofs |

### 12.2 New Tables

Recommended tables:

```text
panda_vaults
trading_policies
order_intents
panda_accounts
panda_positions
ledger_entries
trade_facts
trade_reviews
skill_memories
skill_versions
chain_execution_logs
async_jobs
outbox_events
```

Existing `trades` can remain for compatibility, but the canonical new record should be `trade_facts`.

### 12.3 Redis Events

Market events:

```text
market:tick:{pair}
market:heartbeat
```

Panda events:

```text
panda:{panda_id}:decision
panda:{panda_id}:order_intent
panda:{panda_id}:execution
panda:{panda_id}:review
panda:{panda_id}:skill
panda:{panda_id}:emotion
async:wakeup
```

---

## 13. Frontend Requirements

### 13.1 New Product Areas

| Area | User sees |
|---|---|
| Agent Wallet Setup | Budget, allowed pairs, daily loss, max trade size, authorized agent |
| Policy Collar | Visual explanation of current constraints |
| PandaVault | Training balance, positions, debt, equity |
| Market Radar | DeepBook chart, orderbook, indicators, market regime |
| Decision Timeline | Why Panda bought/sold/held |
| Chain Proof Panel | tx digest, event, policy version, decision hash |
| Review Journal | Win/loss analysis and skill changes |
| Emergency Controls | Pause, revoke agent, tighten policy |

### 13.2 User Copy Guidelines

Use:

```text
Training Ledger
PandaVault
TradingPolicy
Agent Signer
Demo Chain Execution
Skill Memory
Trade Fact
```

Avoid:

```text
Fake trading
Toy money
PTB signature
AI controls your wallet
Guaranteed learning
Guaranteed profit
```

---

## 14. Trust And Safety

### 14.1 Safety Boundaries

- Panda cannot access the user's entire wallet.
- Agent Signer can only act through authorized policy paths.
- User can pause or revoke policy.
- Policy loosening requires user-signed transaction.
- Mode 2 PandaCoin has no real economic value.
- Mainnet PnL is simulated from real prices, not guaranteed profit.

### 14.2 Failure Handling

| Failure | Required behavior |
|---|---|
| market-monitor down | Pause decisions or mark market stale |
| Redis down | No new decisions; show degraded status |
| policy cache stale | Refetch policy before execution |
| paper ledger execution fails | Mark intent failed; no position update |
| testnet PTB fails | Mark chain execution failed; keep paper trade status separate |
| agent signer unavailable | Continue Mode 1; disable Mode 2 proof |
| max loss reached | Auto-pause execution |

---

## 15. MVP Scope

### 15.1 In Scope

- Panda mint.
- Real DeepBook market monitor.
- Panda decision loop.
- Training Ledger with virtual margin.
- TradingPolicy creation and updates.
- PandaVault creation.
- Backend policy checks for every paper execution.
- Selected PandaCoin testnet demo execution.
- Environment-level Agent Signer for MVP Mode 2.
- Trade Facts.
- Durable async job queue for chain proof, review, skill, Merkle, and Walrus work.
- Evidence-backed reviews.
- Skill Memory updates.
- Merkle root or skill digest submission.
- Frontend dashboard for policy, ledger, decisions, reviews, and chain proofs.

### 15.2 Out Of Scope

- Real mainnet asset trading.
- Real borrowing or DeepBook Margin.
- Short selling.
- Production custody.
- Per-panda production signer isolation.
- DAO governance.
- Fully decentralized AI compute.
- Nautilus / TEE proof.
- Multi-agent portfolio optimization.
- Real PandaCoin economic value.

---

## 16. Success Metrics

### 16.1 Product Metrics

- User can understand what the Panda is allowed to do before training starts.
- User can start a Panda training session in under 5 minutes after mint.
- User can see why each trade was accepted, rejected, or executed.
- User can pause the Panda in one action.
- User can inspect at least one chain proof for a Panda action.

### 16.2 Technical Metrics

- market-monitor publishes healthy ticks for selected DeepBook pairs.
- Decision-to-paper-execution latency is under 2 seconds in normal operation.
- Policy is snapshotted for every OrderIntent.
- Chain proof selector creates at most one proof job per `trade_fact_id + policy_version + decision_hash`.
- Every closed trade has a review.
- Every skill update links to evidence.
- Mode 2 demo PTB succeeds on testnet for a selected policy-compliant Chain Proof Moment.
- Policy-violating demo PTB aborts.

---

## 17. Acceptance Criteria

- [ ] User mints a Panda NFT with immutable personality.
- [ ] User creates PandaVault and TradingPolicy with a signed Sui transaction.
- [ ] User can view authorized_agent and policy limits.
- [ ] market-monitor streams real DeepBook market data.
- [ ] Panda creates BUY / SELL / HOLD decisions from real market data.
- [ ] Every executable decision creates an OrderIntent.
- [ ] Mode 1 checks policy before paper execution.
- [ ] Policy violation creates a rejected intent.
- [ ] Paper ledger updates cash, debt, equity, and positions.
- [ ] Closing a position creates realized PnL.
- [ ] Closed trade produces a review.
- [ ] Review can update Skill Memory only with evidence.
- [ ] Proof selector creates `chain_proof_requested` only for eligible Chain Proof Moments.
- [ ] User can manually request on-chain proof for an existing Trade Fact.
- [ ] Mode 2 executes a selected testnet PandaCoin PTB through Agent Signer.
- [ ] Mode 2 chain event includes decision_hash and policy_version.
- [ ] Frontend shows tx digest for Mode 2.
- [ ] User can pause policy.
- [ ] Paused policy blocks both paper execution and demo PTB.
- [ ] Trade batch Merkle root or skill digest can be submitted on-chain.

---

## 18. Roadmap

| Phase | Goal |
|---|---|
| MVP | Mainnet DeepBook data + Training Ledger + PandaVault + TradingPolicy + PandaCoin demo PTB |
| Testnet Alpha | Stronger review engine, skill memory versioning, richer chain proof panel |
| Mainnet Alpha | Mainnet market monitoring at production quality, Walrus memory backups |
| Real Wallet Beta | Real asset PandaVault, strict policy controls, user-approved execution |
| Future Pro | DeepBook Margin, AMM venue comparison, advanced autonomous risk guard |

---

## 19. Resolved Decisions And Remaining Questions

Resolved:

| Question | Decision |
|---|---|
| PandaVault object type | Shared object |
| TradingPolicy object type | Standalone shared object |
| Agent Signer development model | One environment-level testnet signer for MVP; rotate by user-signed policy update; revoke by pause/revoke policy |
| Mode 2 frequency | Selected automatic Chain Proof Moments plus manual user-triggered proof |
| Pair selection | Promote most liquid DeepBook mainnet pairs available at launch |

Remaining:

1. What is the exact PandaCoin name and symbol?
2. What minimum evidence threshold allows a review to update Skill Memory?
3. Which exact DeepBook mainnet pair IDs are liquid and available in the target deployment environment?

---

## 20. Document Index

| Document | Relationship |
|---|---|
| `docs/architecture.md` | Current service topology; must be updated after this PRD |
| `docs/market-monitor-design.md` | Existing market-monitor design; remains the base for real market data |
| `docs/agent-design.md` | Existing decision pipeline; should be extended with policy gate and skill memory |
| `docs/database-schema.md` | Existing DB design; should be extended with vault/policy/fact tables |
| `docs/contract-design.md` | Existing Move design; should be extended with PandaVault, TradingPolicy, PandaCoin |
| `docs/product-description.md` | Public product story; should be rewritten around Autonomous Agent Wallet |

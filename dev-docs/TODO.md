# TradingPanda TODO — Autonomous Agent Wallet MVP

> **Last updated**: 2026-06-17 (Epic 10 Frontend Product Integration)
> **Current source of truth**: `docs/PRD.md` v3.1 · `docs/architecture.md` · `spec.md` · `docs/design/` · `dev-docs/DEV_CONTEXT.md`

---

## 0. Current MVP Direction

TradingPanda is no longer a generic “simulation dashboard”. The MVP is:

```text
Mint Panda NFT
→ Create Agent Wallet
→ Feed Strategy
→ Train on real DeepBook mainnet market data
→ Execute in Training Ledger
→ Commit Trade Fact
→ Select Chain Proof Moment
→ Submit testnet PandaCoin PTB through Agent Signer
→ Review closed trade
→ Update Skill Memory
```

### Non-Negotiables

- [x] Use **DeepBook mainnet market data** as training truth.
- [x] Use **Training Ledger** as Mode 1 paper execution truth.
- [ ] Do **not** submit a PTB for every paper buy/sell.
- [ ] Use **Mode 2** only for selected/manual Chain Proof Moments.
- [ ] `PandaVault` is a **shared Move object**.
- [ ] `TradingPolicy` is a **standalone shared Move object**.
- [ ] MVP `Agent Signer` is one environment-level **testnet-only** signer.
- [ ] `async_jobs` in PostgreSQL is the durable queue; Redis only wakes workers or pushes realtime events.
- [ ] Frontend follows `docs/design/`: progressive disclosure, page-specific layouts, modal/drawer/toast interactions.

### Status Markers

`[ ]` todo · `[~]` in progress · `[x]` done · `[-]` out of MVP / intentionally skipped

---

## Epic 0 — v3.1 Foundation Alignment

**Done standard**: code, docs, env examples, migrations, and API naming no longer steer new work toward old “simulation/testnet pool” semantics.

### 0.1 Repo Audit And Terminology

- [ ] Audit frontend/backend/contracts for old user-facing copy: `simulation`, `模拟盘`, `DeepBook testnet 两池`, `paper trade = chain trade`.
- [ ] Rename product-facing copy to `Training Ledger`, `Agent Wallet`, `Chain Proof Moment`, `Trade Fact`.
- [x] Keep legacy API names only as compatibility wrappers where cheaper than migration.
- [x] Add comments/deprecation notes where old `simulation/start|stop|status` remains but now means Training Ledger session.
- [x] Update `.env.example` files for v3.1 additions: `AGENT_SIGNER_ADDRESS`, `AGENT_SIGNER_PRIVATE_KEY`, `CHAIN_PROOF_ENABLED`, selected DeepBook mainnet pair config.

### 0.2 Contract And API Spec Alignment

- [ ] Update `docs/api-specification.md` with explicit v3.1 endpoints for Agent Wallet setup, Training Ledger status, Trade Facts, Chain Proof, Review, Safety.
- [ ] Update `spec.md` if implementation changes module contracts or endpoint names.
- [x] Define frontend TypeScript contracts for `PandaVault`, `TradingPolicy`, `OrderIntent`, `TradeFact`, `ChainProofStatus`, `SkillMemory`.
- [x] Define backend Pydantic schemas for the same v3.1 contracts.
- [x] Add shared error codes for `POLICY_*`, `VAULT_*`, `LEDGER_*`, `TRADE_FACT_*`, `CHAIN_PROOF_*`, `AGENT_SIGNER_*`.

### 0.3 Migration Baseline

- [x] Keep existing `simulations` and `trades` tables for compatibility.
- [x] Add v3.1 canonical tables from `docs/database-schema.md`.
- [ ] Route new execution through `order_intents`, `ledger_entries`, and `trade_facts`.
- [x] Decide whether old `trades` are backfilled into `trade_facts` or shown only in legacy views. **Decision**: legacy views only in MVP; no automatic backfill.
- [x] Extend `scripts/verify_db.py` to verify all v3.1 tables and key indexes.

---

## Epic 1 — Mint Panda Identity

**Done standard**: user can mint a Panda NFT identity, see the Panda revealed, and continue to Agent Wallet setup. Mint does not grant trading permission.

**References**: `docs/PRD.md` §6.1 · `docs/design/page-mint.md` · `docs/contract-design.md`

### 1.1 Product UI

- [x] Make `/mint` match `docs/design/page-mint.md`: title, short description, Panda carousel stage, single primary CTA, gas/safety hint.
- [x] Remove questionnaire-style friction from the default mint path if still present.
- [x] Use `WalletSignatureModal` for mint signing.
- [x] Use toast for mint submitted/success/failed.
- [x] Hide tx digest/object id behind `View mint details` drawer after success.
- [x] Route success CTA to Agent Wallet setup.

### 1.2 Chain And Backend

- [x] Confirm active Testnet package IDs in `DEV_CONTEXT.md` still match deployed mint module.
- [x] Ensure mint creates only Panda identity and immutable personality fields.
- [x] Ensure DB registration creates/updates Panda row without vault/policy permissions.
- [x] Ensure retry sync from tx digest works if backend registration fails after chain success.

### 1.3 Tests

- [x] Move tests: mint success, personality immutability, no wallet/policy state in Panda object.
- [x] Backend tests: mint event parser, duplicate mint registration idempotency.
- [x] Frontend smoke: wallet reject, tx pending, success drawer, route jump.

---

## Epic 2 — Agent Wallet Setup

**Done standard**: user creates a shared `PandaVault` and standalone shared `TradingPolicy` with owner signature; backend mirrors both; Panda cannot train until setup is active.

**References**: `docs/PRD.md` §5.2-5.4 · `docs/architecture.md` §3.1, §4 · `docs/design/page-agent-wallet.md`

### 2.1 Move Contracts

- [x] Add `trading_policy.move`.
- [x] Add `panda_vault.move`.
- [x] Add `panda_coin.move` as testnet-only training credit.
- [x] Add owner-gated policy create/update/pause/revoke entry functions.
- [x] Store `authorized_agent`, `policy_version`, allowed pairs, max notional, daily loss, cooldown, proof caps.
- [x] Bind `PandaVault` to `panda_id`, `policy_id`, owner, and authorized agent.
- [x] Emit `TradingPolicyCreated`, `TradingPolicyUpdated`, `TradingPolicyPaused`, `AgentRevoked`, `PandaVaultCreated`.

### 2.2 Contract Tests

- [x] Owner can create PandaVault + TradingPolicy.
- [x] Non-owner cannot loosen/update policy.
- [x] Agent cannot update policy.
- [x] Paused policy blocks demo executor path.
- [x] Stale `policy_version` aborts.
- [x] Mismatched `panda_id` / `vault_id` / `policy_id` aborts.

### 2.3 Database Mirror

- [x] Add `panda_vaults`.
- [x] Add `trading_policies`.
- [x] Add `panda_accounts`.
- [x] Add `panda_positions`.
- [x] Store chain object ids, policy version, signer address, active/paused/revoked state.
- [x] Add mirror sync status so frontend can distinguish chain success from backend sync lag.

### 2.4 Backend APIs

- [x] Add API to read Agent Wallet setup status.
- [x] Add API to register/sync PandaVault and TradingPolicy object ids after signed transaction.
- [x] Add policy validation API for frontend draft policy.
- [x] Add owner action APIs for pause/revoke/tighten flows.
- [x] Enforce that training cannot start without active vault + active policy mirror.

### 2.5 Frontend

- [x] Build `AgentWalletPage` from `docs/design/page-agent-wallet.md`.
- [x] Implement `PandaPermissionCard`.
- [x] Implement `PolicyCollarEditor`.
- [x] Implement `AllowedPairsSelector` using liquidity-first pair defaults.
- [x] Implement `AuthorizedAgentReview` modal.
- [x] Implement wallet signing modal for `Create PandaVault + Policy`.
- [x] Hide full signer/object/PTB details behind drawers.
- [x] Route active setup to Strategy Builder.

---

## Epic 3 — Real Market Monitor And Pair Ranking

**Done standard**: market-monitor publishes healthy DeepBook mainnet ticks for selected liquid pairs; frontend and PandaActor consume the same market truth.

**References**: `docs/PRD.md` §7 · `docs/market-monitor-design.md` · `docs/architecture.md` §8

### 3.1 Pair Ranking

- [x] Implement liquidity-first DeepBook mainnet pair registry.
- [x] Rank pairs by 24h/7d volume, spread, orderbook depth, candle freshness, monitor health, stable quote.
- [x] Store or expose pair metadata: `pair`, `pool_id`, quote asset, base asset, decimals, min tick size.
- [x] Add fallback mapping only as temporary compatibility; product copy should not say testnet sparse pools are training truth.

### 3.2 Tick And Candle Pipeline

- [x] Normalize market event schema for `market:tick:{pair}`.
- [x] Include reference price, OHLCV, spread/depth summary, freshness, source, pair metadata.
- [x] Ensure `/candles?pool=...` returns historical candles from DeepBook data.
- [x] Add health states: fresh, stale, no fills, insufficient candles, source down.
- [x] Ensure stale market data causes Panda to HOLD, not execute.

### 3.3 Realtime

- [x] WebSocket Hub subscribes to `market:tick:*`.
- [x] WebSocket Hub forwards market events to subscribed clients.
- [x] Backend `MarketDataConsumer` consumes ticks without querying DeepBook directly.
- [x] Redis remains event bus only; no durable trading state in Redis.

### 3.4 Tests And Ops

- [x] Unit tests for pair ranking scoring.
- [x] Integration test with sample DeepBook fill/orderbook data.
- [x] Health endpoint smoke for selected launch pairs.
- [x] Update `DEV_CONTEXT.md` only if deployment facts or env names change.

---

## Epic 4 — Strategy Builder Inside Policy

**Done standard**: user can feed strategy rules; backend validates strategy against active TradingPolicy; saved strategy can guide decisions but never expands permissions.

**References**: `docs/PRD.md` §6.2, §8 · `docs/agent-design.md` · `docs/design/page-strategy.md`

### 4.1 Strategy Contract

- [x] Keep parsed rule blocks as primary path.
- [x] Validate strategy pairs against `TradingPolicy.allowed_pairs`.
- [x] Validate notional assumptions against policy max notional / daily loss.
- [x] Persist strategy version and strategy hash.
- [x] Preserve ghost influence from previous strategy without allowing permission bypass.

### 4.2 Backend

- [x] Refactor existing strategy save/validate to load active policy mirror.
- [x] Return policy compatibility result and human-readable conflicts.
- [x] Reject unauthorized pairs before strategy activation.
- [x] Ensure DecisionPipeline reads active strategy version plus Skill Memory.

### 4.3 Frontend

- [x] Build Strategy page from `docs/design/page-strategy.md`.
- [x] Use template-first UX for beginners.
- [x] Hide raw parser JSON and strategy hash behind drawer.
- [x] Show compatibility summary by default.
- [x] Route active strategy to Training Ledger.

### 4.4 Tests

- [x] Strategy with unauthorized pair cannot save.
- [x] Strategy conflict with policy returns actionable field error.
- [x] Strategy save creates new version and ghost record.
- [x] DecisionPipeline loads active version after save.

---

## Epic 5 — Training Ledger Hot Path

**Done standard**: active Panda watches real market ticks, creates BUY/SELL/HOLD decisions, checks policy, mutates paper ledger, and commits canonical Trade Facts.

**References**: `docs/PRD.md` §8-9 · `docs/architecture.md` §3.2, §5.2 · `spec.md` §3.1 · `docs/design/page-training.md`

### 5.1 Database

- [x] Add `order_intents`.
- [x] Add `ledger_entries`.
- [x] Add `trade_facts`.
- [x] Add indexes and unique constraints for `decision_hash`, `fact_hash`, `proof_key`.
- [x] Ensure every executable intent snapshots policy version and policy result.

### 5.2 Backend Hot Path Modules

- [x] Implement `MarketDataConsumer`.
- [x] Refactor `ActorManager` to route ticks only to active PandaActors.
- [x] Refactor `PandaActor` to output `OrderIntent`, not direct trade rows.
- [x] Ensure `DecisionPipeline` produces BUY/SELL/HOLD plus score, evidence, strategy version, skill version.
- [x] Implement `PolicyGate` using active policy mirror.
- [x] Implement `LedgerService` for Training Ledger cash, debt, equity, position, realized/unrealized PnL.
- [x] Implement `TradeFactWriter` to atomically commit OrderIntent, ledger entries, Trade Fact, outbox/async jobs.
- [x] Persist rejected intents, including `REJECTED_BY_POLICY`, not just executed paper trades.

### 5.3 Training Session APIs

- [x] Treat legacy `simulation/start` as Training Ledger session start or add new v3.1 route.
- [x] Start training only when Panda has active vault, active policy, active strategy, selected pair, and fresh market data.
- [x] Stop/pause training without losing committed Trade Facts.
- [x] Expose current Training Ledger account state.
- [x] Expose Trade Fact timeline by Panda.

### 5.4 Realtime Events

- [x] Publish `panda:{id}:decision`.
- [x] Publish `panda:{id}:order_intent`.
- [x] Publish `panda:{id}:execution`.
- [x] Publish `panda:{id}:review` when async review completes.
- [x] Publish failure/stale/policy-paused events explicitly.

### 5.5 Frontend Training Ledger Page

- [x] Build `TrainingLedgerPage` from `docs/design/page-training.md`.
- [x] Implement `TrainingStatusStrip`.
- [x] Implement `PandaAgentStatus`.
- [x] Implement `MarketChartPanel` with DeepBook mainnet candles and live tick pulse.
- [x] Implement `LedgerSummaryStrip`.
- [x] Implement latest decision card and decision timeline drawer.
- [x] Implement policy pass/reject drawer.
- [x] Implement Trade Fact drawer.
- [x] Route eligible Trade Fact to Chain Proof.
- [x] Route closed trade to Review.

### 5.6 Tests

- [x] Unit test PolicyGate pass/reject matrix.
- [x] Unit test LedgerService cash/position/PnL mutation.
- [x] Integration test tick → OrderIntent → PolicyGate → Ledger → TradeFact.
- [x] Test market stale means HOLD/no execution.
- [x] Test policy paused blocks paper execution.
- [x] Test DB transaction rollback prevents partial ledger mutation.

---

## Epic 6 — Chain Proof Mode 2

**Done standard**: selected/manual Trade Fact can become a real Sui testnet PandaCoin PTB through Agent Signer; proof failure never corrupts Training Ledger PnL.

**References**: `docs/PRD.md` §4.2, §8.4, §11 · `docs/architecture.md` §3.3, §5.3, §5.7 · `docs/design/page-chain-proof.md`

### 6.1 Move Execution Proof

- [x] Implement `demo_executor.move`.
- [x] `demo_executor` checks signer equals `TradingPolicy.authorized_agent`.
- [x] `demo_executor` checks `PandaVault.policy_id` and `panda_id`.
- [x] `demo_executor` checks allowed pair, max notional, daily loss/cooldown/cap, paused/revoked/expired state.
- [x] Emit `DemoTradeExecuted` with `trade_fact_id`, `decision_hash`, `policy_version`, side, pair, notional.
- [x] Ensure failed Move checks abort safely.

### 6.2 Chain Execution Tables

- [x] Add `chain_execution_logs`.
- [x] Store proof key, job id, tx digest, Move event id, status, failure reason, retryability.
- [x] Enforce idempotency on `trade_fact_id + policy_version + decision_hash`.

### 6.3 Async Workers

- [x] Implement `ProofSelector`.
- [x] Automatic proof eligibility: `final_score >= 0.75`, EXECUTE, supported pair, policy pass, proof enabled, cooldown/cap pass.
- [x] Manual proof bypasses score threshold only; all policy/idempotency checks still apply.
- [x] Implement `ChainExecutionWorker`.
- [x] Implement `AgentSignerService` for testnet PandaCoin demo PTBs only.
- [x] AgentSigner refuses if policy version, agent address, vault binding, or mode mismatches.
- [x] Store failed proof status without rolling back paper ledger.

### 6.4 Frontend Chain Proof Page

- [x] Build `ChainProofPage` from `docs/design/page-chain-proof.md`.
- [x] Show selected Trade Fact summary and eligibility.
- [x] Show proof job timeline.
- [x] Hide full PTB/object ids behind drawer.
- [x] Use modal for manual proof confirmation and signer scope.
- [x] Show tx digest and Move event after confirmation.
- [x] Show duplicate/cooldown/cap/policy-paused failures in user language.

### 6.5 Tests

- [x] Contract tests for legal demo trade and all major abort paths.
- [x] Backend tests for proof selector eligibility and idempotency.
- [x] Worker tests for tx success, tx failure, retry, duplicate proof.
- [x] E2E smoke: selected Trade Fact → proof job → testnet tx digest shown.

---

## Epic 7 — Review And Skill Memory

**Done standard**: closed paper position produces realized PnL, evidence-backed review, and optional Skill Memory update. Panda cannot learn from unsupported vibes.

**References**: `docs/PRD.md` §10 · `docs/architecture.md` §3.5, §5.3 · `docs/design/page-review.md`

### 7.1 Data Model

- [ ] Add `trade_reviews`.
- [ ] Add `skill_memories`.
- [ ] Add `skill_versions`.
- [ ] Link reviews to one closed Trade Fact.
- [ ] Link skill memories only to reviewed evidence ids.

### 7.2 Review Worker

- [ ] Trigger review on position close or manual review request.
- [ ] Compute realized PnL from Training Ledger entry/exit reference prices.
- [ ] Compare original decision evidence with outcome evidence.
- [ ] Produce hypothesis status: proposed, supported, verified, weakened, retired.
- [ ] Never update skill if evidence is missing or weak.

### 7.3 SkillMemoryWorker

- [ ] Create skill version from supported/verified review.
- [ ] Include evidence refs and confidence.
- [ ] Include digest suitable for later on-chain submission.
- [ ] Ensure future DecisionPipeline can read latest skill version.

### 7.4 Frontend Review Journal

- [ ] Build `ReviewJournalPage` from `docs/design/page-review.md`.
- [ ] Show outcome story and realized PnL by default.
- [ ] Hide evidence refs and skill diff behind drawers.
- [ ] Show “why not updated” modal for insufficient evidence.
- [ ] Route back to Training with new skill active.

### 7.5 Tests

- [ ] Closed trade with positive realized PnL does not automatically verify a skill.
- [ ] Missing evidence blocks review.
- [ ] Supported hypothesis creates memory candidate.
- [ ] Verified hypothesis creates new skill version.
- [ ] Contradictory evidence weakens/retire hypothesis.

---

## Epic 8 — Safety And Owner Controls

**Done standard**: user can pause, revoke, or tighten policy; both backend PolicyGate and Move demo PTB path honor the new policy state.

**References**: `docs/PRD.md` §14 · `docs/architecture.md` §5.7 · `docs/design/page-safety.md`

### 8.1 Move Owner Controls

- [x] Implement `pause_policy`.
- [x] Implement `revoke_agent`.
- [x] Implement `tighten_policy`.
- [x] Increment `policy_version` on update.
- [x] Emit events for pause/revoke/tighten.
- [x] Block agent from loosening policy.

### 8.2 Backend Mirror And Hot Path

- [x] Sync policy events into `trading_policies`.
- [x] PolicyGate blocks executable intents after pause/revoke.
- [x] ChainExecutionWorker blocks queued proof if policy becomes paused/revoked.
- [x] Pending jobs affected by pause/revoke are marked canceled/blocked where appropriate.
- [x] Mirror lag enters degraded-safe mode: block execution until policy state is fresh.

### 8.3 Frontend Safety Page

- [x] Build `EmergencyControlsPage` from `docs/design/page-safety.md`.
- [x] Show `RiskStatusBanner`.
- [x] Implement Pause, Revoke Agent, Tighten cards.
- [x] Use danger modal for pause/revoke consequence confirmation.
- [x] Use drawer for tighten limits editor and affected jobs.
- [x] Show tx digest and mirror sync state after owner signature.

### 8.4 Tests

- [x] Paused policy blocks Training Ledger execution.
- [x] Paused policy aborts demo executor Move path.
- [x] Revoked signer blocks AgentSignerService.
- [x] Tightened max notional rejects previously valid intent.
- [x] Mirror stale state blocks execution safely.

---

## Epic 9 — Trust, Merkle, Walrus

**Done standard**: Trade Fact batches and/or Skill Memory digests can be anchored; long-term evidence can be archived without blocking hot path.

**References**: `docs/PRD.md` §15.1, §17 · `docs/architecture.md` §5.3, §6.3 · `docs/contract-design.md`

### 9.1 Merkle Worker

- [x] Existing Merkle tree algorithm baseline exists.
- [x] Switch Merkle leaves from legacy `trades` to canonical `trade_facts`.
- [x] Compute deterministic batch root by Panda and batch index.
- [x] Persist root and leaf count.
- [x] Submit trade fact Merkle root on-chain through `trust_proof`.
- [x] Show latest proof status in frontend where relevant.

### 9.2 Skill Digest

- [x] Compute skill version digest.
- [x] Submit skill digest on-chain when configured.
- [x] Link digest tx back to `skill_versions`.
- [x] Ensure digest submission is async and retryable.

### 9.3 Walrus Archive

- [x] Implement Walrus archive job for review batches and skill snapshots.
- [x] Store blob id/digest in DB.
- [x] Do not block Training Ledger or review completion on Walrus upload.
- [x] Add retry and failure visibility in async job status.

---

## Epic 10 — Frontend Product Integration

**Done standard**: production frontend follows latest design docs, not just the static prototype. Pages show default task/status first and reveal evidence through modal/drawer/toast.

**References**: `docs/design/README.md` · `docs/design/visual-system.md` · `docs/prototype-redesign-spec.md` · `prototype/`

### 10.1 Shared Interaction System

- [x] Add reusable modal, drawer, toast, route-jump helpers to production frontend.
- [x] Implement L0/L1/L2/L3 progressive disclosure contract.
- [x] Keep System Notes/prototype-only explanations out of production UI.
- [x] Add mobile bottom-sheet behavior for drawers.
- [x] Ensure durable success facts are available outside toast.

### 10.2 Page Builds

- [x] Mint page matches low-density design.
- [x] Agent Wallet page matches medium-density setup wizard.
- [x] Strategy page matches template/rule studio.
- [x] Training Ledger page matches high-density cockpit.
- [x] Chain Proof page matches proof console.
- [x] Review Journal page matches case-file design.
- [x] Safety page matches urgent control design.

### 10.3 Visual System

- [x] Preserve black/gold/neon-green TradingPanda product direction where this prototype is used.
- [x] Use panda visuals to communicate mood/state without exposing hidden emotion coefficients.
- [x] Avoid raw ids/logs on first paint.
- [x] Verify desktop and mobile layouts for every journey.

---

## Epic 11 — MVP Acceptance And Demo Path

**Done standard**: one full demo Panda can complete the MVP path end-to-end with real DeepBook data and at least one testnet Chain Proof.

### 11.1 Golden Path E2E

- [ ] Mint Panda.
- [ ] Create PandaVault and TradingPolicy.
- [ ] Feed policy-compatible strategy.
- [ ] Start Training Ledger session.
- [ ] Consume fresh DeepBook mainnet tick.
- [ ] Produce BUY/SELL/HOLD decision.
- [ ] Persist OrderIntent and Trade Fact.
- [ ] Execute paper ledger mutation for policy-passing intent.
- [ ] Close/reduce position and compute realized PnL.
- [ ] Generate review.
- [ ] Update Skill Memory when evidence supports it.
- [ ] Request or select Chain Proof Moment.
- [ ] Submit testnet PandaCoin PTB through Agent Signer.
- [ ] Show tx digest and policy version in frontend.
- [ ] Pause policy and verify both Mode 1 and Mode 2 block.

### 11.2 Regression Cases

- [ ] Market stale → Panda holds.
- [ ] Unauthorized pair → rejected intent persisted.
- [ ] Max notional exceeded → rejected intent persisted.
- [ ] Policy paused → paper execution blocked.
- [ ] Signer revoked → chain proof blocked.
- [ ] Duplicate proof request → existing proof returned.
- [ ] Chain proof failure → Training Ledger PnL unchanged.
- [ ] Review with missing evidence → no skill update.

### 11.3 Verification Commands

- [ ] `sui move test`
- [ ] backend pytest for PolicyGate / LedgerService / TradeFactWriter / workers
- [ ] frontend type-check
- [ ] frontend build
- [ ] market-monitor tests
- [ ] WebSocket Hub tests
- [ ] manual browser smoke for all design pages

---

## Legacy Baseline To Preserve

These are existing capabilities or historical work. Preserve what is useful, but do not let legacy naming drive new MVP design.

- [x] Wallet / zkLogin auth baseline.
- [x] Nonce Redis wallet signature hardening.
- [x] Panda mint baseline and DB registration.
- [x] Strategy builder baseline with parsed rule path.
- [x] Existing DecisionPipeline and PandaActor baseline.
- [x] Existing market-monitor DeepBook polling/candle baseline.
- [x] Existing WebSocket Hub market/panda event baseline.
- [x] Existing leaderboard / achievements / checkin chain-off baseline.
- [x] Existing Panda avatar / panda-lab tooling baseline.
- [-] Old “Dashboard simulation” product framing is superseded by Training Ledger.
- [-] Old “DeepBook testnet two-pool training truth” is superseded by DeepBook mainnet data strategy.
- [-] Old “every paper trade should be a PTB” is explicitly out of MVP.

---

## Phase 2 / Out Of MVP

- [-] Real mainnet asset trading.
- [-] Real borrowing or DeepBook Margin.
- [-] Short selling.
- [-] Production custody.
- [-] Per-Panda production signer isolation.
- [-] Nautilus / TEE proof.
- [-] DAO governance.
- [-] Real PandaCoin economic value.
- [-] AMM venue execution.
- [-] Multi-agent portfolio optimization.
- [-] NFT Kiosk marketplace hardening unless needed for demo narrative.

---

## Epic Mapping

| TODO Epic | PRD | Architecture | Design |
|---|---|---|---|
| 1 Mint | §6.1, §11 | §3.1, §4 | `page-mint.md` |
| 2 Agent Wallet | §5.2-5.4, §11 | §3.1, §4, §5.7 | `page-agent-wallet.md` |
| 3 Market Monitor | §7 | §2, §8 | Training market widgets |
| 4 Strategy | §8 | §5.2 | `page-strategy.md` |
| 5 Training Ledger | §8-9 | §3.2, §5.2 | `page-training.md` |
| 6 Chain Proof | §4.2, §8.4, §11 | §3.3, §5.3 | `page-chain-proof.md` |
| 7 Review / Skill | §10 | §3.5, §5.3 | `page-review.md` |
| 8 Safety | §14 | §5.7 | `page-safety.md` |
| 9 Trust | §15, §17 | §5.3, §6.3 | Proof / Review surfaces |
| 10 Frontend Product | §13 | §7 | all `docs/design/` |

---

## Working Rules

1. Start from the lowest-numbered unfinished Epic that blocks the MVP path.
2. For code tasks, follow TDD where practical: failing test → minimal implementation → refactor.
3. Update this TODO after completing a task.
4. Append `dev-docs/DEV_CONTEXT.md` before ending any development session.
5. If a task changes deployment facts, API routes, env vars, database schema, or ports, update `DEV_CONTEXT.md` corresponding sections too.

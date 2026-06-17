# TradingPanda Database Schema

> Version 2.1 · 2026-06-17  
> Source of truth: `docs/PRD.md` v3.1  
> Purpose: operational PostgreSQL schema for the Autonomous Agent Wallet MVP.

---

## 1. Storage Principles

PostgreSQL is the operational source of truth for hot data:

- User and Panda mirrors.
- TradingPolicy and PandaVault mirrors.
- OrderIntent lifecycle.
- Training Ledger balances.
- Trade Facts.
- Reviews.
- Skill Memory.
- Chain execution logs.
- Durable async jobs and outbox events.

Sui is the source of truth for:

- Panda NFT identity and immutable personality.
- On-chain TradingPolicy / PandaVault objects.
- TradingPolicy is a standalone shared object.
- PandaVault is a shared object.
- PandaCoin demo execution events.
- Merkle roots and skill digests.

Walrus is the archive layer for:

- Skill Memory snapshots.
- Review archives.
- Trade Fact batches.

Redis is not durable storage. It is only a realtime event bus.

---

## 2. Existing Tables Kept

Existing tables remain useful:

```text
users
pandas
strategies
strategy_history
experience_patterns
experience_mastery
experience_mistakes
experience_cycles
emotions_log
merkle_roots
achievements
user_achievements
checkins
market_data_cache
correlation_matrix
panda_diary
```

Existing `simulations` and `trades` may remain for backward compatibility, but new PRD v3 logic should treat these as legacy compatibility surfaces. New execution and learning should use:

```text
order_intents
trade_facts
ledger_entries
trade_reviews
skill_memories
async_jobs
outbox_events
```

---

## 3. New Core Tables

### 3.1 `panda_vaults`

Mirror of the PandaVault concept.

```sql
CREATE TABLE panda_vaults (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id              UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    sui_object_id          TEXT UNIQUE,
    sui_object_kind        TEXT NOT NULL DEFAULT 'shared_object'
                          CHECK (sui_object_kind IN ('shared_object')),
    mode                  TEXT NOT NULL CHECK (mode IN ('training_ledger', 'panda_coin_demo', 'real_wallet')),
    status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'revoked', 'closed')),
    owner_address          TEXT NOT NULL,
    authorized_agent       TEXT,
    agent_key_scope        TEXT NOT NULL DEFAULT 'environment'
                          CHECK (agent_key_scope IN ('environment','panda','user_session','kms')),
    base_asset             TEXT NOT NULL DEFAULT 'vUSDC',
    policy_id              UUID,
    policy_version         INTEGER NOT NULL DEFAULT 1,
    created_tx_digest      TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_panda_vaults_panda ON panda_vaults (panda_id);
CREATE INDEX idx_panda_vaults_agent ON panda_vaults (authorized_agent) WHERE authorized_agent IS NOT NULL;
```

### 3.2 `trading_policies`

Mirror and operational cache of the user-approved risk collar.

```sql
CREATE TABLE trading_policies (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id                 UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    vault_id                 UUID REFERENCES panda_vaults(id) ON DELETE CASCADE,
    sui_object_id             TEXT UNIQUE,
    object_model              TEXT NOT NULL DEFAULT 'standalone_shared_object'
                             CHECK (object_model IN ('standalone_shared_object')),
    owner_address             TEXT NOT NULL,
    authorized_agent          TEXT,
    agent_key_scope           TEXT NOT NULL DEFAULT 'environment'
                             CHECK (agent_key_scope IN ('environment','panda','user_session','kms')),
    agent_key_version         INTEGER NOT NULL DEFAULT 1,
    mode                     TEXT NOT NULL CHECK (mode IN ('training_ledger', 'panda_coin_demo', 'real_wallet')),
    allowed_pairs             JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_notional_per_trade    NUMERIC(20, 8) NOT NULL,
    max_daily_loss            NUMERIC(20, 8) NOT NULL,
    max_leverage              NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
    max_open_positions        INTEGER NOT NULL DEFAULT 1,
    expires_at                TIMESTAMPTZ,
    paused                    BOOLEAN NOT NULL DEFAULT FALSE,
    version                   INTEGER NOT NULL DEFAULT 1,
    policy_hash               TEXT NOT NULL,
    created_tx_digest         TEXT,
    updated_tx_digest         TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trading_policies_panda ON trading_policies (panda_id, version DESC);
CREATE INDEX idx_trading_policies_active ON trading_policies (panda_id) WHERE paused = FALSE;
```

### 3.3 `panda_accounts`

Training Ledger account state.

```sql
CREATE TABLE panda_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id            UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    vault_id            UUID REFERENCES panda_vaults(id) ON DELETE CASCADE,
    mode                TEXT NOT NULL DEFAULT 'training_ledger',
    base_asset          TEXT NOT NULL DEFAULT 'vUSDC',
    cash_balance        NUMERIC(24, 8) NOT NULL DEFAULT 0,
    debt_balance        NUMERIC(24, 8) NOT NULL DEFAULT 0,
    equity              NUMERIC(24, 8) NOT NULL DEFAULT 0,
    realized_pnl        NUMERIC(24, 8) NOT NULL DEFAULT 0,
    unrealized_pnl      NUMERIC(24, 8) NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'liquidated', 'closed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (panda_id, mode)
);

CREATE INDEX idx_panda_accounts_panda ON panda_accounts (panda_id);
```

### 3.4 `panda_positions`

Open Training Ledger positions.

```sql
CREATE TABLE panda_positions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id            UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    account_id          UUID NOT NULL REFERENCES panda_accounts(id) ON DELETE CASCADE,
    pair                TEXT NOT NULL,
    asset               TEXT NOT NULL,
    quantity            NUMERIC(24, 8) NOT NULL DEFAULT 0,
    avg_entry_price     NUMERIC(24, 8) NOT NULL DEFAULT 0,
    current_price       NUMERIC(24, 8) NOT NULL DEFAULT 0,
    notional_value      NUMERIC(24, 8) NOT NULL DEFAULT 0,
    unrealized_pnl      NUMERIC(24, 8) NOT NULL DEFAULT 0,
    opened_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, pair)
);

CREATE INDEX idx_panda_positions_panda ON panda_positions (panda_id);
```

### 3.5 `order_intents`

The Panda's proposed action before approval and execution.

```sql
CREATE TABLE order_intents (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id              UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    vault_id              UUID REFERENCES panda_vaults(id),
    policy_id             UUID REFERENCES trading_policies(id),
    policy_version         INTEGER NOT NULL,
    mode                  TEXT NOT NULL CHECK (mode IN ('training_ledger', 'panda_coin_demo', 'real_wallet')),
    pair                  TEXT NOT NULL,
    side                  TEXT NOT NULL CHECK (side IN ('BUY', 'SELL', 'HOLD')),
    notional              NUMERIC(24, 8) NOT NULL DEFAULT 0,
    reference_price       NUMERIC(24, 8) NOT NULL DEFAULT 0,
    max_slippage_bps      NUMERIC(10, 4),
    final_score           NUMERIC(8, 6),
    reason                TEXT,
    decision_hash         TEXT NOT NULL,
    proof_eligible        BOOLEAN NOT NULL DEFAULT FALSE,
    proof_requested       BOOLEAN NOT NULL DEFAULT FALSE,
    proof_request_source  TEXT CHECK (proof_request_source IN ('auto','manual')),
    proof_key             TEXT,
    status                TEXT NOT NULL DEFAULT 'DECIDED',
    market_snapshot       JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision_snapshot     JSONB NOT NULL DEFAULT '{}'::jsonb,
    policy_snapshot       JSONB NOT NULL DEFAULT '{}'::jsonb,
    rejection_reason      TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_intents_panda_created ON order_intents (panda_id, created_at DESC);
CREATE INDEX idx_order_intents_status ON order_intents (status);
CREATE UNIQUE INDEX idx_order_intents_decision_hash ON order_intents (decision_hash);
CREATE UNIQUE INDEX idx_order_intents_proof_key ON order_intents (proof_key) WHERE proof_key IS NOT NULL;
```

### 3.6 `ledger_entries`

Append-only Training Ledger journal.

```sql
CREATE TABLE ledger_entries (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id              UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    account_id            UUID NOT NULL REFERENCES panda_accounts(id) ON DELETE CASCADE,
    order_intent_id        UUID REFERENCES order_intents(id),
    trade_fact_id          UUID,
    entry_type             TEXT NOT NULL
                          CHECK (entry_type IN ('deposit','borrow','buy','sell','repay','fee','pnl','adjustment','reject')),
    asset                 TEXT NOT NULL,
    amount                NUMERIC(24, 8) NOT NULL,
    price                 NUMERIC(24, 8),
    cash_after            NUMERIC(24, 8),
    debt_after            NUMERIC(24, 8),
    equity_after          NUMERIC(24, 8),
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_entries_panda_created ON ledger_entries (panda_id, created_at DESC);
CREATE INDEX idx_ledger_entries_intent ON ledger_entries (order_intent_id);
```

### 3.7 `trade_facts`

Canonical evidence record for decision, execution, and outcome.

```sql
CREATE TABLE trade_facts (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id                  UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    order_intent_id            UUID NOT NULL REFERENCES order_intents(id),
    pair                      TEXT NOT NULL,
    side                      TEXT NOT NULL CHECK (side IN ('BUY','SELL','HOLD')),
    mode                      TEXT NOT NULL CHECK (mode IN ('training_ledger','panda_coin_demo','real_wallet')),
    opened_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at                 TIMESTAMPTZ,
    market_snapshot           JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision_snapshot         JSONB NOT NULL DEFAULT '{}'::jsonb,
    policy_snapshot           JSONB NOT NULL DEFAULT '{}'::jsonb,
    ledger_snapshot_before    JSONB NOT NULL DEFAULT '{}'::jsonb,
    execution_snapshot        JSONB NOT NULL DEFAULT '{}'::jsonb,
    ledger_snapshot_after     JSONB NOT NULL DEFAULT '{}'::jsonb,
    outcome                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    realized_pnl              NUMERIC(24, 8),
    realized_pnl_pct          NUMERIC(12, 8),
    review_status             TEXT NOT NULL DEFAULT 'pending'
                              CHECK (review_status IN ('pending','reviewed','skipped')),
    proof_status              TEXT NOT NULL DEFAULT 'not_requested'
                              CHECK (proof_status IN ('not_requested','eligible','requested','submitted','confirmed','failed','cancelled')),
    proof_key                 TEXT,
    chain_execution_log_id     UUID,
    skill_version_before      INTEGER,
    skill_version_after       INTEGER,
    fact_hash                 TEXT NOT NULL,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_facts_panda_created ON trade_facts (panda_id, created_at DESC);
CREATE INDEX idx_trade_facts_review_status ON trade_facts (review_status);
CREATE INDEX idx_trade_facts_proof_status ON trade_facts (proof_status);
CREATE UNIQUE INDEX idx_trade_facts_hash ON trade_facts (fact_hash);
CREATE UNIQUE INDEX idx_trade_facts_proof_key ON trade_facts (proof_key) WHERE proof_key IS NOT NULL;
```

### 3.8 `trade_reviews`

Evidence-backed reviews for closed trades.

```sql
CREATE TABLE trade_reviews (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id              UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    trade_fact_id          UUID NOT NULL REFERENCES trade_facts(id) ON DELETE CASCADE,
    verdict               TEXT NOT NULL CHECK (verdict IN ('win','loss','breakeven','invalid')),
    reason_summary         TEXT NOT NULL,
    evidence               JSONB NOT NULL DEFAULT '{}'::jsonb,
    hypotheses             JSONB NOT NULL DEFAULT '[]'::jsonb,
    reviewer               TEXT NOT NULL DEFAULT 'agent',
    review_hash            TEXT NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_reviews_panda_created ON trade_reviews (panda_id, created_at DESC);
CREATE UNIQUE INDEX idx_trade_reviews_fact ON trade_reviews (trade_fact_id);
```

### 3.9 `skill_memories`

Reviewed and evidence-backed learned rules.

```sql
CREATE TABLE skill_memories (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id              UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    scope                 TEXT NOT NULL CHECK (scope IN ('global','pair','regime')),
    pair                  TEXT,
    market_regime          TEXT,
    rule_text              TEXT NOT NULL,
    confidence             NUMERIC(8, 6) NOT NULL DEFAULT 0,
    status                 TEXT NOT NULL DEFAULT 'proposed'
                          CHECK (status IN ('proposed','supported','verified','weakened','retired')),
    evidence_trade_fact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    version                INTEGER NOT NULL,
    memory_hash            TEXT NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_memories_panda_status ON skill_memories (panda_id, status);
CREATE INDEX idx_skill_memories_pair ON skill_memories (pair) WHERE pair IS NOT NULL;
```

### 3.10 `skill_versions`

Versioned Skill Memory digest.

```sql
CREATE TABLE skill_versions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id              UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    version               INTEGER NOT NULL,
    skill_hash             TEXT NOT NULL,
    walrus_blob_id         TEXT,
    submitted_tx_digest    TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (panda_id, version)
);

CREATE INDEX idx_skill_versions_panda_latest ON skill_versions (panda_id, version DESC);
```

### 3.11 `chain_execution_logs`

Mode 2 testnet execution proof log.

```sql
CREATE TABLE chain_execution_logs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id              UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    order_intent_id        UUID REFERENCES order_intents(id),
    trade_fact_id          UUID REFERENCES trade_facts(id),
    network               TEXT NOT NULL DEFAULT 'testnet',
    tx_digest              TEXT NOT NULL,
    event_type             TEXT,
    event_payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
    policy_version         INTEGER,
    decision_hash          TEXT,
    proof_key              TEXT,
    proof_source           TEXT CHECK (proof_source IN ('auto','manual')),
    manual_requested_by    UUID REFERENCES users(id),
    status                 TEXT NOT NULL CHECK (status IN ('submitted','confirmed','failed')),
    error_message          TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chain_execution_logs_panda_created ON chain_execution_logs (panda_id, created_at DESC);
CREATE UNIQUE INDEX idx_chain_execution_logs_digest ON chain_execution_logs (tx_digest);
CREATE UNIQUE INDEX idx_chain_execution_logs_proof_key ON chain_execution_logs (proof_key) WHERE proof_key IS NOT NULL;
```

### 3.12 `async_jobs`

Durable queue of record for side effects that must not be lost.

```sql
CREATE TABLE async_jobs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type              TEXT NOT NULL
                          CHECK (job_type IN (
                            'trade_fact_committed',
                            'chain_proof_requested',
                            'position_closed',
                            'review_requested',
                            'review_completed',
                            'skill_snapshot_ready',
                            'merkle_batch_ready',
                            'walrus_archive_requested'
                          )),
    status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','running','retrying','completed','failed','cancelled')),
    priority              INTEGER NOT NULL DEFAULT 100,
    run_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at             TIMESTAMPTZ,
    locked_by             TEXT,
    attempts              INTEGER NOT NULL DEFAULT 0,
    max_attempts          INTEGER NOT NULL DEFAULT 5,
    idempotency_key       TEXT NOT NULL,
    payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_error            TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_async_jobs_due ON async_jobs (status, run_at, priority);
CREATE UNIQUE INDEX idx_async_jobs_idempotency ON async_jobs (idempotency_key);
```

### 3.13 `outbox_events`

Transactional event outbox for realtime publish and worker wakeups.

```sql
CREATE TABLE outbox_events (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type        TEXT NOT NULL,
    aggregate_id          UUID NOT NULL,
    event_type            TEXT NOT NULL,
    redis_channel         TEXT,
    payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
    status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','published','failed','skipped')),
    attempts              INTEGER NOT NULL DEFAULT 0,
    last_error            TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at          TIMESTAMPTZ
);

CREATE INDEX idx_outbox_events_status ON outbox_events (status, created_at);
```

---

## 4. Updates To Existing Tables

### 4.1 `pandas`

Add:

```sql
ALTER TABLE pandas
    ADD COLUMN IF NOT EXISTS active_vault_id UUID,
    ADD COLUMN IF NOT EXISTS active_policy_id UUID,
    ADD COLUMN IF NOT EXISTS active_skill_version INTEGER DEFAULT 0;
```

Existing `is_trading` remains useful as a transfer / active-agent lock, but product copy should use "agent active" or "policy active" rather than old "simulation running" wording.

### 4.2 `merkle_roots`

`merkle_roots` should support Trade Fact batch roots:

```sql
ALTER TABLE merkle_roots
    ADD COLUMN IF NOT EXISTS root_type TEXT DEFAULT 'trade_facts',
    ADD COLUMN IF NOT EXISTS start_fact_id UUID,
    ADD COLUMN IF NOT EXISTS end_fact_id UUID;
```

---

## 5. Relationships

```text
users 1─N pandas
pandas 1─N panda_vaults
pandas 1─N trading_policies
panda_vaults 1─N panda_accounts
panda_accounts 1─N panda_positions
pandas 1─N order_intents
order_intents 1─N ledger_entries
order_intents 1─1 trade_facts
trade_facts 1─1 trade_reviews
trade_reviews N─N skill_memories via evidence ids
order_intents 1─N chain_execution_logs
pandas 1─N skill_versions
trade_facts 1─N async_jobs via job payload / idempotency key
outbox_events publish durable state changes to Redis
```

---

## 6. Event To Storage Mapping

| Event | Storage |
|---|---|
| `TradingPolicyCreated` | `trading_policies` |
| `TradingPolicyUpdated` | new `trading_policies.version` row or update current mirror |
| `TradingPolicyPaused` | `trading_policies.paused=true`, `panda_vaults.status='paused'` |
| `AgentRevoked` | clear `authorized_agent` or mark policy revoked |
| `PandaVaultCreated` | `panda_vaults` |
| `DemoTradeExecuted` | `chain_execution_logs`, linked `trade_facts.execution_snapshot` |
| `ChainProofRequested` | `async_jobs`, `trade_facts.proof_status='requested'` |
| `MerkleRootSubmitted` | `merkle_roots` |
| `SkillDigestSubmitted` | `skill_versions.submitted_tx_digest` |

---

## 7. Data Integrity Rules

- Every executable `OrderIntent` must snapshot policy.
- Every paper execution must create at least one `ledger_entries` row.
- Every position close must produce or update a `trade_facts` row with realized PnL.
- Every `trade_reviews` row must reference exactly one `trade_facts` row.
- `skill_memories` may only reference reviewed facts as evidence.
- Mode 2 chain execution failure must not mutate Training Ledger balances.
- Chain proof idempotency key must be unique: `trade_fact_id + policy_version + decision_hash`.
- `async_jobs` is the durable queue; Redis may only wake workers.
- `outbox_events` must be reconstructible from durable state.
- Redis events must be reconstructible from PostgreSQL state.

---

## 8. Migration Strategy

1. Keep existing `simulations` and `trades` tables.
2. Add PRD v3 tables.
3. Route new Panda execution through `order_intents` and `trade_facts`.
4. Optionally backfill old `trades` into `trade_facts` for historical display.
5. Gradually update frontend to read new ledger/fact/review endpoints.

---

## 9. Explicit Non-Goals

- Do not store Agent Signer private keys in PostgreSQL.
- Do not use `trades` as the canonical future learning record.
- Do not treat PandaCoin as a real asset balance in financial reporting.
- Do not compute Skill Memory from unreviewed or open trades.
- Do not rely on Redis for auditability.

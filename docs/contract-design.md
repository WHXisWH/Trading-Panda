# TradingPanda Contract Design

> Version 2.1 · 2026-06-17  
> Source of truth: `docs/PRD.md` v3.1  
> Chain: Sui Move  
> Purpose: define the Move objects that make the Panda an autonomous agent wallet with bounded authority.

---

## 1. Contract Thesis

The contracts do not try to run AI on-chain. They create the safety rails that let a chain-offloaded Panda agent act autonomously:

```text
Panda NFT = identity
TradingPolicy = risk collar
PandaVault = bounded execution container
PandaCoin = testnet training credit
DemoExecutor = Move-enforced chain execution proof
TrustProof = proof of off-chain Trade Facts
```

The key design rule:

```text
The user never gives the Panda unlimited wallet access.
The user authorizes a bounded agent address.
Move checks that every chain action stays inside the policy.
```

Resolved MVP object decisions:

| Object / actor | Decision |
|---|---|
| `TradingPolicy` | Standalone shared object; owner-gated updates only |
| `PandaVault` | Shared object; bounded container for PandaCoin demo state |
| `authorized_agent` | Environment-level testnet Agent Signer in MVP |
| `demo_executor` | Executes only selected Chain Proof Moments, not every paper trade |

---

## 2. Module Overview

### 2.1 Existing Modules

| Module | File | Role |
|---|---|---|
| `panda` | `panda.move` | Panda NFT, immutable personality, transfer lock |
| `panda_registry` | `panda_registry.move` | Mint registry |
| `strategy` | `strategy.move` | Strategy hash and strategy shadow dynamic fields |
| `experience` | `experience.move` | Experience milestone and Walrus blob pointer |
| `trust_proof` | `trust_proof.move` | Merkle root submission and verification |
| `achievement` | `achievement.move` | Achievement registry and events |
| `market` | `market.move` | Kiosk integration stub |
| `deepbook_adapter` | `deepbook_adapter.move` | Utility stub; not MVP execution truth |

### 2.2 New Modules

| Module | File | Role |
|---|---|---|
| `trading_policy` | `trading_policy.move` | Create, update, pause, revoke TradingPolicy |
| `panda_vault` | `panda_vault.move` | Create shared PandaVault and bind it to Panda + policy |
| `panda_coin` | `panda_coin.move` | Testnet-only training token |
| `demo_executor` | `demo_executor.move` | Execute selected PandaCoin demo trades under policy checks |

---

## 3. Existing Panda NFT

`Panda` remains the chain identity and personality root.

```move
public struct Panda has key, store {
    id: UID,
    boldness: u8,
    patience: u8,
    intuition: u8,
    focus: u8,
    contrarian: u8,
    talent: u8,
    mint_time: u64,
    generation: u64,
    is_trading: bool,
    created_at: u64,
}
```

Rules:

- Personality traits are immutable after mint.
- Mutable wallet and policy state must not be added to the Panda struct.
- Agent authorization belongs in `TradingPolicy`.
- Bounded execution state belongs in `PandaVault`.

---

## 4. TradingPolicy

`TradingPolicy` is the user-defined risk collar. It is a standalone shared object, not a dynamic field attached to the Panda NFT.

```move
module trading_panda::trading_policy {
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::string::String;

    const E_NOT_OWNER: u64 = 100;
    const E_NOT_AGENT: u64 = 101;
    const E_PAUSED: u64 = 102;
    const E_EXPIRED: u64 = 103;
    const E_PAIR_NOT_ALLOWED: u64 = 104;
    const E_NOTIONAL_TOO_LARGE: u64 = 105;
    const E_DAILY_LOSS_EXCEEDED: u64 = 106;

    public struct TradingPolicy has key, store {
        id: UID,
        panda_id: ID,
        owner: address,
        authorized_agent: address,
        mode: u8,                    // 1 training ledger, 2 panda coin demo, 3 future real wallet
        allowed_pairs_hash: vector<u8>,
        max_notional_per_trade: u64,
        max_daily_loss: u64,
        max_leverage_bps: u64,
        max_open_positions: u64,
        expires_at_ms: u64,
        paused: bool,
        version: u64,
        policy_hash: vector<u8>,
        created_at_ms: u64,
        updated_at_ms: u64,
    }
}
```

### 4.1 Owner Operations

```move
public entry fun create_policy(...)
public entry fun update_policy(...)
public entry fun pause_policy(...)
public entry fun revoke_agent(...)
```

Rules:

- Only `owner` can update, pause, or revoke.
- Loosening policy requires a user-signed transaction.
- Panda agents can suggest changes off-chain but cannot call policy-loosening functions.
- Agent PTBs can read/check the policy but cannot mutate limits.

### 4.2 Agent Checks

Policy exposes helper checks for `demo_executor`:

```move
public fun assert_agent(policy: &TradingPolicy, ctx: &TxContext)
public fun assert_active(policy: &TradingPolicy, clock: &Clock)
public fun assert_trade_allowed(
    policy: &TradingPolicy,
    pair_hash: vector<u8>,
    notional: u64,
    daily_loss: u64,
    clock: &Clock,
    ctx: &TxContext,
)
```

The contract may store `allowed_pairs_hash` instead of a vector of strings for MVP simplicity. The backend must include the human-readable pair in events and facts.

### 4.3 Events

```move
public struct TradingPolicyCreated has copy, drop {
    policy_id: ID,
    panda_id: ID,
    owner: address,
    authorized_agent: address,
    version: u64,
    policy_hash: vector<u8>,
    timestamp_ms: u64,
}

public struct TradingPolicyUpdated has copy, drop {
    policy_id: ID,
    panda_id: ID,
    version: u64,
    policy_hash: vector<u8>,
    timestamp_ms: u64,
}

public struct TradingPolicyPaused has copy, drop {
    policy_id: ID,
    panda_id: ID,
    paused: bool,
    timestamp_ms: u64,
}

public struct AgentRevoked has copy, drop {
    policy_id: ID,
    panda_id: ID,
    old_agent: address,
    timestamp_ms: u64,
}
```

---

## 5. PandaVault

`PandaVault` is the bounded execution container. It is a shared object so user-signed setup transactions and authorized agent demo transactions can both touch it through Move checks.

```move
module trading_panda::panda_vault {
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::balance::Balance;
    use sui::event;
    use trading_panda::panda_coin::PANDA_COIN;

    public struct PandaVault has key, store {
        id: UID,
        panda_id: ID,
        owner: address,
        policy_id: ID,
        authorized_agent: address,
        mode: u8,
        panda_coin_balance: Balance<PANDA_COIN>,
        status: u8,                  // 1 active, 2 paused, 3 revoked, 4 closed
        created_at_ms: u64,
        updated_at_ms: u64,
    }
}
```

MVP role:

- Mode 1: on-chain training account license and proof anchor.
- Mode 2: testnet PandaCoin execution container.
- Mode 3 future: real asset vault.

### 5.1 User Operations

```move
public entry fun create_vault(...)
public entry fun deposit_panda_coin(...)
public entry fun withdraw_panda_coin(...)
public entry fun pause_vault(...)
public entry fun close_vault(...)
```

`create_vault` should share the created object before returning so the authorized agent can use it in Mode 2 PTBs.

### 5.2 Agent Operations

Agent operations are not exposed directly as arbitrary withdrawals. They should be called through `demo_executor`, which checks policy first.

### 5.3 Events

```move
public struct PandaVaultCreated has copy, drop {
    vault_id: ID,
    panda_id: ID,
    owner: address,
    policy_id: ID,
    authorized_agent: address,
    mode: u8,
    timestamp_ms: u64,
}
```

---

## 6. PandaCoin

`PANDA_COIN` is a testnet-only training token.

```move
module trading_panda::panda_coin {
    use sui::coin;

    public struct PANDA_COIN has drop {}

    fun init(witness: PANDA_COIN, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,
            b"PANDA",
            b"Panda Training Credit",
            b"Testnet-only training credit for TradingPanda demo execution.",
            option::none(),
            ctx,
        );
        // transfer cap to deployer/admin
    }
}
```

Rules:

- PandaCoin has no real economic value.
- PandaCoin is not USDC.
- PandaCoin is not used to calculate training PnL.
- PandaCoin exists to prove bounded chain execution.

---

## 7. Demo Executor

`demo_executor` is the Move entrypoint used by the Agent Signer in Mode 2. It is called only for selected Chain Proof Moments. Mode 1 Training Ledger trades do not submit a PTB for every buy or sell.

```move
module trading_panda::demo_executor {
    public entry fun execute_demo_trade(
        vault: &mut PandaVault,
        policy: &TradingPolicy,
        pair_hash: vector<u8>,
        side: u8,                    // 1 BUY, 2 SELL, 3 HOLD
        notional: u64,
        reference_price: u64,
        decision_hash: vector<u8>,
        proof_key_hash: vector<u8>,
        proof_source: u8,            // 1 automatic, 2 manual
        current_daily_loss: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        trading_policy::assert_trade_allowed(
            policy,
            pair_hash,
            notional,
            current_daily_loss,
            clock,
            ctx,
        );

        // MVP: update demo counters / move PandaCoin accounting as needed.
        // No DeepBook order is placed here.

        event::emit(DemoTradeExecuted {
            vault_id: object::id(vault),
            policy_id: trading_policy::id(policy),
            panda_id: panda_vault::panda_id(vault),
            agent: tx_context::sender(ctx),
            pair_hash,
            side,
            notional,
            reference_price,
            decision_hash,
            proof_key_hash,
            proof_source,
            policy_version: trading_policy::version(policy),
            timestamp_ms: clock::timestamp_ms(clock),
        });
    }
}
```

### 7.1 `DemoTradeExecuted`

```move
public struct DemoTradeExecuted has copy, drop {
    vault_id: ID,
    policy_id: ID,
    panda_id: ID,
    agent: address,
    pair_hash: vector<u8>,
    side: u8,
    notional: u64,
    reference_price: u64,
    decision_hash: vector<u8>,
    proof_key_hash: vector<u8>,
    proof_source: u8,
    policy_version: u64,
    timestamp_ms: u64,
}
```

This event proves:

- Agent Signer submitted a real Sui transaction.
- Move checked the policy.
- The action links to an off-chain Trade Fact through `decision_hash`.
- The action is idempotently linked through `proof_key_hash`.

It does not prove real market fill or profit.

`proof_source` values:

| Value | Meaning |
|---:|---|
| 1 | Automatic ProofSelector-selected Chain Proof Moment |
| 2 | User-triggered manual proof for an existing Trade Fact |

---

## 8. Trust Proof And Skill Digest

The existing `trust_proof` module remains responsible for batch proof submission.

Required extension:

```text
root_type = trade_facts | skill_memory | review_archive
```

MVP can keep separate entry functions if easier:

```move
submit_trade_batch_root(...)
submit_skill_digest(...)
```

Rules:

- Detailed Trade Facts stay off-chain in PostgreSQL / Walrus.
- Chain stores digest and counts.
- Verification proves inclusion, not AI correctness.

---

## 9. PTB Usage

User-signed transactions:

- Mint Panda.
- Create PandaVault.
- Create TradingPolicy.
- Update / pause / revoke policy.
- Withdraw or close vault.

Agent-signed transactions:

- Execute selected PandaCoin demo trade for a Chain Proof Moment.
- Potentially submit heartbeat only if a future policy explicitly authorizes it.

Admin or system transactions:

- Mint / distribute PandaCoin for testnet demo.
- Submit batch roots if centralized in MVP.

Do not use the phrase "PTB signature." Correct wording:

```text
The user signs a Sui transaction containing a PTB.
```

---

## 10. Explicit Non-Goals

- No real mainnet asset trading in MVP.
- No DeepBook testnet fill as training truth.
- No on-chain AI decision execution.
- No user wallet private key custody.
- No production real-asset vault in MVP.
- No DAO override in MVP.
- No PandaCoin financial value.

---

## 11. Resolved Decisions And Remaining Questions

Resolved:

| Topic | Decision |
|---|---|
| `PandaVault` object type | Shared object |
| `TradingPolicy` object type | Standalone shared object |
| Agent Signer | One environment-level testnet signer for MVP Mode 2 |
| Mode 2 trigger | Selected Chain Proof Moments plus manual user-triggered proof |
| Agent-signed PTB scope | PandaCoin demo execution only; no real funds |

Remaining implementation choices:

1. Should `allowed_pairs` be stored as hashes, dynamic fields, or a vector of string bytes?
2. Should PandaCoin minting be admin-controlled or faucet-like for demos?
3. Should `DemoTradeExecuted` store pair symbols directly or only pair hashes plus off-chain metadata?

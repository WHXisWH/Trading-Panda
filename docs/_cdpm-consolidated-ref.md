# CDPM + TradingPanda 合并参考材料（预消化版）

以下是所有源文件的关键内容，供撰写调研报告使用。

---

## 来源: reference/workflows.md



---

## 来源: reference/position-management.md



---

## 来源: reference/agent-management.md



---

## 来源: docs/agent-design.md



---

## 来源: docs/market-monitor-design.md



---

## 来源: cdpm-user-sdk/SKILL.md

---
name: cdpm-user-sdk
description: TypeScript SDK guide for CDPM (Cetus DLMM Position Manager) end-users. Provides PTB construction patterns for creating positions, managing liquidity, authorizing agents, collecting fees, and supplying/redeeming idle funds via Scallop lending or Kai SAV lending. Use when users need to interact with CDPM contract through TypeScript SDK.
---

# CDPM User SDK Guide

## Overview

CDPM (Cetus DLMM Position Manager) is a proxy contract for managing Cetus DLMM positions with support for user self-management, agent delegation, protocol-managed operations, and two optional lending integrations for idle funds: **Scallop** (single-generic `<T>` market coin) and **Kai SAV** (two-generic `<T, YT>` strategy-aggregating vault). Both integrations share `pm.lending: Bag`, the hot-potato ticket pattern, and a single `fee_house.fee_rate` knob.

**Package Address**: `0x3e926116ec95d753b83b80d768e310ef492d84892dee5cc86b51c1d3a876d5b7` (immutable digest: `HWJKADRhTY2XKoB49UCe3c9pYcRRdVKZfHaJZ8URmS16`). Other shared object IDs live in [`reference/constants.md`](reference/constants.md).

> The `PositionManager` struct now contains a fourth bag, `lending: Bag`, holding both Scallop `ScallopVault<T>` entries (keyed by `type_name<T>`) and Kai SAV `KaiVault<T, YT>` entries (keyed by `type_name<YT>`) — both can coexist on a single PM. See [Scallop Lending](reference/scallop-lending.md) and [Kai SAV Lending](reference/kai-lending.md) for end-user PTB recipes.

## Quick Start

### Installation

```bash
bun add @mysten/sui
```

### Initialize Client

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiGrpcClient({
  baseUrl: 'https://fullnode.mainnet.sui.io:443',
  network: 'mainnet',
});
const CDPM_PACKAGE = '0x3e926116ec95d753b83b80d768e310ef492d84892dee5cc86b51c1d3a876d5b7';
```

## Topics

### Core Operations
- **[Creating Positions](reference/workflows.md)** - First-time and existing user workflows
- **[Position Management](reference/position-management.md)** - Add/remove liquidity, pool ID helpers
- **[Balance Management](reference/position-management.md#balance-management)** - Deposit to and withdraw from balance

### Agent & Fee Management  
- **[Agent Management](reference/agent-management.md)** - Authorize/revoke agents
- **[Fee Collection](reference/fee-collection.md)** - Collect fees and rewards

### Scallop Lending (Idle Funds)
- **[Scallop Lending](reference/scallop-lending.md)** - **REQUIRED PTB[0]: `protocol::accrue_interest::accrue_interest_for_market(version, market, clock)` — cdpm-enforced via `EStaleScallopState (1011)`, NOT injected by `scallopTx.deposit` / `depositQuick`.** Hot-potato supply/redeem PTBs; canonical `Market` re-binding on `finish_*` (`EWrongMarket = 1012`); yield-fee math; no wrapper-extract escape (exit only via the full redeem flow).

### Kai SAV Lending (Idle Funds)
- **[Kai SAV Lending](reference/kai-lending.md)** - Two-generic `<T, YT>` hot-potato supply/redeem with strategy walk and canonical `Vault` re-binding on `finish_*`; shared yield-fee math; no wrapper-extract escape (exit only via the full redeem flow)

### Web Development & Queries
- **[Web Query Guide](reference/web-query.md)** - GraphQL queries for PositionManagers
- **[Pool Query Guide](reference/pool-query.md)** - Query Cetus DLMM pools by coin types

### Reference
- **[Constants](reference/constants.md)** - Package IDs, object IDs, token addresses

## Calculations

For liquidity calculations, bin price math, position management, and fee calculations, use the **cdpm-calculation** skill with the Cetus DLMM SDK:

```typescript
import { BinUtils, FeeUtils } from '@cetusprotocol/dlmm-sdk/utils'

// Common calculations
const qPrice = BinUtils.getQPriceFromId(binId, binStep)
const liquidity = BinUtils.getLiquidity(amountA, amountB, qPrice)
const binId = BinUtils.getBinIdFromPrice(price, binStep, true, decimalA, decimalB)
```

See `cdpm-calculation` skill for complete reference with formulas, examples, and best practices.

## Security Checklist

Before authorizing an agent:

```typescript
async function securityChecklist(
  client: SuiGrpcClient,
  pmId: string,
  agentAddress: string
) {
  // 1. Verify you are the owner
  const { response: pm } = await client.getObject({ id: pmId, include: { content: true } });
  const owner = pm?.content?.fields?.owner;
  
  // 2. Check agent is not already authorized
  const agents = await getAuthorizedAgents(client, pmId);
  const isAuthorized = agents.includes(agentAddress);
  
  return { owner, isAuthorized };
}
```

## Error Handling

Common errors and solutions:

```typescript
try {
  const result = await createPositionSmart(/* ... */);
} catch (e) {
  if (e.message.includes('ENotOwner')) {              // 1001
    console.error('Only the owner can perform this operation');
  } else if (e.message.includes('ENotAllow')) {       // 1002
    console.error('Caller not authorized');
  } else if (e.message.includes('EInvalidFeeRate')) { // 1003
    console.error('Invalid fee rate configuration (cap is 30% / 3000 bp)');
  } else if (e.message.includes('ELendingNotEmpty')) {// 1004
    console.error('PositionManager.lending is non-empty — drain every Scallop AND Kai vault entry before user_close_pm');
  } else if (e.message.includes('ENoSuchVault')) {    // 1005
    console.error('No ScallopVault<T> or KaiVault<T, YT> entry in pm.lending for the requested key');
  } else if (e.message.includes('EReserveEmpty')) {   // 1006
    console.error('Lending reserve degenerate. Scallop: zero supply or zero (cash+debt-revenue) — call accrue_interest_for_market first. Kai: total_yt_supply == 0.');
  } else if (e.message.includes('EZeroExpected')) {   // 1007
    console.error('scallop_start_* / kai_start_* amount too small — would yield 0 scoin / yt / underlying');
  } else if (e.message.includes('EWrongPm')) {        // 1008
    console.error('Hot-potato ticket (Scallop or Kai) consumed against a different PositionManager');
  } else if (e.message.includes('EAmountShortfall')) {// 1009
    console.error('finish_* received Coin with value < ticket.expected. Scallop: stale accrual. Kai: vault state moved between snapshot and signing.');
  } else if (e.message.includes('ENoSuchBalance')) {  // 1010
    console.error('withdraw_from_balance / withdraw_from_fee called for an absent type key');
  } else if (e.message.includes('EStaleScallopState')) { // 1011
    console.error('scallop_start_* called without accrue_interest::accrue_interest_for_market in the same PTB. Make it command 0 of the batch.');
  } else if (e.message.includes('EWrongMarket')) {    // 1012
    console.error('scallop_finish_* received a Market with id != ticket.market_id. Pass the same Market across start_* and finish_*.');
  } else if (e.message.includes('EWrongVault')) {     // 1013
    console.error('kai_finish_* received a Vault with id != ticket.vault_id. Pass the same Vault across start_* and finish_*.');
  } else {
    console.error('Transaction failed:', e);
  }
}
```

## End-to-End Workflow

For the full close-PM flow (collect rewards → drain `pm.balance` / `pm.fee` → batched `transferObjects` → `user_close_pm`), see [`reference/workflows.md`](reference/workflows.md) § Close Position Safely.

---

## 来源: cdpm-protocol-sdk/SKILL.md

---
name: cdpm-protocol-sdk
description: TypeScript SDK guide for CDPM protocol integration and management. Covers architecture, permission system, fee mechanics, admin operations, and the Scallop and Kai SAV hot-potato supply/redeem APIs for agents-empty PMs. Use when building protocol integrations, managing AccessList, or configuring protocol parameters.
---

# CDPM Protocol SDK Guide

## Overview

CDPM (Cetus DLMM Position Manager) protocol layer provides managed liquidity services with fee extraction. This guide covers protocol integration, admin operations, and architecture details.

**Package Address**: `0x3e926116ec95d753b83b80d768e310ef492d84892dee5cc86b51c1d3a876d5b7` (immutable digest: `HWJKADRhTY2XKoB49UCe3c9pYcRRdVKZfHaJZ8URmS16`). Other shared object IDs live in [`../cdpm-user-sdk/reference/constants.md`](../cdpm-user-sdk/reference/constants.md).

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { SuiGrpcClient } from '@mysten/sui/grpc';
```

## Topics

### Architecture & Permissions
- **[Architecture](reference/architecture.md)** - System components and data structures
- **[Permission System](reference/permission-system.md)** - Permission matrix and access requirements
- **[Fee Mechanics](reference/permission-system.md#fee-mechanics)** - Fee calculation and distribution

### Operations
- **[Admin Operations](reference/admin-operations.md)** - Set fee rate (cap 30%), manage AccessList, collect fees
- **[Protocol Operations](reference/protocol-operations.md)** - Protocol-managed liquidity operations and Scallop supply/redeem
- **[Scallop Lending](reference/scallop-lending.md)** - **REQUIRED PTB[0]: `protocol::accrue_interest::accrue_interest_for_market(version, market, clock)` — cdpm-enforced via `EStaleScallopState (1011)`, NOT injected by `scallopTx.deposit` / `depositQuick`.** Protocol-tier `scallop_start_supply` / `scallop_start_redeem`; canonical `Market` rebinding on `finish_*` (`EWrongMarket = 1012`); agents-empty gating; shared yield-fee math; trust-boundary discussion.
- **[Kai SAV Lending](reference/kai-lending.md)** - Protocol-tier `kai_start_supply` / `kai_start_redeem` with strategy walk and canonical `Vault` rebinding on `finish_*` (`EWrongVault = 1013`); agents-empty gating; shared yield-fee math

### Reference
- **[Events](reference/events.md)** - Admin, protocol, Scallop, and Kai operation events
- **[Constants](../cdpm-user-sdk/reference/constants.md)** - See user-sdk constants

## Calculations

For liquidity calculations, bin price math, position management, and fee calculations, use the **cdpm-calculation** skill with the Cetus DLMM SDK:

```typescript
import { BinUtils, FeeUtils } from '@cetusprotocol/dlmm-sdk/utils'

// Protocol-specific calculations
const qPrice = BinUtils.getQPriceFromId(binId, binStep)
const liquidity = BinUtils.getLiquidity(amountA, amountB, qPrice)

// Protocol fee calculation
const protocolFees = FeeUtils.getProtocolFees(feeA, feeB, protocolFeeRate)
```

See `cdpm-calculation` skill for complete reference with formulas and best practices.

## Integration Guide

### Move.toml Configuration

```toml
[package]
name = "YourProtocol"
version = "1.0.0"
edition = "2024.beta"

[dependencies]
CetusDlmm = { git = "https://github.com/CetusProtocol/cetus-dlmm-interface.git", subdir = "packages/dlmm", rev = "mainnet-v0.5.0" }
IntegerMate = { git = "https://github.com/CetusProtocol/integer-mate.git", rev = "mainnet-v1.3.0" }
MoveSTL = { git = "https://github.com/CetusProtocol/move-stl.git", rev = "mainnet-v1.3.0" }
CDPM = { git = "https://github.com/your-repo/cdpm.git", rev = "main" }

[addresses]
your_protocol = "0x0"
```

### Querying Protocol State

```typescript
async function getProtocolState(
  client: SuiGrpcClient,
  feeHouseId: string,
  accessListId: string
) {
  const [feeHouseResult, accessListResult] = await Promise.all([
    client.getObject({ id: feeHouseId, include: { content: true } }),
    client.getObject({ id: accessListId, include: { content: true } }),
  ]);
  
  const feeHouse = feeHouseResult.response;
  const accessList = accessListResult.response;
  
  return {
    feeRate: feeHouse?.content?.fields?.fee_rate,
    protocolFees: feeHouse?.content?.fields?.fee,
    allowedAddresses: accessList?.content?.fields?.allow,
  };
}
```

## Security Considerations

### AdminCap Security

```typescript
// Best practices for AdminCap management
const adminSecurity = {
  // 1. Use multi-sig for AdminCap
  useMultisig: true,
  
  // 2. Set reasonable fee rate limits
  maxFeeRate: 3000,  // 30%
  
  // 3. Regular access list audits
  auditInterval: 7 * 24 * 60 * 60 * 1000,  // 7 days
  
  // 4. Monitor protocol fee accumulation
  feeCollectionThreshold: 10000n,  // Collect when fees exceed threshold
};
```

### Protocol Operation Checks

```typescript
async function validateProtocolOperation(
  client: SuiGrpcClient,
  accessListId: string,
  pmId: string,
  protocolAddress: string
): Promise<{ valid: boolean; reason?: string }> {
  // Check if in AccessList
  const { response: accessList } = await client.getObject({ 
    id: accessListId, 
    include: { content: true } 
  });
  const allowed = accessList?.content?.fields?.allow || [];
  
  if (!allowed.includes(protocolAddress)) {
    return { valid: false, reason: 'Not in AccessList' };
  }
  
  // Check if agents are empty
  const { response: pm } = await client.getObject({ 
    id: pmId, 
    include: { content: true } 
  });
  const agents = pm?.content?.fields?.agents || [];
  
  if (agents.length > 0) {
    return { valid: false, reason: 'Position has active agents' };
  }
  
  return { valid: true };
}
```

## Error Handling

```typescript
// Source: sources/cdpm.move — codes are SHARED between Scallop and Kai integrations.
const ERROR_CODES = {
  ENotOwner:           1001, // Caller is not pm.owner (user_get_position / user_get_and_return_position — Cetus DLMM Position escape, the sole owner-only function)
  ENotAllow:           1002, // Caller not in agents / access list (or invariant broken)
  EInvalidFeeRate:     1003, // admin_set_fee given rate > MAX_FEE_RATE (3000 / 30%)
  ELendingNotEmpty:    1004, // user_close_pm called with non-empty lending Bag (any Scallop or Kai entry)
  ENoSuchVault:        1005, // pull_from_scallop_lending or pull_from_kai_lending for an absent vault entry
  EReserveEmpty:       1006, // Scallop reserve degenerate (cash+debt-revenue == 0) OR Kai vault total_yt_supply == 0
  EZeroExpected:       1007, // scallop_start_* / kai_start_* would yield 0 — amount too small
  EWrongPm:            1008, // Hot-potato ticket consumed against a different PM (Scallop or Kai)
  EAmountShortfall:    1009, // scallop_finish_* / kai_finish_* received Coin with value < ticket.expected
  ENoSuchBalance:      1010, // withdraw_from_balance / withdraw_from_fee for an absent type key
  EStaleScallopState:  1011, // scallop_start_* called before accrue_interest_for_market in the same PTB second
  EWrongMarket:        1012, // scallop_finish_* received a Market with id != ticket.market_id
  EWrongVault:         1013, // kai_finish_* received a Vault with id != ticket.vault_id
};

function parseError(error: string): string {
  if (error.includes('ENotOwner')) {
    return 'Operation requires owner permission';
  } else if (error.includes('ENotAllow')) {
    return 'Caller not in AccessList, or PositionManager has active agents';
  } else if (error.includes('EInvalidFeeRate')) {
    return 'Fee rate must be between 0 and 3000 (30% cap enforced by admin_set_fee)';
  } else if (error.includes('ELendingNotEmpty')) {
    return 'PositionManager.lending is non-empty; drain every ScallopVault<T> AND KaiVault<T, YT> entry before user_close_pm';
  } else if (error.includes('EReserveEmpty')) {
    return 'Underlying reserve degenerate. Scallop: zero supply or zero (cash+debt-revenue) — accrue_interest_for_market first. Kai: total_yt_supply == 0.';
  } else if (error.includes('EAmountShortfall')) {
    return '

[... truncated, total 8824 chars ...]

## 来源: reference/architecture.md

# Architecture

## Contents

- [System Components](#system-components)
- [Core Data Structures](#core-data-structures)
- [Scallop Decoupling](#scallop-decoupling)
- [Kai SAV Decoupling](#kai-sav-decoupling)

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Protocol Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  FeeHouse   │  │ AccessList  │  │      AdminCap       │  │
│  │ (Fee config)│  │(Protocol ACL)│  │   (Admin control)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  User   │  │  Agent  │  │ Protocol│
   │ (Owner) │  │(Limited)│  │(Managed)│
   └─────────┘  └─────────┘  └─────────┘
```

## Core Data Structures

### FeeHouse

```typescript
interface FeeHouse {
  id: string;
  fee_rate: number;          // Basis points (2000 = 20%); cap is 3000 / 30%
  fee: Map<string, string>;  // coin_type -> balance (collected protocol cuts + Scallop yield fees)
}
```

### AccessList

```typescript
interface AccessList {
  id: string;
  allow: string[];  // Authorized protocol addresses
}
```

### PositionManager

```typescript
interface PositionManager {
  id: string;
  owner: string;
  agents: string[];       // Authorized agent addresses
  position: string | null; // Cetus DLMM Position ID
  balance: Map<string, string>;  // Available funds
  fee: Map<string, string>;      // Accumulated fees
  // Unified lending bag — holds both Scallop and Kai SAV entries:
  //   Scallop: key = type_name<T>,  value = ScallopVault<T> { scoin: Balance<MarketCoin<T>>, principal }
  //   Kai SAV: key = type_name<YT>, value = KaiVault<T, YT>  { yt_balance: Balance<YT>,     principal }
  // At most one Scallop vault per T (sCoin type is pinned to MarketCoin<T> by the type
  // system, so a fake-sCoin variant cannot be supplied). At most one Kai vault per YT
  // (YT's TreasuryCap is held by kai_sav::vault::Vault<T, YT>, so external code cannot
  // forge Coin<YT>). The same T can have both a Scallop and a Kai entry simultaneously
  // because the bag keys differ.
  lending: Map<string, { scoin?: string; yt_balance?: string; principal: string }>;
}
```

### ScallopVault

```typescript
interface ScallopVault<T> {
  scoin: string;      // Balance<MarketCoin<T>> — Scallop sCoin (yield-bearing market coin)
  principal: u64;     // Original underlying deposited; used for yield accounting
}
```

### KaiVault

```typescript
interface KaiVault<T, YT> {
  yt_balance: string; // Balance<YT> — Kai SAV yield token issued by Vault<T, YT>
  principal: u64;     // Original underlying deposited; used for yield accounting
}
```

## Scallop Decoupling

cdpm imports only the read-only / hot-potato surface of Scallop:

- `protocol::market::{Self, Market}` (object handle)
- `protocol::reserve` (view-only access to `balance_sheet`)
- `protocol::borrow_dynamics` (view-only `last_updated_by_type` — used by the freshness floor in `assert_scallop_state_fresh`)
- `x::wit_table` (view-only)

It does **NOT** import `protocol::mint`, `protocol::redeem`, `protocol::version::Version`, or `protocol::accrue_interest`. As a consequence, Scallop `Version` bumps no longer break cdpm — callers compose `accrue_interest`, `mint::mint` and `redeem::redeem` themselves inside the same PTB. The caller's `accrue_interest::accrue_interest_for_market(version, market, clock)` pre-step is mandatory (cdpm asserts `borrow_dynamics::last_updated_by_type == clock::timestamp_ms / 1000` and aborts with `EStaleScallopState (1011)` otherwise); the `borrow_dynamics` accessors used for this check are version-free `public` views, so the decoupling from Scallop `Version` is preserved.

## Kai SAV Decoupling

cdpm imports only the read-only surface of Kai SAV:

- `kai_sav::vault as kai_vault` for the `Vault<T, YT>` type and the view functions
  `total_available_balance(vault, clock)` and `total_yt_supply(vault)`.

It does **NOT** import `kai_sav::vault::deposit`, `kai_sav::vault::withdraw`,
`kai_sav::vault::redeem_withdraw_ticket`, or any strategy module. The mint/burn
side is composed by the caller inside the PTB exactly like Scallop's `mint::mint`
/ `redeem::redeem`. Strategy walks (`<strategy_module>::strategy_withdraw_for_vault`)
are also caller-composed; cdpm never holds a `WithdrawTicket`.

> **Trust boundary.** Both Scallop and Kai integrations inherit upstream-team-trust
> assumptions for their respective protocols. cdpm has no admin-side YT whitelist
> and no Scallop-market whitelist; the mitigation surface is agent / protocol-bot
> selection by the PM owner. See README D-08 / D-10 and DESIGN for the full
> trust-boundary discussion.

---


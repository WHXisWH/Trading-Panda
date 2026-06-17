# TradingPanda Product Description — Why Sui

> Version 2.1 · 2026-06-17  
> Audience: Sui Overflow judges, technical partners, investors  
> Source of truth: `docs/PRD.md` v3.1

---

## 1. Product Positioning

TradingPanda is a Sui-native autonomous agent wallet training system. A user mints a Panda NFT, grants it a bounded TradingPolicy, and trains it on real DeepBook mainnet market data. The Panda monitors markets, makes decisions, executes inside a controlled Training Ledger, records its actions as Trade Facts, reviews wins and losses, and evolves Skill Memory over time.

One sentence:

```text
You are not using an AI trading bot; you are training a Move-constrained autonomous trading wallet.
```

The Panda remains emotionally legible and collectible, but the product is not "just an AI pet." The core is an autonomous wallet architecture:

```text
Panda NFT = agent identity
TradingPolicy = risk collar
PandaVault = bounded account / execution container
Agent Signer = automated paw print
Training Ledger = mainnet-priced paper execution
PandaCoin = testnet chain execution proof token
Trade Fact = evidence record
Skill Memory = learned trading instinct
Chain Proof Moment = selected Trade Fact that receives a real testnet PTB proof
```

---

## 2. Why This Must Use Sui

### 2.1 Move Objects Make Agent Boundaries Concrete

Most AI agent products rely on backend promises:

```text
"Trust us, the agent will not over-spend."
```

TradingPanda turns that promise into Sui objects:

```text
TradingPolicy {
  owner,
  panda_id,
  authorized_agent,
  allowed_pairs,
  max_notional_per_trade,
  max_daily_loss,
  max_leverage,
  expires_at,
  paused
}
```

The user's wallet is not handed to the AI. The user authorizes a bounded agent signer, and Move enforces the boundary.

### 2.2 sui::random Creates Verifiable Agent Identity

The Panda's personality is generated at mint:

- Boldness.
- Patience.
- Intuition.
- Focus.
- Contrarian.
- Talent.

These traits are not off-chain metadata that can be edited later. They are part of the Panda's chain identity and become inputs to the agent's decision behavior.

### 2.3 PTB Enables Multi-Step Agent Actions

PTB is the action sheet for Sui transactions. TradingPanda uses PTBs for:

- Minting Panda NFT.
- Creating PandaVault.
- Creating or updating TradingPolicy.
- Pausing or revoking agent authorization.
- Executing PandaCoin demo trades.
- Submitting Trade Fact Merkle roots.
- Submitting Skill Memory digests.

Product copy should say:

```text
The user signs a Sui transaction containing a PTB.
```

Not:

```text
PTB signature.
```

### 2.4 DeepBook Gives Real Market Intelligence

DeepBook is the primary market data source. The Panda does not learn from a CSV replay or from sparse testnet pool prices. It learns from real Sui market activity:

```text
DeepBook mainnet fills / trades
→ OHLCV candles
→ orderbook snapshots
→ indicators
→ market regime
→ Panda decision
```

MVP does not treat DeepBook testnet execution as training truth because testnet liquidity is sparse. Instead:

```text
Mainnet DeepBook data = training truth
Testnet PandaCoin PTB = chain execution proof
```

### 2.5 Walrus Stores Long-Term Agent Memory

PostgreSQL stores hot operational data. Walrus stores portable archives:

- Skill Memory snapshots.
- Trade review archives.
- Trade Fact batches.
- Panda diary output.

The Panda's NFT can reference memory digests or blob IDs so the agent's training history is portable and verifiable.

---

## 3. Core User Story

```text
1. User mints a Panda NFT.
2. User creates PandaVault and TradingPolicy.
3. market-monitor streams real DeepBook mainnet data.
4. Panda watches markets 24/7.
5. Panda creates OrderIntents: BUY / SELL / HOLD.
6. Backend checks TradingPolicy for every executable intent.
7. Training Ledger executes paper trades using real market reference prices.
8. Selected Chain Proof Moments submit testnet PandaCoin PTBs as chain proof.
9. Closed trades produce reviews.
10. Evidence-backed reviews update Skill Memory.
11. Skill digest and Trade Fact roots are periodically submitted on-chain.
```

The product loop is:

```text
Market → Decision → Policy Gate → Execution → Fact → Review → Skill → Next Decision
```

---

## 4. Competition Track Fit

The project fits the Autonomous Agent Wallet track:

| Requirement | TradingPanda answer |
|---|---|
| Agent wallet | Panda acts under a user-created TradingPolicy |
| Budget bounds | PandaVault and policy limits constrain actions |
| Autonomous execution | Agent Signer submits bounded testnet PTBs |
| Owner revocation | User can pause or revoke agent authorization |
| Real venue integration | DeepBook mainnet drives market intelligence |
| On-chain activity | PandaCoin demo trades, policy events, roots, skill digests |
| AI core | Panda decision, review, and Skill Memory loop |

It also has an Autonomous Risk Guardian component:

```text
TradingPolicy + PolicyService + Move checks = risk collar.
```

---

## 5. Execution Modes

### 5.1 Mode 1 — Training Ledger

Default MVP mode:

```text
Real DeepBook mainnet data
→ Panda decision
→ backend policy check
→ virtual ledger execution
→ PnL from real reference prices
→ review and Skill Memory
```

Mode 1 does not submit a PTB for every virtual buy or sell. It still uses on-chain policy and vault objects as the user's declared authorization boundary.

### 5.2 Mode 2 — PandaCoin Chain Execution Demo

Mode 2 proves autonomous chain behavior without relying on testnet DEX liquidity:

```text
Selected Trade Fact / Chain Proof Moment
→ testnet PTB
→ Agent Signer
→ demo_executor.move
→ TradingPolicy check
→ PandaCoin / PandaVault action
→ DemoTradeExecuted event
```

PandaCoin is a training credit, not an investment asset.

Mode 2 is not every signal. The product automatically proves high-confidence, policy-compliant BUY/SELL decisions and also lets the user manually request proof for an existing Trade Fact. Manual proof still obeys policy, cooldown, daily cap, and duplicate checks.

### 5.3 Mode 3 — Future Real Agent Wallet

Future mode:

```text
Real PandaVault assets
→ DeepBook / DeepBook Margin
→ production-grade risk controls
```

This is explicitly out of MVP.

---

## 6. Why The Two-Track MVP Is Better

Using DeepBook testnet execution as the main simulation layer creates a bad learning loop:

```text
Panda sees mainnet-quality market signals
but gets testnet-quality fills from sparse pools.
```

That would train the Panda on noisy, misleading execution data. The two-track MVP avoids this:

| Track | Purpose | Truth source |
|---|---|---|
| Training Ledger | Judge trading skill | DeepBook mainnet reference prices |
| PandaCoin PTB | Prove autonomous Sui action | Sui testnet transaction effects |

This is the central product decision recorded in `docs/adr/0001-mainnet-training-ledger-with-testnet-execution-proof.md`.

---

## 7. Sui Technology Map

| Sui technology | Product role |
|---|---|
| Move object model | Panda NFT, TradingPolicy, PandaVault, PandaCoin |
| sui::random | Fair personality generation |
| Dynamic Fields | Strategy hash, experience digest, proof indexes |
| PTB | User-approved setup and agent-submitted demo execution |
| DeepBook | Mainnet market intelligence |
| Walrus | Long-term Skill Memory archive |
| zkLogin | Low-friction user onboarding |
| Events | Policy updates, demo trades, proof submissions |
| Kiosk | Future Panda NFT marketplace |

---

## 8. User-Facing Promise

TradingPanda should promise:

```text
Train an autonomous Panda wallet on real Sui markets, while keeping it locked inside user-defined Move rules.
```

TradingPanda should not promise:

```text
Guaranteed profit.
Real-money autonomous trading in MVP.
PandaCoin financial value.
Testnet pool fills as real market proof.
```

---

## 9. Roadmap

| Phase | Goal |
|---|---|
| MVP | DeepBook mainnet Training Ledger + PandaVault + TradingPolicy + PandaCoin demo PTB |
| Testnet Alpha | Rich reviews, Skill Memory versions, stronger chain proof UI |
| Mainnet Alpha | Production market monitoring and Walrus memory backups |
| Real Wallet Beta | Real asset PandaVault with strict user-approved execution |
| Future Pro | DeepBook Margin, AMM venue comparison, autonomous risk guard expansion |

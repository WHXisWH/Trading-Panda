# Page Design: Training Ledger

> Journey: J4-J5 · Density: High · Product mood: live Panda trading cockpit

---

## 1. Page Purpose

Training Ledger is where the Panda watches real Sui market data, makes decisions, and mutates the paper ledger.

The page should answer:

```text
"Is my Panda actually watching real markets, and what did it do?"
```

Execution truth:

```text
Market data = DeepBook mainnet reference data
Execution = Training Ledger paper trade
Optional proof = selected testnet PandaCoin PTB later
```

Primary posture:

```text
Observation and audit first; session controls second.
```

The first viewport should answer whether the Panda is credibly training and what just happened. It should not behave like a manual trading terminal or a generic simulation dashboard.

---

## 2. User Mental Model

The user is observing a live autonomous trainee:

- Market comes in.
- Panda thinks.
- Policy gate checks the collar.
- Ledger records paper execution.
- Trade Fact captures evidence.

This is the page that may feel like a cockpit.

---

## 3. Desktop Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ TrainingStatusStrip: actor, pair, market freshness, policy state   │
├───────────────────────┬──────────────────────────────┬─────────────┤
│ PandaAgentStatus      │ MarketChartPanel             │ LedgerPanel │
│ - mood/action         │ - DeepBook candles           │ - balance   │
│ - current intent      │ - live tick pulse            │ - position  │
│ - skill version       │ - order markers              │ - PnL       │
├───────────────────────┴──────────────────────────────┴─────────────┤
│ DecisionTimeline · PolicyGateBanner · TradeFactDrawer              │
└────────────────────────────────────────────────────────────────────┘
```

Training is allowed to use dense panels because the user needs to inspect causality.

---

## 4. Mobile Layout

```text
┌──────────────────────────────┐
│ TrainingStatusStrip compact  │
├──────────────────────────────┤
│ PandaAgentStatus compact     │
├──────────────────────────────┤
│ MarketChartPanel             │
├──────────────────────────────┤
│ LedgerSummaryStrip           │
├──────────────────────────────┤
│ DecisionTimeline tabs        │
│ Evidence bottom sheet        │
└──────────────────────────────┘
```

Mobile should prioritize chart, Panda state, and latest decision. Details move into tabs or bottom sheets.

---

## 5. Core Components

| Component | Responsibility |
|---|---|
| `TrainingLedgerPage` | Live training session state |
| `TrainingStatusStrip` | Actor online/offline, market freshness, active pair |
| `PandaAgentStatus` | Panda mood, current intent, policy collar state |
| `MarketChartPanel` | DeepBook mainnet chart and live ticks |
| `LedgerSummaryStrip` | Virtual balance, position, realized/unrealized PnL |
| `PositionPanel` | Active position details |
| `DecisionTimeline` | Ordered decision and execution events |
| `PolicyGateBanner` | Pass/reject/paused/stale status |
| `TradeFactDrawer` | Evidence snapshot for selected decision |
| `TrainingControlBar` | Start, pause, stop, pair selection |

---

## 6. Step States

| State | Screen behavior |
|---|---|
| `Waiting` | Actor ready; no fresh tick yet; start/stop controls visible |
| `Tick` | Chart pulses; market freshness turns green |
| `Thinking` | Panda enters thinking state; decision pipeline in progress |
| `PolicyCheck` | Policy gate pass/reject banner visible |
| `LedgerMutated` | Balance / position delta animates |
| `FactCommitted` | Decision row appears with trade fact id |
| `Inspecting` | Trade Fact drawer opens with market, policy, and ledger evidence |
| `MarketStale` | Actor holds; new execution disabled |
| `Paused` | Policy paused; decisions may be displayed but execution blocked |

---

## 7. User Interactions

- Start or stop training session.
- Select one of the authorized and subscribed pairs.
- Open the feed strategy drawer to choose a beginner template or advanced natural-language draft.
- Click a decision row to inspect why it bought, sold, held, or got rejected.
- Open the Trade Fact drawer.
- Jump from an eligible Trade Fact to Chain Proof.
- Jump from a closed trade to Review.

Start and stop are session-level controls only. Users must not manually buy, sell, close, or otherwise inject trades from this page.

Pair selection changes the current training or observation context only inside the Panda's existing authorized and subscribed pool set. Adding pools, expanding pair authority, or changing risk limits belongs outside Training Ledger.

## 7.1 Pre-Flight Boundary

Hard blockers:

- No active PandaVault or Agent Wallet setup.
- No active TradingPolicy.
- No active strategy.
- Current pair is not authorized by TradingPolicy.
- Current pair is not in the Panda's subscribed training pools.

Soft warnings:

- WebSocket is still connecting.
- Last tick is stale, such as older than 120 seconds.
- Historical candles are temporarily unavailable.
- Latest ledger or Trade Fact sync is delayed.

Hard blockers prevent training from starting. Soft warnings allow the user to start or wait while the page clearly states that the Panda is waiting for fresh DeepBook input or delayed evidence.

### 7.2 Feed Strategy Boundary

Training Ledger may open the feed drawer, but it must not duplicate the Agent Wallet risk collar.

- Beginner mode shows three single-select templates only.
- Those templates explain strategy style in human language first, then expose indicators on demand.
- Advanced mode stays inside the same drawer and is folded by default.
- Advanced mode may parse natural language into a structured draft, but it must not auto-save.
- Final activation still requires an explicit save action.
- `Max order size` and `Daily loss cap` remain Agent Wallet controls, not training-page controls.

---

## 8. Evidence Exposure

Show:

- DeepBook mainnet source and pair.
- Tick freshness / last update time.
- Reference price used for paper ledger execution.
- Active TradingPolicy version.
- Decision status: `HOLD`, `ORDER_INTENT`, `REJECTED_BY_POLICY`, `PAPER_EXECUTED`.
- Trade Fact id and decision hash.
- Ledger balance and position deltas.
- Policy snapshot summary: version, authorized pair, max notional, daily loss limit, pass/reject reason.
- Ledger before/after summary and latest Ledger Delta.

Do not show:

- Raw Redis channel names as main UI.
- Full backend logs.
- Hidden LLM chain-of-thought.
- Private signer configuration.
- Testnet PTB details unless user enters Chain Proof.
- Full raw JSON by default.

---

## 9. Progressive Disclosure Contract

| Layer | Training behavior |
|---|---|
| Default | `TrainingStatusStrip`, `PandaAgentStatus`, `MarketChartPanel`, `LedgerSummaryStrip`, latest decision card |
| Hidden until interaction | full 8-step chain, policy checks, trade_fact_id, decision_hash, ledger before/after, proof eligibility logs |
| Drawer | `View decision timeline`, `Why policy passed?`, ledger detail, Trade Fact snapshot |
| Toast | Actor starting, paper trade executed, fact committed, market stale |
| Route jump | `Prove this action` opens `chain-proof.html#step=eligible`; closed trade opens `review.html#step=close` |

Main CTA flow:

```text
Start Training → Actor starting toast → Waiting → Tick → Decision → Policy → Ledger → Fact
```

Chain Proof and Review are entered primarily from a selected Trade Fact. Global links may remain as secondary navigation, but proving or reviewing should preserve the selected `trade_fact_id` context.

---

## 10. Failure States

| Failure | User-facing response |
|---|---|
| Market stale | Show degraded market status; Panda holds |
| Policy paused | Block execution and route to Safety |
| Policy cache stale | Hold and retry policy sync |
| Ledger write failed | Stop execution and show retry-safe error |
| Decision timeout | Mark decision as skipped, not failed trade |

---

## 11. Prototype Notes

This page should be the main high-density cockpit. It is the one place where Panda status, chart, policy, ledger, timeline, and evidence can all coexist.

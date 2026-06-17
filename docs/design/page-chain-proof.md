# Page Design: Chain Proof

> Journey: J6 · Density: High · Product mood: selected action becomes on-chain evidence

---

## 1. Page Purpose

Chain Proof shows that a selected autonomous Panda action can become a real Sui testnet PTB execution under the TradingPolicy.

The page should answer:

```text
"Can this Panda really act autonomously on Sui, inside the collar?"
```

This is not where every paper trade goes on-chain. It is a selected proof moment.

---

## 2. User Mental Model

The user is looking at a lab-grade proof console:

- A Trade Fact is selected.
- The system checks proof eligibility.
- A worker builds a PTB.
- The Agent Signer submits the allowed demo action.
- Move checks TradingPolicy before mutating demo state.
- Tx digest attaches back to the Trade Fact.

---

## 3. Desktop Layout

```text
┌────────────────────────────────────────────────────────────────┐
│ ProofHeader: selected Trade Fact · pair · outcome · eligibility│
├─────────────────────────┬──────────────────────────────────────┤
│ ProofJobTimeline        │ PTBPreview                           │
│ - queued                │ - PandaVault                         │
│ - building              │ - TradingPolicy version              │
│ - signing               │ - PandaCoin demo mutation            │
│ - confirmed/failed      │ - Move event                         │
├─────────────────────────┴──────────────────────────────────────┤
│ AgentSignerStatus · TxDigestCard · FailureReasonPanel          │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Mobile Layout

```text
┌──────────────────────────────┐
│ Trade Fact summary           │
│ Eligibility chip             │
├──────────────────────────────┤
│ ProofJobTimeline             │
├──────────────────────────────┤
│ PTBPreview collapsed cards   │
├──────────────────────────────┤
│ TxDigestCard / FailurePanel  │
└──────────────────────────────┘
```

Keep ids copyable but truncated.

---

## 5. Core Components

| Component | Responsibility |
|---|---|
| `ChainProofPage` | Proof detail and job lifecycle |
| `TradeFactHeader` | Selected decision / trade fact summary |
| `ProofEligibilityPanel` | Explains why this fact can or cannot be proven |
| `ProofJobTimeline` | Queued, building, signing, submitted, confirmed |
| `PTBPreview` | Human-readable PTB path |
| `AgentSignerStatus` | Authorized signer state and scope |
| `TxDigestCard` | Confirmed tx digest and explorer link |
| `MoveEventCard` | `DemoTradeExecuted` event summary |
| `ProofFailureState` | Cooldown, duplicate, pause, cap, or testnet failure |

---

## 6. Step States

| State | Screen behavior |
|---|---|
| `Eligible` | Selected Trade Fact can be proven; CTA active |
| `Ineligible` | Reason shown; CTA disabled |
| `Queued` | Async job created; hot path already complete |
| `BuildingPTB` | PTB preview highlights objects and policy version |
| `Signing` | Agent Signer status active |
| `Submitted` | Digest pending confirmation |
| `Confirmed` | Tx digest and Move event attached |
| `Failed` | Failure reason shown without rolling back paper ledger |

---

## 7. User Interactions

- Click `Prove on-chain` for an eligible Trade Fact.
- Inspect PTB preview before or during proof.
- Copy tx digest, object id, policy version, and decision hash.
- Retry if failure is retryable.
- Return to Training or Review with proof attached.

---

## 8. Evidence Exposure

Show:

- Trade Fact id.
- Decision hash.
- PandaVault object id.
- TradingPolicy object id and version.
- Authorized Agent address, not private key.
- PTB high-level path.
- Tx digest.
- Move event summary.
- Failure reason and retryability.

Do not show:

- Agent Signer private key or secret management.
- Raw RPC payload as default UI.
- Full Move abort stack as user copy.
- Backend queue implementation details except job status.
- Any implication that paper ledger PnL is rolled back if proof fails.

---

## 9. Progressive Disclosure Contract

| Layer | Chain Proof behavior |
|---|---|
| Default | Selected Trade Fact summary, eligibility, `ProofJobTimeline`, primary proof CTA, short tx digest after confirmed |
| Hidden until interaction | full PTB payload, Move path, full object ids, signer address, raw Move abort, async job retry logs |
| Modal | Agent Signer scope; proof confirmation if manual |
| Drawer | `View PTB details`, `Open proof details`, `View failure details` |
| Toast | Proof queued, PTB submitted, proof confirmed, proof failed safely |

Main CTA flow:

```text
Prove on-chain → queued toast → Build PTB → Agent signs → Confirmed / Failed
```

---

## 10. Failure States

| Failure | User-facing response |
|---|---|
| Duplicate proof | Show existing tx digest |
| Policy paused | Route to Safety; proof blocked |
| Daily cap reached | Explain cap and reset time |
| Cooldown active | Show remaining cooldown |
| Testnet RPC failed | Keep Trade Fact intact; allow retry |
| Move abort | Translate abort into policy-friendly reason |

---

## 11. Prototype Notes

The prototype should clearly separate paper training truth from chain proof truth. Chain proof is a selected demo execution, not the accounting source for every trade.

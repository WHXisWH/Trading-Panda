# Page Design: Agent Wallet

> Journey: J2 · Density: Medium · Product mood: give the Panda a policy collar

---

## 1. Page Purpose

Agent Wallet setup creates the Panda's bounded execution environment:

```text
PandaVault = where the Panda can train
TradingPolicy = the Move-enforced collar
Authorized Agent = the limited signer that can submit allowed demo actions
```

The page should answer:

```text
"How much freedom do I give this Panda?"
```

---

## 2. User Mental Model

The user is not giving the Panda their whole wallet. They are building a supervised training wallet with visible limits.

The UI should feel like fitting a high-tech collar:

- Budget cap.
- Allowed pairs.
- Max order size.
- Daily loss cap.
- Proof mode.
- Authorized signer review.

---

## 3. Desktop Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: Create Agent Wallet · Panda cannot loosen this alone │
├───────────────────────┬──────────────────────────────────────┤
│ PandaPermissionCard   │ PolicyCollarEditor                   │
│ - Panda identity      │ - budget cap                         │
│ - Vault missing       │ - allowed pairs                      │
│ - Policy missing      │ - max notional / daily loss          │
│ - signer status       │ - proof mode                         │
│                       │ - authorized agent review            │
├───────────────────────┴──────────────────────────────────────┤
│ PolicyPreviewSummary · CreateVaultPolicyButton               │
└──────────────────────────────────────────────────────────────┘
```

Evidence is embedded as compact preview cards, not a full right rail unless the screen is wide.

---

## 4. Mobile Layout

```text
┌──────────────────────────────┐
│ Create Agent Wallet          │
│ PandaPermissionCard compact  │
├──────────────────────────────┤
│ Step 1: Limits               │
│ Step 2: Pairs                │
│ Step 3: Proof mode           │
│ Step 4: Agent signer         │
│ Step 5: Review               │
├──────────────────────────────┤
│ Sticky CTA: Create policy    │
└──────────────────────────────┘
```

Use a wizard or accordion. Do not force a dense desktop grid onto mobile.

---

## 5. Core Components

| Component | Responsibility |
|---|---|
| `AgentWalletPage` | Setup state and routing |
| `PandaPermissionCard` | Panda identity, vault status, policy status |
| `PolicyCollarEditor` | Main editor for risk limits |
| `BudgetLimitCard` | Training balance and max spend |
| `AllowedPairsSelector` | Pair selection, liquidity-first defaults |
| `OrderLimitControl` | Max notional / cooldown / daily cap |
| `ProofModeSelector` | Manual / selected auto proof behavior |
| `AuthorizedAgentReview` | Shows signer address and scope before signing |
| `PolicyPreviewSummary` | Human-readable collar summary |
| `CreateVaultPolicyButton` | Builds and signs setup transaction |

---

## 6. Step States

| State | Screen behavior |
|---|---|
| `NoVault` | Panda is minted but locked; setup CTA is primary |
| `DraftPolicy` | Editor active; preview updates as user changes limits |
| `InvalidPolicy` | Invalid cap / pair / signer scope highlighted inline |
| `ReviewSigner` | Authorized Agent address and permissions are emphasized |
| `Signing` | User wallet confirmation overlay; editor locked |
| `Active` | PandaVault and TradingPolicy created; object ids shown |
| `MirrorSyncing` | Backend mirror pending but chain setup succeeded |
| `Ready` | CTA routes to Strategy Builder |

---

## 7. User Interactions

- Select allowed pairs from liquidity-first defaults.
- Edit budget cap, max order size, cooldown, and daily loss cap.
- Choose proof behavior: manual proof first for MVP, selected auto proof later.
- Review the authorized signer before signing.
- Sign the setup transaction.
- If backend mirror lags, show chain success and sync retry separately.

---

## 8. Evidence Exposure

Show:

- Panda NFT object id.
- PandaVault object id after creation.
- TradingPolicy object id and version.
- Authorized Agent address and scope.
- Network and tx digest.
- Clear sentence: "Policy loosening requires your signature."

Do not show:

- Agent private key.
- Raw PTB JSON as default UI.
- Backend policy cache internals.
- Database table names.
- Redis channels.

---

## 9. Progressive Disclosure Contract

| Layer | Agent Wallet behavior |
|---|---|
| Default | `PandaPermissionCard`, Budget, Allowed pairs, Risk cap, `Review Agent Signer` |
| Hidden until interaction | full signer address, object ids, policy version, cooldown, proof cap, PTB path, backend mirror detail |
| Modal | Signer scope review; wallet signing for vault + policy creation |
| Drawer | Advanced settings; `View objects`; policy preview detail |
| Toast | Setup submitted, setup complete, mirror syncing |
| Route jump | `Go to Strategy Builder` opens `strategy.html#step=empty` |

Main CTA flow:

```text
Review Agent Signer → SignerScopeModal → Create PandaVault + Policy → WalletSignatureModal → Active
```

---

## 10. Failure States

| Failure | User-facing response |
|---|---|
| Wallet rejects signing | Return to review; no setup created |
| Policy invalid | Highlight exact invalid field |
| Signer mismatch | Block setup and explain authorized address mismatch |
| Chain transaction failed | Show digest if available and retry |
| Backend mirror failed | Chain setup remains valid; retry backend sync |

---

## 11. Prototype Notes

The prototype should keep the collar metaphor visible. This page can use a two-column setup layout, but it should not look like the live trading cockpit.

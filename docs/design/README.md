# TradingPanda Product Design

> Version 1.0 · 2026-06-17  
> Scope: product screen design source of truth for `prototype/` and future frontend work.

---

## 1. Design Thesis

TradingPanda is not a generic trading dashboard. It is a pet-raising interface for a Move-constrained autonomous trading wallet:

```text
User trains a Panda.
Panda watches real Sui market data.
Panda decides, but can only act inside user-signed Move policy boundaries.
Every important action becomes evidence, review, and skill memory.
```

The UI must make this loop feel obvious:

```text
Mint identity
→ create bounded wallet
→ feed strategy
→ train on real market data
→ prove selected actions on-chain
→ review outcomes
→ tighten or pause risk
```

The Panda is the product's emotional anchor, but the real product promise is verifiable autonomy under user control.

---

## 2. Visual Direction

The application should keep the current prototype's cyber black-gold direction:

- Deep black cockpit atmosphere.
- Gold for ownership, value, and Sui object permanence.
- Neon green for live agent activity, market freshness, and successful policy checks.
- Red/amber only for risk, pause, failed proof, or policy violation.
- Panda visuals should feel like a premium AI trading pet, not a mascot sticker pasted onto a finance UI.

The key improvement is information-density control. Not every page is a cockpit.

| Density | Pages | Layout attitude |
|---|---|---|
| Low | Mint Panda | One cinematic action, no dashboard clutter |
| Medium | Agent Wallet, Strategy, Review | Focused workspace with inspectable evidence |
| High | Training Ledger, Chain Proof | Cockpit / console layout because the task is complex |
| Urgent | Safety | Risk-first control page with clear consequences |

---

## 3. Page Design Map

| Page doc | Product purpose | Primary journey | Layout type |
|---|---|---|---|
| [Logo](logo.md) | Brand mark and asset usage | Global | Visual identity |
| [Mint Panda](page-mint.md) | Create Panda NFT identity | J0-J1 | Minimal ritual page |
| [Agent Wallet](page-agent-wallet.md) | Create PandaVault and TradingPolicy | J2 | Permission setup wizard |
| [Strategy](page-strategy.md) | Feed and validate trading style | J3 | Rule studio |
| [Training](page-training.md) | Watch real markets and paper execution | J4-J5 | Live training cockpit |
| [Chain Proof](page-chain-proof.md) | Prove selected action with testnet PTB | J6 | Proof console |
| [Review](page-review.md) | Turn closed trades into learning | J7 | Evidence journal |
| [Safety](page-safety.md) | Pause, revoke, or tighten the Panda | J8 | Emergency controls |
| [Profile](page-profile.md) | Return the user to the right Panda training action | Account center | Continuation hub |

Future pages such as Landing, Panda detail, Leaderboard, Achievements, Marketplace, and Panda Lab are intentionally out of scope for this design pass.

---

## 4. Prototype Contract

`docs/design/page-*.md` is the source of truth for product screen layout.

`docs/prototype-redesign-spec.md` controls the prototype player around those screens:

- Journey intro.
- Stepper.
- Viewport toggle.
- Interaction Replay.
- System Notes.

The prototype layer may explain, annotate, and replay. It must not invent a different product layout. If a page design says Mint is a centered cinematic stage, the prototype must not force it into a three-column cockpit.

---

## 5. Shared Product Rules

- Product UI can show evidence, but it must not become an architecture diagram.
- System Notes belong to the prototype layer, not the production product layer.
- Panda emotion is shown through expression, posture, motion, and color temperature; do not expose hidden numeric emotion coefficients.
- Policy boundaries must be visible whenever the Panda can act.
- Loosening policy always feels like a user-owned decision, never an AI suggestion that silently changes permissions.
- Mobile is a real design target, not a shrunken desktop screenshot.

---

## 6. Progressive Disclosure

Default product screens must show the user's current task, not the whole machine room.

| Level | Name | Default visibility | Examples |
|---|---|---|---|
| L0 | Product Task | Always visible | Mint, Create Policy, Validate Strategy, Start Training, Prove, Pause |
| L1 | Status Summary | Usually visible | `Policy active · 2 pairs · Max 50`, actor online, market fresh, proof eligible |
| L2 | Evidence Detail | Hidden behind drawer/modal | object id, tx digest, policy checks, decision hash, trade fact id, PTB path |
| L3 | System Explanation | Prototype System Notes only | backend changes, Redis events, async job internals, raw-ish failure reason |

Five-second test:

```text
Without opening details, a reviewer should understand:
Where am I?
What is the next action?
Can the Panda act?
What constrains the Panda?
What is intentionally hidden until I inspect it?
```

Default UI must not show raw ids, hashes, object ledgers, or backend mechanics unless the page is already in a success / proof / inspection state and the detail is shortened.

---

## 7. Interaction Disclosure Components

Use four component shapes for information that is not needed on first paint.

| Component | Use for | Must not be used for |
|---|---|---|
| `Modal` | Wallet signing, owner confirmation, dangerous action confirmation, signer scope review | Long evidence logs |
| `Drawer` | Evidence details, object ids, PTB details, policy checks, decision timeline, skill diff | Primary task |
| `Toast` | Short feedback: submitted, saved, queued, synced, failed safely | Durable facts the user must inspect |
| `Route jump` | Cross-journey progression: Mint → Wallet, Strategy → Training, Training → Proof/Review | Hiding an in-page confirmation |

Primary CTAs and detail CTAs must be clickable in the prototype. Decorative controls may remain static, but should not look interactive if they do nothing.

---

## 8. Component Naming Rules

Use stable, product-level component names:

```text
MintPage
PandaCarouselStage
PolicyCollarEditor
TrainingLedgerPage
DecisionTimeline
ChainProofPage
ReviewJournalPage
EmergencyControlsPage
```

Avoid names that encode a prototype layout only:

```text
LeftCard
RightPanel
MiddleBox
StepUiCard
```

The component name should describe the user's mental model, not the grid position.

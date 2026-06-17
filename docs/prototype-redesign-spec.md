# TradingPanda Prototype Redesign Spec

> Version 1.2 · 2026-06-17  
> Scope: `prototype/` static HTML prototype  
> Source: grill-me sessions on full-screen journey states, interaction replay, and product page design

---

## 1. Goal

The prototype must stop behaving like a collection of small UI state cards. Each journey page must become a high-fidelity product-state player:

```text
Journey = one user task
Screen = one real product page
Step = a state of that product page
```

When the user clicks a step, the prototype should show a complete product interface changing state, not a small summary card appearing beside the stepper.

The core thesis must remain visible in every journey:

```text
The user is training a Move-constrained autonomous trading wallet.
```

---

## 2. Layer Model

Every journey page has two visually distinct layers.

| Layer | Purpose | Includes | Must not look like |
|---|---|---|---|
| Prototype layer | Presentation control and explanation | Journey intro, stepper, viewport toggle, System Notes | Real product UI |
| Product layer | What the user would actually see in TradingPanda | Page-specific product screen from `docs/design/page-*.md`, including modals, toasts, and evidence where required | Architecture diagram, component gallery, or one-size-fits-all cockpit |

The stepper is a remote control, not a product feature.

---

## 2.1 Product Screen Source Of Truth

The product screen layout is defined by `docs/design/`, not by the prototype player.

| Page | Source design doc |
|---|---|
| Mint | `docs/design/page-mint.md` |
| Agent Wallet | `docs/design/page-agent-wallet.md` |
| Strategy | `docs/design/page-strategy.md` |
| Training | `docs/design/page-training.md` |
| Chain Proof | `docs/design/page-chain-proof.md` |
| Review | `docs/design/page-review.md` |
| Safety | `docs/design/page-safety.md` |

The prototype layer may add journey controls, replay, and System Notes around the product screen. It must not invent a different product layout.

Important examples:

- Mint is a minimal cinematic mint ritual, not a three-column cockpit.
- Training is a high-density cockpit because live market, policy, ledger, and decisions must coexist.
- Chain Proof is a proof console.
- Safety is an emergency control surface.

If this document conflicts with a page design doc, the page design doc wins for product UI. This document wins only for prototype controls.

---

## 3. Journey Page Structure

Desktop journey page structure:

```text
[Journey Intro: J0-J1 / J2 / J3 ... full-width row]

[Prototype Controller] [Full Product Screen Canvas]

[System Notes for current step]
```

Mobile journey page structure:

```text
[Journey Intro]
[Viewport Toggle]
[Horizontal Step Pills]
[Mobile Product Screen Canvas]
[System Notes collapsed by default]
```

The current `.detail-copy` journey intro remains a full-width row above the player. It must not share a row with steps or product screens.

---

## 4. Interaction Rules

Each journey remains a single HTML file:

```text
prototype/journeys/mint.html
prototype/journeys/agent-wallet.html
prototype/journeys/training.html
...
```

Inside each file, each step may have a full screen block:

```html
<section class="product-screen" data-step="wallet" data-viewport="desktop">
  ...
</section>

<section class="product-screen" data-step="wallet" data-viewport="mobile">
  ...
</section>
```

Implementation may switch the entire screen block per step. The visual result must feel like one product page changing state.

Rules:

- Keep the same layout skeleton within a journey whenever possible.
- Avoid page-height jumps between steps.
- Use overlays, disabled states, progress states, toasts, and highlights to show step changes.
- Do not create separate `step1.html`, `step2.html`, etc.
- Do not move users into a different journey page inside a step; use CTAs for cross-journey navigation.

---

## 4.1 Hybrid Interaction Model

The prototype uses a hybrid model:

```text
Prototype Stepper = presenter control
Product CTAs = realistic user interaction
```

Rules:

- Stepper can jump to any step for demo control.
- Main product CTAs must be clickable.
- Detail CTAs must open modal / drawer / toast layers instead of exposing all information on first paint.
- Main flow actions may advance the stepper.
- Detail inspection actions must not advance the stepper.
- Interaction Replay must use the same interaction primitives as manual clicks.

Main CTA examples:

| Action | Result |
|---|---|
| `Mint Panda NFT` | Open signature modal, then advance to `minting` / `success` |
| `Create PandaVault + Policy` | Open signer / wallet modal, then advance to `active` |
| `Validate strategy` | Toast + validation summary, then enable save |
| `Prove on-chain` | Toast + advance proof job |
| `Pause` / `Revoke` | Danger modal + owner signature + status update |

Detail CTA examples:

| Action | Result |
|---|---|
| `View mint details` | Drawer with tx digest, object id, package id |
| `View policy checks` | Drawer with pair / notional / daily loss checks |
| `View decision timeline` | Drawer with full 8-step decision chain |
| `View PTB details` | Drawer with Move path and object refs |
| `View skill diff` | Drawer with evidence-backed skill change |

Cross journey CTAs use hash routes:

```text
agent-wallet.html#step=no-vault
strategy.html#step=empty
training.html#step=waiting
chain-proof.html#step=eligible
review.html#step=close
```

---

## 5. Full Product Screen Canvas

The product canvas must contain a believable app page that follows the relevant `docs/design/page-*.md` file.

Every product canvas should include:

- The page's real primary task.
- The page's required core components.
- Step-specific state changes such as disabled buttons, pending overlays, toasts, drawers, or success states.
- User-facing evidence only where the page design says it belongs.
- A clear default state that passes the five-second task test.

The product canvas must not force every page into the same skeleton.

Layout examples by page type:

```text
Mint:
Title + description
PandaCarouselStage
Mint CTA
Gas/network hint
```

```text
Training:
TrainingStatusStrip
PandaAgentStatus + MarketChartPanel + LedgerPanel
DecisionTimeline + TradeFactDrawer
```

```text
Safety:
RiskStatusBanner
Pause / Revoke / Tighten action cards
OwnerSignatureModal + PolicyResultPanel
```

App shell, Panda state, and evidence are still important product concepts, but they appear in page-specific form. For example, Mint uses `PandaCarouselStage` instead of `PandaAgentCard`, and a small gas hint instead of an Evidence Rail.

---

## 6. Desktop And Mobile Requirements

The prototype must support a viewport toggle:

```text
Viewport: Desktop / Mobile
```

Desktop:

- Primary presentation mode.
- Uses the page-specific desktop layout from `docs/design/page-*.md`.
- Product canvas should feel like a 1200-1440px product page.
- Low-density pages may be centered and cinematic.
- High-density pages may use multi-panel cockpit layouts.

Mobile:

- Must be designed, not just horizontally scrolled desktop.
- Uses the page-specific mobile layout from `docs/design/page-*.md`.
- Prioritizes the primary task, then Panda state, then evidence summary.
- Stepper becomes horizontal pills in the prototype layer.
- Same step semantics as desktop, with lower information density.

Priority:

| Priority | Journeys | Desktop | Mobile |
|---|---|---|---|
| P0 | Mint, Agent Wallet, Training, Chain Proof | High fidelity | High fidelity |
| P1 | Strategy, Review | Medium-high fidelity | Simplified but complete |
| P2 | Safety | Medium fidelity | Simplified but readable |

---

## 7. Panda Presence

Every product screen must keep the Panda meaningful as a state agent, not decoration. The form depends on the page.

Possible Panda presence forms:

| Page type | Panda form |
|---|---|
| Mint | `PandaCarouselStage` with looping Panda Lab variants |
| Agent Wallet | Permission / collar status card |
| Strategy | Student / training companion state |
| Training | Full `PandaAgentStatus` card |
| Chain Proof | Selected action actor summary |
| Review | Learning / reflection state |
| Safety | Paused / revoked / tightened risk state |

High-density Panda status fields:

| Field | Examples |
|---|---|
| Panda identity | Name, `panda_id`, NFT object id |
| Agent state | Locked, Ready, Watching, Thinking, Executing, Reviewing, Paused |
| Current intent | None, HOLD, BUY, SELL, PROOF, REJECTED |
| Policy collar | Missing, Draft, Active, Paused, Tightened |
| Vault status | Missing, Created, Synced |
| Skill memory | Empty, Learning, `v12` |
| Mood | Shown through avatar expression, color, and motion language; do not expose hidden numeric emotion coefficients |

Journey use:

| Journey | Panda role |
|---|---|
| Mint | Unknown identity becomes minted Panda NFT |
| Agent Wallet | Panda receives a vault and policy collar |
| Training | Panda watches, thinks, executes, or holds |
| Chain Proof | Panda action is selected for proof |
| Review | Panda reviews evidence and learns |
| Safety | Panda is paused, revoked, or tightened |

---

## 8. Product Evidence

Product evidence is part of the real UI when the page design requires it. It shows concise proof that the page is grounded in Sui, DeepBook, and backend facts.

Evidence may appear as:

- A small gas / network hint on Mint.
- Embedded policy preview cards on Agent Wallet.
- Compatibility preview on Strategy.
- A full evidence rail / drawer on Training.
- A proof console on Chain Proof.
- Evidence courtroom cards on Review.
- Policy result panel on Safety.

Possible evidence fields:

| Field | Examples |
|---|---|
| Market source | DeepBook mainnet, pair, tick freshness |
| Ledger source | Training Ledger, reference price, virtual balance |
| Move object | Panda NFT, PandaVault, TradingPolicy |
| Proof source | PTB, tx digest, Move event, policy version |
| Backend fact | `trade_fact_id`, `decision_hash`, `async_job_id` |

Product evidence is not System Notes. It should look like something a real advanced user can inspect in product.

Mobile Evidence:

- Show one-line evidence summary by default.
- Use a bottom-sheet style panel for details in proof-heavy steps.
- On low-density pages, a small inline hint is enough.

Evidence disclosure levels:

| Level | Visibility | Prototype behavior |
|---|---|---|
| L0 Product Task | Default | Always visible |
| L1 Status Summary | Default | Visible as compact copy / chip |
| L2 Evidence Detail | On demand | Drawer or modal |
| L3 System Explanation | Prototype-only | System Notes |

---

## 9. System Notes

System Notes remain in the prototype layer and are synced to the current step.

They should explain:

- User action.
- Chain changes.
- Backend changes.
- Failure / guardrail behavior.

Desktop:

- Default collapsed or one-line summary below the product canvas.
- Four compact columns or cards.

Mobile:

- Default collapsed.
- Expandable when presenting.

System Notes should not compete with the product canvas.

---

## 10. Interaction Replay Script

Interaction Replay explains why the current screen state happened. It is the causal bridge between a clicked step and the changed product screen.

Placement:

- Desktop: inside the Prototype Controller, below the stepper.
- Mobile: below the horizontal step pills and above the mobile product canvas.
- It belongs to the prototype layer, not the real product UI.

Purpose:

```text
Step = final screen state
Interaction Replay Script = ordered product/prototype actions that caused that state
System Notes = technical explanation of what changed
```

Data model:

| Field | Purpose | Examples |
|---|---|---|
| `actor` | Source of the action | `USER`, `APP`, `MARKET`, `AGENT`, `BACKEND`, `CHAIN` |
| `verb` | Action type | `click`, `type`, `sign`, `approve`, `publish`, `compute`, `confirm`, `show`, `pulse` |
| `target` | Semantic hotspot | `primary-action`, `wallet-modal`, `panda-card`, `market-chart`, `decision-panel`, `policy-panel`, `ledger-panel`, `evidence-rail`, `toast` |
| `label` | Short visible action | `Click Mint Panda NFT` |
| `detail` | Optional explanation | `Wallet opens transaction confirmation` |

Global hotspot vocabulary:

```text
primary-action
secondary-action
panda-card
workspace
market-chart
decision-panel
policy-panel
ledger-panel
evidence-rail
wallet-modal
toast
timeline
proof-panel
system-notes
```

Rules:

- Each step should have 3-5 replay actions.
- Replay describes the transition into the current state, not every possible action on the page.
- User, app, market, agent, backend, and chain actions must be visually distinguishable.
- Replay current step only; do not auto-advance to the next step.
- Replay duration should be about 800ms per action and 3-5 seconds total.
- Step or viewport changes cancel the current replay.
- Hotspots use semantic targets, never hard-coded coordinates.
- Missing hotspots must fail gracefully: keep the replay row active, warn in console during development, and move the cursor to the screen center if needed.
- Replay can open the same modal/drawer/toast used by manual clicks.
- Replay should not create unbounded nested micro-state machines; it only plays the key interaction sequence for the current step.
- Do not depend on CDN animation libraries. Use local CSS/JS first; a vendored library can be considered later if needed.

Animation behavior:

- Current replay item is highlighted action-by-action.
- A ghost cursor moves to clickable or semantic target regions.
- Click-like actions get a short ripple.
- Non-click system events pulse the relevant area, such as `market-chart`, `panda-card`, `evidence-rail`, or `timeline`.
- Modal / drawer / toast replay layers close when the replay ends, when step changes, or when viewport changes.

---

## 11. Journey State Inventory

### Mint Journey (`prototype/journeys/mint.html`)

Primary screen: Mint Panda page.

| Step | Desktop/mobile screen state |
|---|---|
| Disconnected | Wallet disconnected; `PandaCarouselStage` loops Panda Lab variants; CTA says `Connect Wallet` |
| Ready to mint | Wallet connected; title, description, Panda stage, mint CTA, and gas hint visible |
| Sign | Wallet signing modal / transaction pending overlay; stage dims |
| Minting | Transaction pending; Panda carousel slows or holds |
| Success | Minted Panda reveal, NFT object id, next CTA to Agent Wallet |
| Failed | Concise failure reason and retry CTA |

### Agent Wallet Journey (`prototype/journeys/agent-wallet.html`)

Primary screen: Agent Wallet Setup page.

| Step | Desktop/mobile screen state |
|---|---|
| No vault | Panda minted but execution locked; vault and policy missing |
| Draft policy | Policy editor active with allowed pairs, notional, loss cap, proof mode |
| Review signer | Authorized Agent address and scope highlighted |
| Sign | Create vault + policy PTB signing overlay |
| Active | PandaVault and TradingPolicy created; backend mirror syncing |
| Ready | Policy active, Panda ready for Strategy |

### Strategy Journey (`prototype/journeys/strategy.html`)

Primary screen: Strategy Builder page.

| Step | Desktop/mobile screen state |
|---|---|
| Empty | No active strategy; training blocked |
| Build | Rule builder / template editor active |
| Validate | Strategy checked against TradingPolicy mirror |
| Save | Strategy version commit in progress |
| Active | Strategy active with ghost influence visible |

### Training Journey (`prototype/journeys/training.html`)

Primary screen: Training Ledger Dashboard.

| Step | Desktop/mobile screen state |
|---|---|
| Waiting | Actor online; market waiting; start state visible |
| Tick | DeepBook mainnet chart updates; tick freshness becomes green |
| Decision | `PandaAgentStatus` enters Thinking; decision chain highlights OrderIntent |
| Policy | PolicyGate pass/fail state highlighted |
| Ledger | Paper ledger mutates using mainnet reference price |
| Fact | Trade Fact committed; timeline row appears |
| Inspect | Decision timeline expanded; loop continues |

### Chain Proof Journey (`prototype/journeys/chain-proof.html`)

Primary screen: Chain Proof / Trade Fact detail page.

| Step | Desktop/mobile screen state |
|---|---|
| Eligible | Trade Fact selected; auto/manual proof eligibility shown |
| Job | Async job queued; hot path remains complete |
| Build PTB | Testnet PTB builder view with PandaCoin / PandaVault path |
| Sign | Agent Signer submitting policy-bound transaction |
| Confirmed | Tx digest, Move event, policy version attached |
| Failed | Failure state explains cooldown, cap, duplicate, policy pause, or testnet error |

### Review Journey (`prototype/journeys/review.html`)

Primary screen: Review Journal / Trade Fact Review page.

| Step | Desktop/mobile screen state |
|---|---|
| Close | Position closed or reduced; review eligible |
| PnL | Realized PnL shown with entry/exit reference prices |
| Evidence | Evidence courtroom compares original belief to outcome |
| Hypothesis | Hypothesis moves through lifecycle |
| Skill | Skill Memory version updated with evidence references |

### Safety Journey (`prototype/journeys/safety.html`)

Primary screen: Emergency Controls page.

| Step | Desktop/mobile screen state |
|---|---|
| Pause | Owner-signed pause blocks Mode 1 and Mode 2 execution |
| Revoke | Authorized Agent revoked; proof submission blocked |
| Tighten | Policy limits tightened; policy version increments |

---

## 12. Non-Goals For This Prototype Pass

- Do not implement production Next.js pages.
- Do not wire real wallets, Sui RPC, Redis, or backend APIs.
- Do not require every product button to work.
- Do not turn System Notes into a full architecture document.
- Do not make mobile a perfect production design system pass; it must be faithful and readable.
- Do not implement step-internal micro-state machines for replay actions.
- Do not introduce remote CDN dependencies for replay animation.

---

## 13. Acceptance Criteria

- From `prototype/index.html`, a reviewer can enter each journey and understand the user task.
- On each journey page, `J0-J1/J2/...` intro is a standalone row above the player.
- Clicking a step changes a complete product screen state.
- Every step shows an Interaction Replay explaining the actions that led to the current state.
- Replay current step can be played manually with action-by-action progress.
- Replay uses semantic hotspots and gracefully handles missing targets.
- Product screens follow the relevant `docs/design/page-*.md` source doc.
- Page-specific layouts are respected; Mint is not forced into a cockpit skeleton.
- Page-specific core components, mobile layout, and Evidence Exposure rules are represented.
- Desktop and Mobile viewport modes exist.
- P0 journeys have high-fidelity desktop and mobile screens.
- System Notes remain available but do not compete with the main product canvas.
- Local HTML references pass validation.

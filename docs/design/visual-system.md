# TradingPanda Visual System

> Version 1.0 · 2026-06-17  
> Applies to: product pages and prototype product canvases.

---

## 1. Brand Mood

TradingPanda should feel like entering a small black-gold command room where a cute but serious AI Panda is training under a Sui policy collar.

The tone is:

- Premium but playful.
- Technical but not sterile.
- Agentic but visibly constrained.
- Cyber black-gold with neon green market life.

The UI should not feel like a generic SaaS dashboard, a meme coin casino, or a plain trading terminal.

---

## 2. Core Palette

| Token | Use | Suggested value |
|---|---|---|
| `--color-void` | Page background | `#050604` |
| `--color-panel` | Product cards | `#0b0f0b` |
| `--color-panel-soft` | Secondary cards | `#11170f` |
| `--color-line` | Hairline borders | `rgba(225, 186, 92, 0.18)` |
| `--color-gold` | Ownership, object, primary highlight | `#e1ba5c` |
| `--color-gold-soft` | Soft gold text / borders | `#b8954a` |
| `--color-green` | Live, pass, agent active | `#6dff90` |
| `--color-green-soft` | Low-intensity active state | `#2d8f55` |
| `--color-blue` | Data / chain / proof neutral | `#75d7ff` |
| `--color-amber` | Pending / caution | `#ffc857` |
| `--color-red` | Pause / reject / failed proof | `#ff5f56` |
| `--color-text` | Primary text | `#f6f1df` |
| `--color-muted` | Secondary text | `#9ca58f` |

Use green for "alive and valid", not for every button. Use gold for "owned and valuable", not for every decoration.

---

## 3. Typography

Recommended direction:

| Role | Font direction |
|---|---|
| Display / hero | Condensed, sharp, premium sci-fi feel |
| Body | Clean sans with strong Chinese rendering |
| Data / ids | Monospace for object ids, tx digests, hashes |

Practical frontend stack can map to available fonts later. The design intent is more important than one exact font name.

Avoid default-looking typography. The product should feel authored.

---

## 4. Layout Language

### Low Density

Used by Mint.

```text
Title
Short description
Large Panda stage
One primary action
Gas / network hint
```

No side rails, no dashboards, no decision chains.

### Medium Density

Used by Agent Wallet, Strategy, Review.

```text
Header promise
Focused workspace
Compact Panda / status presence
Inspectable evidence card
```

Evidence is available, but the user task remains visually dominant.

### High Density

Used by Training and Chain Proof.

```text
Live status strip
Main workspace
Agent / policy / ledger panels
Timeline or evidence console
```

These pages can feel like a cockpit because the user is inspecting autonomous behavior.

### Urgent Density

Used by Safety.

```text
Risk state first
Large irreversible controls
Plain consequence copy
Signature confirmation
```

Drama is allowed, confusion is not.

---

## 5. Motion

Motion should make causality visible.

| Motion | Use |
|---|---|
| Panda idle loop | Keep the agent present |
| Panda carousel loop | Mint page identity preview |
| Market pulse | New DeepBook tick |
| Policy gate flash | Pass / reject |
| Ledger delta slide | Paper balance / position changes |
| Proof timeline advance | Async chain proof progress |
| Toast reveal | Transaction / save result |

Rules:

- Prefer a few meaningful animations over constant sparkle.
- Respect `prefers-reduced-motion`.
- Do not use animation to hide missing content.
- Prototype Interaction Replay is separate from product motion.

---

## 6. Panda Visual Role

The Panda is not the whole UI. The Panda represents agent state.

| Page | Panda role |
|---|---|
| Mint | Identity candidate on a stage |
| Agent Wallet | Agent waiting for a policy collar |
| Strategy | Student receiving training rules |
| Training | Active trader watching, thinking, executing, or holding |
| Chain Proof | Actor whose selected behavior is being proven |
| Review | Learner reflecting on evidence |
| Safety | Agent under pause / revoke / tightened collar |

Real product should use Panda Lab assets. Prototype may simulate the loop, but should clearly reserve the center stage for real Panda variants.

---

## 7. Evidence Language

Product evidence is user-facing proof. It is not developer logging.

Show:

- Network and market source.
- Sui object ids when they matter.
- Policy version.
- Tx digest after a chain action.
- Decision hash / trade fact id when inspecting a decision.
- Proof status for chain proof moments.

Do not show:

- Private keys or signer secrets.
- Raw backend stack traces.
- Internal prompt chains.
- Redis channel names as primary UI.
- Database table names unless in a developer-only debug surface.

---

## 8. Modal / Drawer / Toast / Route Jump

Progressive disclosure is part of the visual system.

### Modal

Use for decisions that interrupt the user and require explicit confirmation:

- Wallet signature.
- Owner-signed pause / revoke.
- Agent Signer scope review.
- Dangerous action confirmation.

Modal copy must start with the consequence, then show the action.

### Drawer

Use for inspectable evidence:

- Object ids.
- Tx digest.
- Policy checks.
- Decision timeline.
- Trade Fact snapshots.
- PTB details.
- Skill diff.

Drawer should slide from the right on desktop and from the bottom on mobile.

### Toast

Use for short, transient feedback:

- Submitted.
- Saved.
- Proof queued.
- Sync retry started.
- Failed safely.

Toast must not be the only place where a durable success result is available.

### Route Jump

Use when the user's primary task naturally moves to another journey:

- Mint success → Agent Wallet.
- Agent Wallet ready → Strategy.
- Strategy active → Training.
- Training selected fact → Chain Proof.
- Closed trade → Review.

Use hash state for static prototype jumps:

```text
prototype/journeys/agent-wallet.html#step=no-vault
```

---

## 9. Mobile Rules

Mobile pages must choose hierarchy aggressively:

- Primary user task first.
- Panda presence compact but visible.
- Evidence collapsed into one-line summary or bottom sheet.
- Primary action sticky when the page is action-heavy.
- Long ids truncated with copy affordance.
- High-density pages use tabs, accordions, or bottom sheets rather than squeezed columns.

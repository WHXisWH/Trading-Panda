# Profile

> Journey: account center · Density: Medium · Product mood: return to training

---

## 1. Page Job

Profile is the user's account center. It is not a single-Panda dossier.

The first screen must answer:

```text
Which Panda should I continue training, and what is the next action?
```

Profile may aggregate identity, check-in, owned Pandas, and account-level training summary. It must not become a Training Ledger, Review Journal, or Panda detail page.

---

## 2. First Screen

Desktop uses a **master-detail** layout:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Profile header: Account Center · short wallet identity                  │
├──────────────┬─────────────────────────────────────────┬───────────────┤
│ My Pandas    │ Selected Panda detail (large card)       │ Daily Check-in│
│ sidebar      │ - Panda visual + name                    │ - streak      │
│              │ - level / trades / win rate              ├───────────────┤
│ [card]       │ - setup/training state                   │ Account card  │
│ [card] *     │ - state-based primary CTA                │ - short wallet│
│ [card]       │ - secondary Open / Emergency controls    │               │
└──────────────┴─────────────────────────────────────────┴───────────────┘
│ Training Summary (account-level, full width)                            │
└────────────────────────────────────────────────────────────────────────┘
```

- Left sidebar: one compact card per owned Panda (avatar + name + level + training dot).
- Center: the **selected** Panda's continuation card. Clicking a sidebar card switches selection.
- Right rail: account-level Check-in + Account only (not Panda-specific).
- `*` marks the currently selected Panda in the sidebar.

Mobile order:

```text
Panda selector (horizontal scroll or compact list)
Selected Panda detail + CTA
Daily Check-in
Account
Training Summary
```

The wallet address must be secondary. The product task is continuation, not account inspection.

---

## 3. Selected Panda (default)

Initial selection is deterministic:

1. Use the active Panda if available in current app state.
2. Otherwise use the first item from `GET /api/panda/my`.
3. User may switch selection via the left sidebar; selection updates `activePandaId` in client state.
4. Do not add a backend preference table for MVP.

Future "Set as Primary Panda" can persist preference server-side.

---

## 4. State-Based CTA

The Primary Panda card uses one primary action:

| Condition | CTA | Target |
|---|---|---|
| No Panda | Mint Panda | `/mint` |
| Panda exists, Agent Wallet not ready | Set up Agent Wallet | `/agent-wallet?panda=:id&step=no-vault` |
| Agent Wallet ready, no active strategy | Feed Strategy | `/training-ledger/:id?feed=strategy` |
| Agent Wallet ready and strategy exists | Continue Training | `/training-ledger/:id` |

`Feed Strategy` uses the Training Ledger drawer route, not the legacy standalone Strategy page.

---

## 5. Data Loading

Use lightweight account-level loading:

- `GET /api/panda/my` for the owned Panda list.
- `GET /api/panda/:id` only for the Primary Panda.
- `GET /api/panda/:id/agent-wallet` only for the Primary Panda.
- `GET /api/checkin` for the compact check-in card.

Do not fan out Agent Wallet requests for every Panda in `My Pandas`. If every Panda needs precise setup state later, add a backend aggregate endpoint.

---

## 6. My Pandas Sidebar

`My Pandas` lives in the **left sidebar**, not as a separate grid below the detail card.

Each sidebar card shows scan-friendly overview only:

- Panda avatar rendered via `PandaCanvasRenderer` from personality + experience + emotion (same pipeline as Panda Lab / Mint)
- name
- level and growth stage
- training state dot (`is_trading`)

The sidebar uses a **fixed height** on desktop with internal vertical scroll when the user owns many Pandas.

Selecting a card updates the center detail panel. Do not duplicate a second Panda grid on the same page.

Do not show full personality radar, emotion coefficients, decision timelines, or trade history in the sidebar.

---

## 7. Empty States

Unauthenticated:

- Product-style connection state.
- Use the existing wallet/connect entry point.
- Do not create a second login workflow inside Profile.

Authenticated with no Panda:

- First screen becomes `Mint your first Panda`.
- Do not show empty statistic panels.

---

## 8. Non-Goals

- No transaction history.
- No decision timeline.
- No full settings panel.
- No full Panda dossier.
- No raw ids unless shortened as account identity.
- No exposed emotion coefficients.

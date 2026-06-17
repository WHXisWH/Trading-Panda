# Page Design: Strategy

> Journey: J3 · Density: Medium · Product mood: training dojo for trading rules

---

## 1. Page Purpose

Strategy teaches the Panda what kind of market behavior to practice. It does not expand permission. It only guides decisions inside the active TradingPolicy.

The page should answer:

```text
"What style should my Panda practice?"
```

---

## 2. User Mental Model

The user is feeding a training scroll to the Panda:

- Templates help beginners start.
- Rule blocks make strategy visible.
- Validation checks whether the strategy fits the current policy.
- Strategy versions preserve learning history.

---

## 3. Desktop Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: Feed Strategy · Strategy cannot grant more risk      │
├───────────────────────┬──────────────────────────────────────┤
│ StrategyTemplateRack  │ RuleBlockEditor                      │
│ - trend scout         │ - signal rules                       │
│ - mean reversion      │ - risk preferences                   │
│ - cautious learner    │ - optional natural language note     │
├───────────────────────┴──────────────────────────────────────┤
│ PolicyCompatibilityPreview · StrategyVersionBar · Save CTA   │
└──────────────────────────────────────────────────────────────┘
```

Keep the interface more like a rule studio than a trading screen.

---

## 4. Mobile Layout

```text
┌──────────────────────────────┐
│ Feed Strategy                │
│ Active policy summary        │
├──────────────────────────────┤
│ Template carousel            │
├──────────────────────────────┤
│ Rule blocks accordion        │
├──────────────────────────────┤
│ Compatibility preview        │
│ Sticky Save Strategy CTA     │
└──────────────────────────────┘
```

---

## 5. Core Components

| Component | Responsibility |
|---|---|
| `StrategyPage` | Strategy edit state and save flow |
| `StrategyTemplateRack` | Beginner-friendly templates |
| `RuleBlockEditor` | Structured strategy rules |
| `NaturalLanguageHintBox` | Optional user style note |
| `PolicyCompatibilityPreview` | Shows whether the strategy fits current policy |
| `StrategyVersionBar` | Current version, draft status, ghost influence |
| `GhostInfluenceHint` | Explains old strategy residue without exposing internals |
| `SaveStrategyButton` | Validates and activates strategy version |

---

## 6. Step States

| State | Screen behavior |
|---|---|
| `Empty` | No active strategy; training blocked with clear next action |
| `TemplateSelected` | Template fills starter rules |
| `Editing` | Rule blocks editable; compatibility preview live |
| `Invalid` | Unsupported indicator, pair, or risk conflict highlighted |
| `Validating` | Backend validation pending |
| `Saving` | Strategy version commit in progress |
| `Active` | New version active; next CTA starts Training |

---

## 7. User Interactions

- Pick a template.
- Add, remove, or edit rule blocks.
- Add a short natural-language training note if needed.
- Validate against current TradingPolicy.
- Save strategy version.
- View ghost influence when replacing an old strategy.

---

## 8. Evidence Exposure

Show:

- Active strategy version.
- Validation status.
- Current policy compatibility.
- Allowed pairs and blocked pairs.
- Simple ghost influence copy: "old habits may fade over the next N trades."

Do not show:

- Raw LLM prompt or hidden chain-of-thought.
- Internal parser stack.
- Database `strategy_history` rows as raw tables.
- Numeric hidden personality coefficients unless explicitly productized.

---

## 9. Progressive Disclosure Contract

| Layer | Strategy behavior |
|---|---|
| Default | Policy summary, template cards, simplified rule preview, `Validate strategy` |
| Hidden until interaction | full rule blocks, parser schema, strategy hash, raw validation checks, ghost weight numeric detail |
| Drawer | `Edit rules`, `View validation details`, ghost influence explanation |
| Toast | Validation complete, strategy saved, validation failed |
| Route jump | `Start Training` opens `training.html#step=waiting` |

Main CTA flow:

```text
Select template → Validate strategy → compatibility summary → Save strategy → Active
```

---

## 10. Failure States

| Failure | User-facing response |
|---|---|
| Unsupported rule | Explain supported alternatives |
| Pair not allowed by policy | Route to Agent Wallet if user wants to change policy |
| Validation timeout | Keep draft locally and retry |
| Save failed | Keep draft and show reason |

---

## 11. Prototype Notes

The prototype should show the difference between "strategy guidance" and "permission". The Panda may learn a strategy, but the collar still decides what it can execute.

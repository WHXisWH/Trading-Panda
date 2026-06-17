# Page Design: Review Journal

> Journey: J7 · Density: Medium · Product mood: evidence courtroom for Panda learning

---

## 1. Page Purpose

Review turns closed trades into evidence-backed learning. The Panda should not "learn" from raw vibes; it learns after outcome is known and evidence can be inspected.

The page should answer:

```text
"Did my Panda learn the right lesson from this win or loss?"
```

---

## 2. User Mental Model

The user is watching the Panda conduct a small after-action review:

- What did it believe?
- What did the market do?
- What was the realized outcome?
- Which hypothesis survived?
- Did skill memory update?

---

## 3. Desktop Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ ReviewHeader: closed trade · realized PnL · skill status     │
├────────────────────────┬─────────────────────────────────────┤
│ TradeOutcomeStory      │ EvidenceCourtroom                   │
│ - entry/exit           │ - original thesis                   │
│ - PnL                  │ - confirming evidence               │
│ - duration             │ - contradicting evidence            │
├────────────────────────┴─────────────────────────────────────┤
│ HypothesisLifecycle · SkillMemoryVersionCard · ReviewTimeline│
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Mobile Layout

```text
┌──────────────────────────────┐
│ Review story card            │
├──────────────────────────────┤
│ Tabs: Outcome / Evidence     │
│       Hypothesis / Skill     │
├──────────────────────────────┤
│ SkillMemoryVersionCard       │
└──────────────────────────────┘
```

---

## 5. Core Components

| Component | Responsibility |
|---|---|
| `ReviewJournalPage` | Review lifecycle and selected closed trade |
| `TradeOutcomeHeader` | PnL, entry, exit, pair, duration |
| `TradeOutcomeStory` | Human-readable win/loss narrative |
| `EvidenceCourtroom` | Original belief vs market evidence |
| `HypothesisLifecycle` | Proposed, supported, verified, rejected |
| `SkillMemoryVersionCard` | Skill update, version, evidence refs |
| `ReviewTimeline` | Chronological review events |
| `LearningBoundaryNotice` | Explains that unverified claims do not update skills |

---

## 6. Step States

| State | Screen behavior |
|---|---|
| `Eligible` | Closed trade has realized PnL; review can start |
| `ComputingOutcome` | Entry/exit reference prices and PnL computed |
| `CollectingEvidence` | Original decision, market snapshots, policy context loaded |
| `HypothesisDrafted` | Panda proposes a learning hypothesis |
| `EvidenceChecked` | Supporting and contradicting evidence displayed |
| `SkillUpdated` | New skill version created with evidence refs |
| `NoUpdate` | Evidence too weak; skill memory unchanged |

---

## 7. User Interactions

- Open a closed trade review.
- Inspect original decision evidence.
- Compare entry and exit reference prices.
- Expand why a hypothesis was supported or rejected.
- View skill memory version diff.
- Return to Training with the new skill active.

---

## 8. Evidence Exposure

Show:

- Entry and exit reference prices.
- Realized PnL.
- Original decision hash.
- Linked Trade Fact ids.
- Evidence references used in the review.
- Skill memory version and digest.
- Whether the hypothesis was verified, supported, weak, or rejected.

Do not show:

- Hidden chain-of-thought.
- Raw private prompts.
- Unverified hypothesis as a fact.
- Full database rows.
- Any claim that the Panda got smarter without evidence.

---

## 9. Progressive Disclosure Contract

| Layer | Review behavior |
|---|---|
| Default | Outcome story, realized PnL, hypothesis status, short skill update |
| Hidden until interaction | original belief vs outcome detail, evidence refs, decision hash, trade fact ids, skill digest |
| Modal | `Why not updated?` explains insufficient evidence |
| Drawer | `View evidence`, `View skill diff`, contradictory evidence |
| Toast | Review queued, skill updated, no update due to weak evidence |
| Route jump | `Continue training` opens `training.html#step=waiting` |

Main CTA flow:

```text
Open review → outcome story → evidence check → hypothesis → skill update / no update
```

---

## 10. Failure States

| Failure | User-facing response |
|---|---|
| Position not closed | Review not ready; show required close/reduce state |
| Missing evidence | Review blocked until facts load |
| Contradictory evidence | Mark hypothesis as unresolved |
| Review timeout | Keep trade fact; retry review worker |
| Skill update failed | Keep review result and retry memory write |

---

## 11. Prototype Notes

The Review page should feel quieter than Training. It is less cockpit, more case file. The Panda is learning, not actively trading.

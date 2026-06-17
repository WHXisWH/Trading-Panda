# Page Design: Safety

> Journey: J8 · Density: Urgent · Product mood: stop the Panda now

---

## 1. Page Purpose

Safety gives the user direct control over autonomous execution boundaries.

The page should answer:

```text
"How do I stop, revoke, or tighten this Panda immediately?"
```

---

## 2. User Mental Model

The user owns the collar. The Panda cannot unpause itself, revoke the user, or loosen policy.

Safety is where the user can:

- Pause execution.
- Revoke authorized agent.
- Tighten limits.
- See pending proof jobs that will be canceled or blocked.

---

## 3. Desktop Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ RiskStatusBanner: Active / Paused / Revoked / Tightened      │
├──────────────────────┬───────────────────┬──────────────────┤
│ PausePolicyCard      │ RevokeAgentCard   │ TightenLimitsCard│
│ immediate stop       │ signer disabled   │ lower caps       │
├──────────────────────┴───────────────────┴──────────────────┤
│ PendingJobsWarning · OwnerSignatureModal · PolicyResultPanel │
└──────────────────────────────────────────────────────────────┘
```

The three actions should be visually distinct and consequence-led.

---

## 4. Mobile Layout

```text
┌──────────────────────────────┐
│ RiskStatusBanner             │
├──────────────────────────────┤
│ Big action: Pause            │
│ Big action: Revoke Agent     │
│ Big action: Tighten Limits   │
├──────────────────────────────┤
│ Pending jobs warning         │
│ Signature confirmation sheet │
└──────────────────────────────┘
```

Mobile safety controls must be large, clear, and hard to mis-tap.

---

## 5. Core Components

| Component | Responsibility |
|---|---|
| `EmergencyControlsPage` | Safety state and owner actions |
| `RiskStatusBanner` | Current execution status |
| `PausePolicyCard` | Immediate pause action |
| `RevokeAgentCard` | Revoke authorized agent signer |
| `TightenLimitsCard` | Reduce caps / allowed pairs |
| `PendingJobsWarning` | Proof jobs or executions affected |
| `OwnerSignatureModal` | User-signed confirmation |
| `PolicyResultPanel` | Chain and backend mirror result |

---

## 6. Step States

| State | Screen behavior |
|---|---|
| `Active` | All safety actions available |
| `PauseReview` | Pause consequences explained |
| `PauseSigning` | Owner wallet signature required |
| `Paused` | Execution blocked; banner red |
| `RevokeReview` | Authorized Agent revocation explained |
| `Revoked` | Chain proof submission blocked |
| `TightenReview` | New stricter limits previewed |
| `Tightened` | Policy version increments; tighter rules active |
| `MirrorSyncing` | Chain updated; backend mirror catching up |

---

## 7. User Interactions

- Click Pause to block execution immediately.
- Click Revoke Agent to stop automated chain proof signing.
- Tighten allowed pairs, caps, cooldowns, or daily loss.
- Confirm owner-signed transaction.
- View affected pending jobs.
- Return to Training after policy state updates.

---

## 8. Evidence Exposure

Show:

- Current TradingPolicy object id and version.
- Current policy state: active, paused, revoked, tightened.
- Authorized Agent status.
- Pending proof jobs affected.
- Tx digest for safety action.
- Backend mirror sync state.

Do not show:

- Agent Signer private key or secret storage.
- Raw Move abort internals as primary copy.
- Backend queue implementation details.
- Overly technical fear copy.

---

## 9. Progressive Disclosure Contract

| Layer | Safety behavior |
|---|---|
| Default | `RiskStatusBanner`, Pause / Revoke / Tighten cards, pending jobs summary, owner-control promise |
| Hidden until interaction | full policy object id, full signer address, pending job list, raw Move abort, backend mirror detail, version history |
| Modal | Pause confirmation, revoke confirmation, owner signature |
| Drawer | Tighten limits editor, affected jobs, policy result details |
| Toast | Paused, signer revoked, limits tightened, mirror syncing, failure summary |

Main CTA flow:

```text
Pause / Revoke → DangerConfirmModal → OwnerSignatureModal → status update
Tighten → LimitsDrawer → OwnerSignatureModal → policy version update
```

---

## 10. Failure States

| Failure | User-facing response |
|---|---|
| Wallet rejects signing | No change applied; return to review |
| Policy transaction failed | Explain reason and retry |
| Backend mirror lag | Chain result wins; show syncing |
| Pending job already submitted | Show proof tx status separately |
| User tries to loosen policy | Route to normal Agent Wallet flow, require explicit signature |

---

## 11. Prototype Notes

Safety is the only page where red can dominate. It should still keep the black-gold visual system, but risk actions must be visually unmistakable.

# Page Design: Mint Panda

> Journey: J0-J1 · Density: Low · Product mood: cinematic mint ritual

---

## 1. Page Purpose

Mint Panda creates the Panda NFT identity. This page should answer one question:

```text
"Who is my Panda agent?"
```

It should not explain the entire architecture. It should not ask the user to fill an onboarding survey before minting. The ritual is simple: see possible Pandas, connect/sign, mint, reveal.

---

## 2. User Mental Model

The user is not configuring a trading bot yet. They are opening the capsule that creates their Panda identity.

The page should feel like:

```text
Black-gold stage
Looping Panda variants from Panda Lab
One clear mint button
Small gas/network hint
```

---

## 3. Desktop Layout

```text
┌────────────────────────────────────────────────────────────┐
│ App Bar: TradingPanda / network / wallet                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│              Mint your autonomous Panda                   │
│       A tiny agent identity for Sui market training.       │
│                                                            │
│              ┌────────────────────────────┐                │
│              │                            │                │
│              │   PandaCarouselStage       │                │
│              │   looping Panda Lab forms  │                │
│              │                            │                │
│              └────────────────────────────┘                │
│                                                            │
│                  [ Mint Panda NFT ]                        │
│              Gas estimate: ~0.01 SUI · Testnet             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

No left rail. No evidence rail. No decision timeline. Mint is a stage, not a cockpit.

---

## 4. Mobile Layout

```text
┌──────────────────────────────┐
│ App Bar / wallet             │
├──────────────────────────────┤
│ Mint your autonomous Panda   │
│ Short description            │
│                              │
│ PandaCarouselStage           │
│ large, centered, looping     │
│                              │
│ [ Mint Panda NFT ]           │
│ Gas estimate / network hint  │
└──────────────────────────────┘
```

The CTA can become sticky near the lower safe area if the Panda stage is tall.

---

## 5. Core Components

| Component | Responsibility |
|---|---|
| `MintPage` | Page shell and mint state orchestration |
| `MintHeroCopy` | Title and one short product sentence |
| `PandaCarouselStage` | Loops Panda Lab generated Panda variants |
| `PandaStageHalo` | Black-gold/neon stage atmosphere behind Panda |
| `MintPrimaryAction` | Connect / Mint / Signing / Success CTA states |
| `GasFeeHint` | Network, estimated gas, and "no trading permission yet" hint |
| `MintTxOverlay` | Wallet signing / transaction pending overlay |
| `MintResultToast` | Success or failure toast with tx digest / object id when available |

---

## 6. Step States

| State | Screen behavior |
|---|---|
| `Disconnected` | CTA says `Connect Wallet`; Panda carousel loops; gas hint is muted |
| `ReadyToMint` | Wallet connected; CTA says `Mint Panda NFT`; gas estimate visible |
| `Signing` | Stage dims; wallet confirmation overlay appears; CTA shows pending |
| `Minting` | Panda carousel slows; transaction pending copy appears |
| `Success` | Carousel stops on minted Panda; success toast shows object id; next CTA says `Create Agent Wallet` |
| `Failed` | Stage returns to idle; concise failure reason; retry CTA |

---

## 7. User Interactions

- Click `Connect Wallet` opens wallet / zkLogin connection.
- Click `Mint Panda NFT` triggers a Sui mint transaction.
- Rejecting wallet signature returns to `ReadyToMint`.
- Successful transaction reveals the minted Panda and routes next to Agent Wallet setup.
- Failure copy should explain whether the issue is wallet rejection, gas, network, object parsing, or backend registration.

---

## 8. Evidence Exposure

Show:

- Network name.
- Gas estimate.
- Mint tx digest after success.
- Panda NFT object id after success.
- Small copy: "Minting a Panda does not give it trading permission yet."

Do not show:

- PandaVault.
- TradingPolicy.
- Agent Signer.
- DeepBook market panels.
- Decision engine internals.
- Backend database registration details.

Mint only creates identity. The policy collar comes later.

---

## 9. Progressive Disclosure Contract

| Layer | Mint behavior |
|---|---|
| Default | Title, short description, `PandaCarouselStage`, primary CTA, gas / safety hint |
| Hidden until interaction | tx digest, object id, package id, backend registration result |
| Modal | `WalletSignatureModal` after `Mint Panda NFT` |
| Toast | Mint submitted, mint success, mint failed safely |
| Drawer | `View mint details` reveals tx digest, Panda object id, package id |
| Route jump | `Create Agent Wallet` opens `agent-wallet.html#step=no-vault` |

Main CTA flow:

```text
Mint Panda NFT → WalletSignatureModal → Confirm → Minting → Success
```

---

## 10. Animation

- Panda carousel loops through Panda Lab variants every few seconds.
- On signing, the stage glow slows and darkens.
- On success, the minted Panda receives a brief gold-green reveal pulse.
- Respect reduced motion by replacing loops with a static rotating selection indicator.

---

## 11. Prototype Notes

Prototype can use simulated Panda variants, but the layout must reserve the center stage for real Panda Lab output. The prototype must remove the old mint-before-survey idea from the product screen.

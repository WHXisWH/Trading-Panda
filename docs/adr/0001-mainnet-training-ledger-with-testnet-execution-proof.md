# Mainnet Training Ledger With Testnet Execution Proof

TradingPanda will use DeepBook mainnet market data plus a backend Training Ledger as the MVP source of trading truth, while using testnet PandaCoin PTBs only as chain execution proofs. We chose this over DeepBook testnet execution as the primary training layer because testnet pool liquidity is sparse and would produce misleading PnL, while the split design still demonstrates Sui-native autonomous agent behavior through PandaVault, TradingPolicy, Agent Signer, and on-chain events.

## Status

Accepted for MVP documentation on 2026-06-17.

## Decision Details

| Topic | Decision |
|---|---|
| Training truth | DeepBook mainnet market data plus backend Training Ledger |
| Chain proof | Selected testnet PandaCoin PTBs |
| `PandaVault` | Shared object |
| `TradingPolicy` | Standalone shared object |
| Agent Signer | One environment-level testnet signer in MVP |
| Mode 2 trigger | Selected Chain Proof Moments plus manual user-triggered proof |

## Consequences

- Paper PnL remains meaningful because it is referenced to liquid mainnet markets.
- Mode 2 proves autonomous Sui execution without depending on sparse testnet DEX liquidity.
- Sui RPC or PTB failures must not roll back Training Ledger trades.
- Before real funds, signer isolation must evolve beyond one environment-level key.

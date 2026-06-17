# TradingPanda Context

TradingPanda is a Sui-native autonomous agent wallet training system. The language below defines product concepts, not implementation details.

## Language

**Panda**:
An autonomous trading agent represented by a Sui NFT with immutable personality traits.
_Avoid_: Bot, pet-only character, generic AI assistant

**Panda NFT**:
The chain identity of a Panda and the source of its immutable personality.
_Avoid_: Account, wallet

**Agent Wallet**:
The product concept of a Panda acting under user-defined authority and risk limits.
_Avoid_: User wallet, AI wallet with unlimited access

**TradingPolicy**:
The standalone shared Move object that defines what a Panda is allowed to do.
_Avoid_: Settings, preferences, strategy

**PandaVault**:
A shared bounded account or execution container associated with a Panda.
_Avoid_: User wallet, full wallet, exchange account

**Agent Signer**:
An authorized signing identity that submits bounded chain actions for a Panda. MVP uses one environment-level testnet signer only for PandaCoin demo proofs.
_Avoid_: User signer, chain auto-signer, wallet owner

**Training Ledger**:
The paper execution environment where Panda trades are settled against real market reference prices.
_Avoid_: Fake trading, toy market

**PandaCoin**:
A testnet-only training token used to prove bounded chain execution.
_Avoid_: Real token, USDC, investment asset

**OrderIntent**:
A Panda's proposed buy, sell, or hold action before policy approval and execution.
_Avoid_: Trade, transaction

**Trade Fact**:
The canonical evidence record of a Panda decision, execution, policy snapshot, market snapshot, and outcome.
_Avoid_: Log line, trade row

**Skill Memory**:
Reviewed and evidence-backed trading knowledge that can influence future Panda decisions.
_Avoid_: Chat history, raw memory, strategy

**Chain Execution Proof**:
A real Sui transaction or event proving the Panda performed a bounded action.
_Avoid_: Profit proof, real-market fill proof

**Chain Proof Moment**:
A selected Trade Fact that receives a real testnet PandaCoin PTB proof. It may be selected automatically by ProofSelector or manually requested by the user.
_Avoid_: Every tick on-chain, every paper trade on-chain

**Market Monitor**:
The market radar that converts real venue data into Panda-consumable market events.
_Avoid_: Trading executor, simulator

**ProofSelector**:
The async worker that decides whether a Trade Fact should become a Chain Proof Moment.
_Avoid_: Execution engine, trading strategy

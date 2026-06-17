"""v3.1 autonomous agent wallet API schemas."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class VaultMode(str, Enum):
    TRAINING_LEDGER = "training_ledger"
    PANDA_COIN_DEMO = "panda_coin_demo"
    REAL_WALLET = "real_wallet"


class PolicyMode(str, Enum):
    TRAINING_LEDGER = "training_ledger"
    PANDA_COIN_DEMO = "panda_coin_demo"
    REAL_WALLET = "real_wallet"


class VaultStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    REVOKED = "revoked"
    CLOSED = "closed"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    LIQUIDATED = "liquidated"
    CLOSED = "closed"


class IntentSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


class IntentStatus(str, Enum):
    DECIDED = "DECIDED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"
    SKIPPED = "SKIPPED"


class ChainProofStatus(str, Enum):
    NOT_REQUESTED = "not_requested"
    ELIGIBLE = "eligible"
    REQUESTED = "requested"
    SUBMITTED = "submitted"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ReviewVerdict(str, Enum):
    WIN = "win"
    LOSS = "loss"
    BREAKEVEN = "breakeven"
    INVALID = "invalid"


class SkillScope(str, Enum):
    GLOBAL = "global"
    PAIR = "pair"
    REGIME = "regime"


class SkillMemoryStatus(str, Enum):
    PROPOSED = "proposed"
    SUPPORTED = "supported"
    VERIFIED = "verified"
    WEAKENED = "weakened"
    RETIRED = "retired"


class PandaVaultData(BaseModel):
    id: str | None = None
    panda_id: str
    sui_object_id: str | None = None
    sui_object_kind: str = "shared_object"
    mode: VaultMode = VaultMode.TRAINING_LEDGER
    status: VaultStatus = VaultStatus.ACTIVE
    owner_address: str
    authorized_agent: str | None = None
    agent_key_scope: str = "environment"
    base_asset: str = "vUSDC"
    policy_id: str | None = None
    policy_version: int = 1


class TradingPolicyData(BaseModel):
    id: str | None = None
    panda_id: str
    vault_id: str | None = None
    sui_object_id: str | None = None
    object_model: str = "standalone_shared_object"
    owner_address: str
    authorized_agent: str | None = None
    agent_key_scope: str = "environment"
    agent_key_version: int = 1
    mode: PolicyMode = PolicyMode.TRAINING_LEDGER
    allowed_pairs: list[str] = Field(default_factory=list)
    max_notional_per_trade: float
    max_daily_loss: float
    max_leverage: float = 1.0
    max_open_positions: int = 1
    paused: bool = False
    version: int = 1
    policy_hash: str = ""


class PandaAccountData(BaseModel):
    id: str | None = None
    panda_id: str
    vault_id: str | None = None
    mode: VaultMode = VaultMode.TRAINING_LEDGER
    base_asset: str = "vUSDC"
    cash_balance: float = 0
    debt_balance: float = 0
    equity: float = 0
    realized_pnl: float = 0
    unrealized_pnl: float = 0
    status: AccountStatus = AccountStatus.ACTIVE


class PandaPositionData(BaseModel):
    id: str | None = None
    panda_id: str
    account_id: str
    pair: str
    asset: str
    quantity: float = 0
    avg_entry_price: float = 0
    current_price: float = 0
    notional_value: float = 0
    unrealized_pnl: float = 0


class OrderIntentData(BaseModel):
    id: str | None = None
    panda_id: str
    vault_id: str | None = None
    policy_id: str | None = None
    policy_version: int
    mode: VaultMode = VaultMode.TRAINING_LEDGER
    pair: str
    side: IntentSide
    notional: float = 0
    reference_price: float = 0
    max_slippage_bps: float | None = None
    final_score: float | None = None
    reason: str | None = None
    decision_hash: str
    proof_eligible: bool = False
    proof_requested: bool = False
    proof_request_source: str | None = None
    proof_key: str | None = None
    status: IntentStatus = IntentStatus.DECIDED
    rejection_reason: str | None = None


class LedgerEntryData(BaseModel):
    id: str | None = None
    panda_id: str
    account_id: str
    order_intent_id: str | None = None
    trade_fact_id: str | None = None
    entry_type: str
    asset: str
    amount: float
    price: float | None = None
    cash_after: float | None = None
    debt_after: float | None = None
    equity_after: float | None = None


class TradeFactData(BaseModel):
    id: str | None = None
    panda_id: str
    order_intent_id: str
    pair: str
    side: IntentSide
    mode: VaultMode
    review_status: str = "pending"
    proof_status: ChainProofStatus = ChainProofStatus.NOT_REQUESTED
    proof_key: str | None = None
    fact_hash: str


class TradeReviewData(BaseModel):
    id: str | None = None
    panda_id: str
    trade_fact_id: str
    verdict: ReviewVerdict
    reason_summary: str
    evidence: dict = Field(default_factory=dict)
    hypotheses: list[dict] = Field(default_factory=list)
    reviewer: str = "agent"
    review_hash: str


class SkillMemoryData(BaseModel):
    id: str | None = None
    panda_id: str
    scope: SkillScope
    pair: str | None = None
    market_regime: str | None = None
    rule_text: str
    confidence: float = 0
    status: SkillMemoryStatus = SkillMemoryStatus.PROPOSED
    evidence_trade_fact_ids: list[str] = Field(default_factory=list)
    version: int
    memory_hash: str


class SkillVersionData(BaseModel):
    id: str | None = None
    panda_id: str
    version: int
    skill_hash: str
    walrus_blob_id: str | None = None
    submitted_tx_digest: str | None = None


class ChainExecutionLogData(BaseModel):
    id: str | None = None
    panda_id: str
    order_intent_id: str | None = None
    trade_fact_id: str | None = None
    network: str = "testnet"
    tx_digest: str
    event_type: str | None = None
    event_payload: dict = Field(default_factory=dict)
    policy_version: int | None = None
    decision_hash: str | None = None
    proof_key: str | None = None
    proof_source: str | None = None
    manual_requested_by: str | None = None
    status: str
    error_message: str | None = None
    retryable: bool = False


class AsyncJobData(BaseModel):
    id: str | None = None
    job_type: str
    status: str = "pending"
    priority: int = 100
    run_at: str | None = None
    locked_at: str | None = None
    locked_by: str | None = None
    attempts: int = 0
    max_attempts: int = 5
    idempotency_key: str
    payload: dict = Field(default_factory=dict)
    last_error: str | None = None


class OutboxEventData(BaseModel):
    id: str | None = None
    aggregate_type: str
    aggregate_id: str
    event_type: str
    redis_channel: str | None = None
    payload: dict = Field(default_factory=dict)
    status: str = "pending"
    attempts: int = 0
    last_error: str | None = None

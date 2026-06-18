"""SQLAlchemy ORM models — legacy tables plus v3.1 agent wallet tables."""
import uuid
from datetime import datetime, date
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer,
    Numeric, SmallInteger, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    wallet_address = Column(Text, nullable=False, unique=True)
    zk_login_subject = Column(Text)
    display_name = Column(Text)
    avatar_url = Column(Text)
    onboarding_survey = Column(JSONB)
    experience_level = Column(String(20))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    pandas = relationship("Panda", back_populates="owner")
    checkins = relationship("Checkin", back_populates="user")
    achievements = relationship("UserAchievement", back_populates="user")


class Panda(Base):
    __tablename__ = "pandas"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    sui_object_id = Column(Text, nullable=False, unique=True)
    owner_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)

    boldness = Column(SmallInteger, nullable=False)
    patience = Column(SmallInteger, nullable=False)
    intuition = Column(SmallInteger, nullable=False)
    focus = Column(SmallInteger, nullable=False)
    contrarian = Column(SmallInteger, nullable=False)
    talent = Column(SmallInteger, nullable=False, default=0)
    generation = Column(Integer, nullable=False, default=1)

    experience_level = Column(SmallInteger, nullable=False, default=0)
    is_trading = Column(Boolean, nullable=False, default=False)
    emotion_state = Column(String(20), nullable=False, default="focused")
    emotion_stability = Column(SmallInteger, nullable=False, default=50)

    walrus_blob_id = Column(Text)
    walrus_last_synced_at = Column(DateTime(timezone=True))
    walrus_sync_status = Column(String(10), nullable=False, default="pending")
    subscribed_pools = Column(JSONB, nullable=True)
    active_vault_id = Column(UUID(as_uuid=False), nullable=True)
    active_policy_id = Column(UUID(as_uuid=False), nullable=True)
    active_skill_version = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="pandas")
    strategies = relationship("Strategy", back_populates="panda")
    trades = relationship("Trade", back_populates="panda")
    simulations = relationship("Simulation", back_populates="panda")
    strategy_ghosts = relationship("StrategyHistory", back_populates="panda")
    emotions_log = relationship("EmotionLog", back_populates="panda")
    merkle_roots = relationship("MerkleRoot", back_populates="panda")
    diary_entries = relationship("PandaDiary", back_populates="panda")


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    raw_text = Column(Text, nullable=False)
    parsed_json = Column(JSONB, nullable=False)
    strategy_hash = Column(Text, nullable=False)
    philosophy = Column(String(30), nullable=False)
    proficiency = Column(SmallInteger, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    panda = relationship("Panda", back_populates="strategies")


class StrategyHistory(Base):
    """策略残影 — 旧策略影响随 trades_since_switch 衰减（见 docs/database-schema.md §3.4）。"""
    __tablename__ = "strategy_history"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    strategy_hash = Column(Text, nullable=False)
    proficiency_at_switch = Column(SmallInteger, nullable=False)
    ghost_weight = Column(Numeric(5, 4), nullable=False, default=1.0)
    trades_since_switch = Column(Integer, nullable=False, default=0)
    switched_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    panda = relationship("Panda", back_populates="strategy_ghosts")


class Simulation(Base):
    """Legacy compatibility table.

    v3.1 treats these routes as Training Ledger sessions until the hot path fully
    moves to order_intents, ledger_entries, and trade_facts.
    """

    __tablename__ = "simulations"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    strategy_id = Column(UUID(as_uuid=False), ForeignKey("strategies.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(20), nullable=False, default="running")  # running | completed | stopped
    speed = Column(String(10), nullable=False, default="1x")
    initial_capital = Column(Numeric(20, 2), nullable=False, default=10000)
    final_equity = Column(Numeric(20, 2), nullable=True)
    total_trades = Column(Integer, nullable=False, default=0)
    win_rate = Column(Numeric(5, 4), nullable=True)
    max_drawdown = Column(Numeric(5, 4), nullable=True)
    data_source = Column(String(20), nullable=False, default="csv")
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    panda = relationship("Panda", back_populates="simulations")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    strategy_id = Column(UUID(as_uuid=False), ForeignKey("strategies.id"), nullable=False)
    simulation_id = Column(UUID(as_uuid=False), ForeignKey("simulations.id"), nullable=False)

    asset = Column(String(5), nullable=False)
    action = Column(String(5), nullable=False)
    price = Column(Numeric(20, 8), nullable=False)
    quantity = Column(Numeric(20, 8), nullable=False)
    position_size_pct = Column(Numeric(5, 4), nullable=False)

    raw_signal = Column(Numeric(5, 4))
    filtered_signal = Column(Numeric(5, 4))
    final_score = Column(Numeric(5, 4), nullable=False)
    emotion_at_trade = Column(String(20), nullable=False)
    proficiency_at_trade = Column(SmallInteger, nullable=False)
    pnl_pct = Column(Numeric(8, 4))
    decision_details = Column(JSONB, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    panda = relationship("Panda", back_populates="trades")


class ExperiencePattern(Base):
    __tablename__ = "experience_patterns"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    pattern_type = Column(String(50), nullable=False)
    pattern_data = Column(JSONB, nullable=False, default=dict)
    confidence = Column(Numeric(5, 4), nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class ExperienceMastery(Base):
    __tablename__ = "experience_mastery"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    asset = Column(String(10), nullable=False)
    mastery_score = Column(Numeric(6, 2), nullable=False, default=0)  # 0–100 scale
    trade_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("panda_id", "asset"),)


class ExperienceMistake(Base):
    __tablename__ = "experience_mistakes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    trade_id = Column(UUID(as_uuid=False), ForeignKey("trades.id"), nullable=True)
    mistake_type = Column(String(50), nullable=False)
    penalty = Column(Numeric(5, 4), nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class ExperienceCycle(Base):
    __tablename__ = "experience_cycles"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    cycle_type = Column(String(30), nullable=False)  # bull | bear | sideways
    performance_data = Column(JSONB, nullable=False, default=dict)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)


class EmotionLog(Base):
    __tablename__ = "emotions_log"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    from_state = Column(String(20), nullable=False)
    to_state = Column(String(20), nullable=False)
    trigger = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    panda = relationship("Panda", back_populates="emotions_log")


class MerkleRoot(Base):
    __tablename__ = "merkle_roots"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    root_hash = Column(Text, nullable=False)
    trade_count = Column(Integer, nullable=False)
    batch_index = Column(Integer, nullable=False)
    root_type = Column(Text, nullable=False, default="trade_facts")
    start_fact_id = Column(UUID(as_uuid=False), nullable=True)
    end_fact_id = Column(UUID(as_uuid=False), nullable=True)
    sui_tx_digest = Column(Text)
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    panda = relationship("Panda", back_populates="merkle_roots")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    code = Column(Text, nullable=False, unique=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    requirement_json = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user_achievements = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=True)
    achievement_id = Column(UUID(as_uuid=False), ForeignKey("achievements.id"), nullable=False)
    unlocked_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")

    __table_args__ = (UniqueConstraint("user_id", "achievement_id"),)


class Checkin(Base):
    __tablename__ = "checkins"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    streak_count = Column(Integer, nullable=False, default=1)
    checkin_date = Column(Date, nullable=False)
    reward_type = Column(Text, nullable=False)
    reward_amount = Column(Numeric(10, 2), nullable=False, default=0)

    user = relationship("User", back_populates="checkins")
    __table_args__ = (UniqueConstraint("user_id", "checkin_date"),)


class MarketDataCache(Base):
    __tablename__ = "market_data_cache"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    asset = Column(String(10), nullable=False)
    timeframe = Column(String(10), nullable=False)
    data = Column(JSONB, nullable=False, default=list)
    cached_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("asset", "timeframe"),)


class CorrelationMatrix(Base):
    __tablename__ = "correlation_matrix"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    asset_pair = Column(String(20), nullable=False, unique=True)
    correlation = Column(Numeric(5, 4), nullable=False)
    calculated_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class PandaDiary(Base):
    __tablename__ = "panda_diary"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    trade_id = Column(UUID(as_uuid=False), ForeignKey("trades.id"), nullable=True)
    emotion_state = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    panda = relationship("Panda", back_populates="diary_entries")


class PandaVault(Base):
    __tablename__ = "panda_vaults"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    sui_object_id = Column(Text, unique=True)
    sui_object_kind = Column(Text, nullable=False, default="shared_object")
    mode = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="active")
    owner_address = Column(Text, nullable=False)
    authorized_agent = Column(Text)
    agent_key_scope = Column(Text, nullable=False, default="environment")
    base_asset = Column(Text, nullable=False, default="vUSDC")
    policy_id = Column(UUID(as_uuid=False), nullable=True)
    policy_version = Column(Integer, nullable=False, default=1)
    training_budget = Column(Numeric(24, 8), nullable=False, default=10000)
    created_tx_digest = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class TradingPolicy(Base):
    __tablename__ = "trading_policies"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    vault_id = Column(UUID(as_uuid=False), ForeignKey("panda_vaults.id", ondelete="CASCADE"), nullable=True)
    sui_object_id = Column(Text, unique=True)
    object_model = Column(Text, nullable=False, default="standalone_shared_object")
    owner_address = Column(Text, nullable=False)
    authorized_agent = Column(Text)
    agent_key_scope = Column(Text, nullable=False, default="environment")
    agent_key_version = Column(Integer, nullable=False, default=1)
    mode = Column(Text, nullable=False)
    allowed_pairs = Column(JSONB, nullable=False, default=list)
    max_notional_per_trade = Column(Numeric(20, 8), nullable=False)
    max_daily_loss = Column(Numeric(20, 8), nullable=False)
    max_leverage = Column(Numeric(10, 4), nullable=False, default=1.0)
    max_open_positions = Column(Integer, nullable=False, default=1)
    expires_at = Column(DateTime(timezone=True))
    paused = Column(Boolean, nullable=False, default=False)
    version = Column(Integer, nullable=False, default=1)
    policy_hash = Column(Text, nullable=False)
    created_tx_digest = Column(Text)
    updated_tx_digest = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class PandaAccount(Base):
    __tablename__ = "panda_accounts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    vault_id = Column(UUID(as_uuid=False), ForeignKey("panda_vaults.id", ondelete="CASCADE"), nullable=True)
    mode = Column(Text, nullable=False, default="training_ledger")
    base_asset = Column(Text, nullable=False, default="vUSDC")
    cash_balance = Column(Numeric(24, 8), nullable=False, default=0)
    debt_balance = Column(Numeric(24, 8), nullable=False, default=0)
    equity = Column(Numeric(24, 8), nullable=False, default=0)
    realized_pnl = Column(Numeric(24, 8), nullable=False, default=0)
    unrealized_pnl = Column(Numeric(24, 8), nullable=False, default=0)
    status = Column(Text, nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("panda_id", "mode"),)


class PandaPosition(Base):
    __tablename__ = "panda_positions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(UUID(as_uuid=False), ForeignKey("panda_accounts.id", ondelete="CASCADE"), nullable=False)
    pair = Column(Text, nullable=False)
    asset = Column(Text, nullable=False)
    quantity = Column(Numeric(24, 8), nullable=False, default=0)
    avg_entry_price = Column(Numeric(24, 8), nullable=False, default=0)
    current_price = Column(Numeric(24, 8), nullable=False, default=0)
    notional_value = Column(Numeric(24, 8), nullable=False, default=0)
    unrealized_pnl = Column(Numeric(24, 8), nullable=False, default=0)
    opened_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("account_id", "pair"),)


class OrderIntent(Base):
    __tablename__ = "order_intents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    vault_id = Column(UUID(as_uuid=False), ForeignKey("panda_vaults.id"), nullable=True)
    policy_id = Column(UUID(as_uuid=False), ForeignKey("trading_policies.id"), nullable=True)
    policy_version = Column(Integer, nullable=False)
    mode = Column(Text, nullable=False)
    pair = Column(Text, nullable=False)
    side = Column(Text, nullable=False)
    notional = Column(Numeric(24, 8), nullable=False, default=0)
    reference_price = Column(Numeric(24, 8), nullable=False, default=0)
    max_slippage_bps = Column(Numeric(10, 4))
    final_score = Column(Numeric(8, 6))
    reason = Column(Text)
    decision_hash = Column(Text, nullable=False, unique=True)
    proof_eligible = Column(Boolean, nullable=False, default=False)
    proof_requested = Column(Boolean, nullable=False, default=False)
    proof_request_source = Column(Text)
    proof_key = Column(Text, unique=True)
    status = Column(Text, nullable=False, default="DECIDED")
    market_snapshot = Column(JSONB, nullable=False, default=dict)
    decision_snapshot = Column(JSONB, nullable=False, default=dict)
    policy_snapshot = Column(JSONB, nullable=False, default=dict)
    rejection_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(UUID(as_uuid=False), ForeignKey("panda_accounts.id", ondelete="CASCADE"), nullable=False)
    order_intent_id = Column(UUID(as_uuid=False), ForeignKey("order_intents.id"), nullable=True)
    trade_fact_id = Column(UUID(as_uuid=False), nullable=True)
    entry_type = Column(Text, nullable=False)
    asset = Column(Text, nullable=False)
    amount = Column(Numeric(24, 8), nullable=False)
    price = Column(Numeric(24, 8))
    cash_after = Column(Numeric(24, 8))
    debt_after = Column(Numeric(24, 8))
    equity_after = Column(Numeric(24, 8))
    metadata_json = Column("metadata", JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class TradeFact(Base):
    __tablename__ = "trade_facts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    order_intent_id = Column(UUID(as_uuid=False), ForeignKey("order_intents.id"), nullable=False)
    pair = Column(Text, nullable=False)
    side = Column(Text, nullable=False)
    mode = Column(Text, nullable=False)
    opened_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    closed_at = Column(DateTime(timezone=True))
    market_snapshot = Column(JSONB, nullable=False, default=dict)
    decision_snapshot = Column(JSONB, nullable=False, default=dict)
    policy_snapshot = Column(JSONB, nullable=False, default=dict)
    ledger_snapshot_before = Column(JSONB, nullable=False, default=dict)
    execution_snapshot = Column(JSONB, nullable=False, default=dict)
    ledger_snapshot_after = Column(JSONB, nullable=False, default=dict)
    outcome = Column(JSONB, nullable=False, default=dict)
    realized_pnl = Column(Numeric(24, 8))
    realized_pnl_pct = Column(Numeric(12, 8))
    review_status = Column(Text, nullable=False, default="pending")
    proof_status = Column(Text, nullable=False, default="not_requested")
    proof_key = Column(Text, unique=True)
    chain_execution_log_id = Column(UUID(as_uuid=False), nullable=True)
    skill_version_before = Column(Integer)
    skill_version_after = Column(Integer)
    fact_hash = Column(Text, nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class TradeReview(Base):
    __tablename__ = "trade_reviews"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    trade_fact_id = Column(UUID(as_uuid=False), ForeignKey("trade_facts.id", ondelete="CASCADE"), nullable=False, unique=True)
    verdict = Column(Text, nullable=False)
    reason_summary = Column(Text, nullable=False)
    evidence = Column(JSONB, nullable=False, default=dict)
    hypotheses = Column(JSONB, nullable=False, default=list)
    reviewer = Column(Text, nullable=False, default="agent")
    review_hash = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class SkillMemory(Base):
    __tablename__ = "skill_memories"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    scope = Column(Text, nullable=False)
    pair = Column(Text)
    market_regime = Column(Text)
    rule_text = Column(Text, nullable=False)
    confidence = Column(Numeric(8, 6), nullable=False, default=0)
    status = Column(Text, nullable=False, default="proposed")
    evidence_trade_fact_ids = Column(JSONB, nullable=False, default=list)
    version = Column(Integer, nullable=False)
    memory_hash = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class SkillVersion(Base):
    __tablename__ = "skill_versions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    skill_hash = Column(Text, nullable=False)
    walrus_blob_id = Column(Text)
    submitted_tx_digest = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("panda_id", "version"),)


class ChainExecutionLog(Base):
    __tablename__ = "chain_execution_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    panda_id = Column(UUID(as_uuid=False), ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False)
    order_intent_id = Column(UUID(as_uuid=False), ForeignKey("order_intents.id"), nullable=True)
    trade_fact_id = Column(UUID(as_uuid=False), ForeignKey("trade_facts.id"), nullable=True)
    network = Column(Text, nullable=False, default="testnet")
    tx_digest = Column(Text, nullable=False, unique=True)
    event_type = Column(Text)
    event_payload = Column(JSONB, nullable=False, default=dict)
    policy_version = Column(Integer)
    decision_hash = Column(Text)
    proof_key = Column(Text, unique=True)
    proof_source = Column(Text)
    manual_requested_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    status = Column(Text, nullable=False)
    error_message = Column(Text)
    retryable = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class AsyncJob(Base):
    __tablename__ = "async_jobs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    job_type = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="pending")
    priority = Column(Integer, nullable=False, default=100)
    run_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    locked_at = Column(DateTime(timezone=True))
    locked_by = Column(Text)
    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=5)
    idempotency_key = Column(Text, nullable=False, unique=True)
    payload = Column(JSONB, nullable=False, default=dict)
    last_error = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    aggregate_type = Column(Text, nullable=False)
    aggregate_id = Column(UUID(as_uuid=False), nullable=False)
    event_type = Column(Text, nullable=False)
    redis_channel = Column(Text)
    payload = Column(JSONB, nullable=False, default=dict)
    status = Column(Text, nullable=False, default="pending")
    attempts = Column(Integer, nullable=False, default=0)
    last_error = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    published_at = Column(DateTime(timezone=True))

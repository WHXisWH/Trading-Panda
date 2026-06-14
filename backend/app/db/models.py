"""SQLAlchemy ORM models — all 18 tables."""
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

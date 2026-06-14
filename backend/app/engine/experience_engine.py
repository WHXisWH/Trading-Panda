"""Experience Engine — pattern / mastery / mistakes / cycles (PostgreSQL backed)."""
from __future__ import annotations

import hashlib
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.exc import OperationalError, ProgrammingError

_EMPTY_EXPERIENCE: dict[str, Any] = {
    "patterns": {},
    "mastery": {},
    "mistakes": {},
    "cycles": {},
}

# ── post-trade write-back tuning (pure, unit-tested) ──
MISTAKE_LOSS_THRESHOLD = -0.02  # a trade losing >2% is logged as a mistake
MISTAKE_PENALTY_SCALE = 2.0
MISTAKE_PENALTY_CAP = 0.5


def merge_pattern(
    old_data: dict[str, Any] | None,
    pattern_hash: str,
    regime: str,
    won: bool,
) -> tuple[dict[str, Any], float]:
    """Fold one trade outcome into a pattern's running record.

    Returns (new pattern_data, confidence=win_rate). Pure — no DB.
    """
    base = old_data or {}
    count = int(base.get("count", 0)) + 1
    wins = int(base.get("wins", 0)) + (1 if won else 0)
    data = {"hash": pattern_hash, "count": count, "wins": wins, "regime": regime}
    confidence = round(wins / count, 4) if count else 0.0
    return data, confidence


def mistake_penalty_for(pnl: float) -> float:
    """Penalty magnitude for a losing trade, scaled by loss size and capped."""
    return round(min(MISTAKE_PENALTY_CAP, abs(float(pnl)) * MISTAKE_PENALTY_SCALE), 4)


def is_mistake(pnl: float) -> bool:
    return float(pnl) < MISTAKE_LOSS_THRESHOLD


class ExperienceEngine:
    def __init__(self, panda_id: str) -> None:
        self.panda_id = panda_id

    async def load(self, session: "AsyncSession") -> dict[str, Any]:
        from sqlalchemy import select

        from app.db.models import (
            ExperienceCycle,
            ExperienceMastery,
            ExperienceMistake,
            ExperiencePattern,
        )

        try:
            return await self._load_from_db(
                session,
                ExperiencePattern,
                ExperienceMastery,
                ExperienceMistake,
                ExperienceCycle,
                select,
            )
        except (ProgrammingError, OperationalError):
            await session.rollback()
            return dict(_EMPTY_EXPERIENCE)

    async def _load_from_db(
        self,
        session: "AsyncSession",
        ExperiencePattern,
        ExperienceMastery,
        ExperienceMistake,
        ExperienceCycle,
        select,
    ) -> dict[str, Any]:
        patterns_result = await session.execute(
            select(ExperiencePattern).where(ExperiencePattern.panda_id == self.panda_id)
        )
        mastery_result = await session.execute(
            select(ExperienceMastery).where(ExperienceMastery.panda_id == self.panda_id)
        )
        mistakes_result = await session.execute(
            select(ExperienceMistake).where(ExperienceMistake.panda_id == self.panda_id)
        )
        cycles_result = await session.execute(
            select(ExperienceCycle).where(ExperienceCycle.panda_id == self.panda_id)
        )

        patterns: dict[str, dict] = {}
        for row in patterns_result.scalars():
            key = row.pattern_data.get("hash", row.pattern_type) if row.pattern_data else row.pattern_type
            patterns[key] = {
                "win_rate": float(row.confidence or 0.5),
                "occurrence_count": row.pattern_data.get("count", 0) if row.pattern_data else 0,
                "regime": row.pattern_data.get("regime", "") if row.pattern_data else "",
            }

        mastery = {
            row.asset: float(row.mastery_score or 50)
            for row in mastery_result.scalars()
        }

        mistakes: dict[str, dict] = {}
        for row in mistakes_result.scalars():
            mistakes[row.mistake_type] = {
                "vigilance": min(1.0, float(row.penalty or 0) + 0.3),
                "count": mistakes.get(row.mistake_type, {}).get("count", 0) + 1,
            }

        cycles: dict[str, dict] = {}
        for row in cycles_result.scalars():
            perf = row.performance_data or {}
            cycles[row.cycle_type] = {
                "days_experienced": perf.get("days_experienced", 0),
            }

        return {"patterns": patterns, "mastery": mastery, "mistakes": mistakes, "cycles": cycles}

    def compute_pattern_hash(self, market: dict[str, Any]) -> str:
        rsi_bucket = int(float(market.get("rsi", 50)) // 10)
        regime = market.get("market_regime", "unknown")
        raw = f"{regime}:{rsi_bucket}:{market.get('trend_strength', 0):.1f}"
        return hashlib.sha256(raw.encode()).hexdigest()[:12]

    def pattern_correction(self, pattern_hash: str, asset: str, experience: dict) -> float:
        patterns = experience.get("patterns", {})
        memory = patterns.get(pattern_hash)
        if memory is None:
            return 0.0
        if memory.get("occurrence_count", 0) < 5:
            return 0.0
        win_rate_offset = float(memory.get("win_rate", 0.5)) - 0.50
        return win_rate_offset * 0.20

    def mastery_correction(self, asset: str, experience: dict) -> float:
        mastery = experience.get("mastery", {}).get(asset, 50)
        return (float(mastery) - 50) / 200

    def mistake_penalty(self, mistake_type: str, experience: dict) -> float:
        vigilance = experience.get("mistakes", {}).get(mistake_type, {}).get("vigilance", 0.0)
        return float(vigilance) * (-0.10)

    def cycle_bonus(self, market_phase: str, experience: dict) -> float:
        regime_key = _regime_to_cycle(market_phase)
        days = experience.get("cycles", {}).get(regime_key, {}).get("days_experienced", 0)
        if days > 30:
            return 0.20
        if days > 10:
            return 0.10
        return 0.0

    def classify_signal_type(self, market: dict[str, Any]) -> str:
        rsi = float(market.get("rsi", 50))
        regime = market.get("market_regime", "unknown")
        if rsi < 30 and regime in ("bull", "ranging"):
            return "追高"
        if rsi > 70:
            return "抄底"
        if float(market.get("trend_strength", 0.5)) > 0.7:
            return "顺势"
        return "震荡"

    async def record_trade(
        self,
        session: "AsyncSession",
        trade: dict[str, Any],
        market: dict[str, Any] | None = None,
    ) -> None:
        """Post-trade experience write-back.

        Always updates per-asset mastery. When the trade's market context is
        supplied, also folds the outcome into the pattern memory + market-cycle
        record, and logs a mistake row for sizeable losses. Each subsystem runs
        in its own savepoint so a missing table degrades gracefully.
        """
        pnl = float(trade.get("pnl_pct") or 0)
        asset = trade.get("asset", "BTC")
        await self._record_mastery(session, asset, pnl)
        if market:
            await self._record_pattern(session, market, pnl)
            await self._record_cycle(session, market)
            if is_mistake(pnl):
                await self._record_mistake(session, market, trade.get("trade_id"), pnl)

    async def _record_mastery(self, session: "AsyncSession", asset: str, pnl: float) -> None:
        from sqlalchemy import select

        from app.db.models import ExperienceMastery

        try:
            async with session.begin_nested():
                result = await session.execute(
                    select(ExperienceMastery).where(
                        ExperienceMastery.panda_id == self.panda_id,
                        ExperienceMastery.asset == asset,
                    )
                )
                row = result.scalar_one_or_none()
                delta = 2.0 if pnl > 0 else -1.0
                if row is None:
                    session.add(
                        ExperienceMastery(
                            panda_id=self.panda_id,
                            asset=asset,
                            mastery_score=min(100, max(0, 50 + delta)),
                            trade_count=1,
                        )
                    )
                else:
                    row.trade_count = int(row.trade_count or 0) + 1
                    row.mastery_score = min(
                        100, max(0, float(row.mastery_score or 50) + delta)
                    )
        except (ProgrammingError, OperationalError):
            pass

    async def _record_pattern(
        self, session: "AsyncSession", market: dict[str, Any], pnl: float
    ) -> None:
        from sqlalchemy import select

        from app.db.models import ExperiencePattern

        try:
            async with session.begin_nested():
                pattern_hash = self.compute_pattern_hash(market)
                regime = market.get("market_regime", "unknown")
                row = (
                    await session.execute(
                        select(ExperiencePattern).where(
                            ExperiencePattern.panda_id == self.panda_id,
                            ExperiencePattern.pattern_type == pattern_hash,
                        )
                    )
                ).scalar_one_or_none()
                data, confidence = merge_pattern(
                    row.pattern_data if row else None, pattern_hash, regime, pnl > 0
                )
                if row is None:
                    session.add(
                        ExperiencePattern(
                            panda_id=self.panda_id,
                            pattern_type=pattern_hash,
                            pattern_data=data,
                            confidence=confidence,
                        )
                    )
                else:
                    row.pattern_data = data
                    row.confidence = confidence
        except (ProgrammingError, OperationalError):
            pass

    async def _record_cycle(self, session: "AsyncSession", market: dict[str, Any]) -> None:
        from datetime import datetime

        from sqlalchemy import select

        from app.db.models import ExperienceCycle

        try:
            async with session.begin_nested():
                cycle_type = _regime_to_cycle(market.get("market_regime", "unknown"))
                row = (
                    await session.execute(
                        select(ExperienceCycle).where(
                            ExperienceCycle.panda_id == self.panda_id,
                            ExperienceCycle.cycle_type == cycle_type,
                            ExperienceCycle.ended_at.is_(None),
                        )
                    )
                ).scalar_one_or_none()
                now = datetime.utcnow()
                if row is None:
                    session.add(
                        ExperienceCycle(
                            panda_id=self.panda_id,
                            cycle_type=cycle_type,
                            performance_data={"trade_count": 1, "days_experienced": 0},
                            started_at=now,
                        )
                    )
                else:
                    data = dict(row.performance_data or {})
                    data["trade_count"] = int(data.get("trade_count", 0)) + 1
                    started = row.started_at or now
                    try:
                        days = (now - started.replace(tzinfo=None)).days
                    except Exception:
                        days = int(data.get("days_experienced", 0))
                    data["days_experienced"] = max(int(data.get("days_experienced", 0)), days)
                    row.performance_data = data
        except (ProgrammingError, OperationalError):
            pass

    async def _record_mistake(
        self,
        session: "AsyncSession",
        market: dict[str, Any],
        trade_id: str | None,
        pnl: float,
    ) -> None:
        from app.db.models import ExperienceMistake

        try:
            async with session.begin_nested():
                session.add(
                    ExperienceMistake(
                        panda_id=self.panda_id,
                        trade_id=trade_id,
                        mistake_type=self.classify_signal_type(market),
                        penalty=mistake_penalty_for(pnl),
                    )
                )
        except (ProgrammingError, OperationalError):
            pass


def _regime_to_cycle(regime: str) -> str:
    mapping = {"bull": "bull", "bear": "bear", "ranging": "sideways", "sideways": "sideways"}
    return mapping.get(regime, regime)

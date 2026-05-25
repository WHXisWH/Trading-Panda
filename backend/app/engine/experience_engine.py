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

    async def record_trade(self, session: "AsyncSession", trade: dict[str, Any]) -> None:
        """Post-trade experience updates — minimal MVP upsert."""
        from sqlalchemy import select

        from app.db.models import ExperienceMastery

        try:
            async with session.begin_nested():
                asset = trade.get("asset", "BTC")
                result = await session.execute(
                    select(ExperienceMastery).where(
                        ExperienceMastery.panda_id == self.panda_id,
                        ExperienceMastery.asset == asset,
                    )
                )
                row = result.scalar_one_or_none()
                pnl = float(trade.get("pnl_pct") or 0)
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


def _regime_to_cycle(regime: str) -> str:
    mapping = {"bull": "bull", "bear": "bear", "ranging": "sideways", "sideways": "sideways"}
    return mapping.get(regime, regime)

"""Strategy ghost (残影) — decaying influence from previous strategies."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


def ghost_weight_for_trades(trades_since_switch: int) -> float:
    if trades_since_switch < 50:
        return 0.40
    if trades_since_switch < 150:
        return 0.20
    if trades_since_switch < 300:
        return 0.08
    return 0.0


@dataclass
class StrategyGhost:
    parsed_json: dict[str, Any]
    trades_since_switch: int = 0

    @property
    def weight(self) -> float:
        return ghost_weight_for_trades(self.trades_since_switch)

    @property
    def is_expired(self) -> bool:
        return self.weight == 0.0


@dataclass
class GhostManager:
    ghosts: list[StrategyGhost] = field(default_factory=list)

    def add_ghost(self, parsed_json: dict[str, Any]) -> None:
        self.ghosts = [g for g in self.ghosts if not g.is_expired]
        self.ghosts.append(StrategyGhost(parsed_json=parsed_json))

    def total_weight(self) -> float:
        return min(sum(g.weight for g in self.ghosts if not g.is_expired), 0.50)

    def blended_old_signal_strength(self, market: dict[str, Any]) -> tuple[float, dict[str, Any] | None]:
        """Return aggregate ghost weight and dominant ghost strategy for pipeline step 4."""
        active = [g for g in self.ghosts if not g.is_expired]
        if not active:
            return 0.0, None
        total_w = self.total_weight()
        if total_w <= 0:
            return 0.0, None
        # Use most recent ghost strategy rules for blending
        return total_w, active[-1].parsed_json

    def on_trade(self) -> None:
        for ghost in self.ghosts:
            ghost.trades_since_switch += 1

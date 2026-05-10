"""Emotion State Machine — 7 states, pure function transitions.

States: focused → excited → greedy
                ↘ cautious → panicking → numb
Doc ref: docs/PRD.md §4.3

Talent override: talent=1 (竹林禅心) → never panic, minimum cautious.
"""

from dataclasses import dataclass
from typing import Literal

EmotionState = Literal["focused", "excited", "greedy", "cautious", "panicking", "numb"]

EMOTION_COEFFICIENTS: dict[EmotionState, float] = {
    "focused": 1.00,
    "excited": 1.10,
    "greedy": 1.30,  # position sizing ×1.6
    "cautious": 0.85,
    "panicking": 0.50,
    "numb": 0.60,
}


@dataclass
class EmotionContext:
    current: EmotionState = "focused"
    win_streak: int = 0
    loss_streak: int = 0
    idle_count: int = 0  # consecutive non-action ticks
    talent: int = 0  # 0=none, 1=竹林禅心


class EmotionStateMachine:
    """Stateless transition logic — caller maintains EmotionContext."""

    def transition(self, ctx: EmotionContext, event: str, value: float = 0.0) -> EmotionState:
        """
        events:
          "win"          → value = pnl_pct
          "loss"         → value = abs(pnl_pct)
          "idle"         → no trade taken
          "drawdown"     → value = drawdown_pct
          "calm_bamboo"  → user used 冷静竹 item
        """
        state = ctx.current

        if event == "calm_bamboo":
            return "focused"

        if event == "win":
            ctx.win_streak += 1
            ctx.loss_streak = 0
            ctx.idle_count = 0
            return self._handle_win(ctx)

        if event == "loss":
            ctx.loss_streak += 1
            ctx.win_streak = 0
            return self._handle_loss(ctx, value)

        if event == "idle":
            ctx.idle_count += 1
            return self._handle_idle(ctx)

        if event == "drawdown":
            return self._handle_drawdown(ctx, value)

        return state

    def _handle_win(self, ctx: EmotionContext) -> EmotionState:
        if ctx.current == "excited" and ctx.win_streak >= 5:
            return "greedy"
        if ctx.current == "focused" and ctx.win_streak >= 3:
            return "excited"
        if ctx.current == "excited" and ctx.loss_streak >= 2:
            return "focused"
        return ctx.current

    def _handle_loss(self, ctx: EmotionContext, loss_pct: float) -> EmotionState:
        # 竹林禅心: never panic, minimum cautious
        if ctx.talent == 1:
            if loss_pct > 0.05:
                return "cautious"
            return ctx.current

        if loss_pct > 0.05 and ctx.current == "focused":
            return "cautious"
        if ctx.current in ("excited", "greedy"):
            return "focused"
        return ctx.current

    def _handle_idle(self, ctx: EmotionContext) -> EmotionState:
        if ctx.current == "panicking" and ctx.idle_count >= 10:
            return "numb"
        return ctx.current

    def _handle_drawdown(self, ctx: EmotionContext, drawdown_pct: float) -> EmotionState:
        if ctx.talent == 1:
            return "cautious"  # 竹林禅心 ceiling
        if drawdown_pct > 0.10 and ctx.current == "cautious":
            return "panicking"
        return ctx.current

    def coefficient(self, state: EmotionState) -> float:
        return EMOTION_COEFFICIENTS.get(state, 1.0)

"""Onboarding survey — api-spec §3.1 POST /api/auth/onboarding-survey."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class OnboardingSurveyRequest(BaseModel):
    trading_exp: Literal["none", "beginner", "intermediate", "advanced"]
    style: list[Literal["trend", "swing", "scalp", "value", "grid"]] = Field(min_length=1)
    max_loss: Literal[5, 10, 20, 30]
    indicators: list[
        Literal["ma", "rsi", "macd", "bollinger", "volume", "none"]
    ] = Field(min_length=1)
    panda_autonomy: Literal[1, 2, 3, 4, 5]


class OnboardingSurveyData(BaseModel):
    experience_level: Literal["beginner", "intermediate", "advanced", "expert"]
    recommended_strategy_tags: list[str]
    ui_complexity: Literal["simple", "standard", "advanced"]

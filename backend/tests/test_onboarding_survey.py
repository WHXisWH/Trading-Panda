"""Onboarding survey derivation tests."""

from app.schemas.onboarding import OnboardingSurveyRequest
from app.services.onboarding_survey import (
    build_survey_response,
    derive_experience_level,
    recommended_tags,
)


def _sample() -> OnboardingSurveyRequest:
    return OnboardingSurveyRequest(
        trading_exp="beginner",
        style=["trend", "swing"],
        max_loss=10,
        indicators=["rsi", "ma"],
        panda_autonomy=3,
    )


def test_derive_beginner_from_none():
    req = OnboardingSurveyRequest(
        trading_exp="none",
        style=["trend"],
        max_loss=5,
        indicators=["none"],
        panda_autonomy=2,
    )
    assert derive_experience_level(req) == "beginner"


def test_derive_intermediate_from_beginner_many_indicators():
    req = OnboardingSurveyRequest(
        trading_exp="beginner",
        style=["trend"],
        max_loss=10,
        indicators=["rsi", "ma", "macd"],
        panda_autonomy=3,
    )
    assert derive_experience_level(req) == "intermediate"


def test_build_survey_response_tags():
    data = build_survey_response(_sample())
    assert data.experience_level in ("beginner", "intermediate", "advanced", "expert")
    assert len(data.recommended_strategy_tags) >= 1
    assert data.ui_complexity in ("simple", "standard", "advanced")


def test_recommended_tags_includes_trend():
    tags = recommended_tags(_sample())
    assert "trend_following" in tags

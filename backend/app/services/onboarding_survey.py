"""Derive experience_level and UI hints from onboarding answers."""

from __future__ import annotations

from app.schemas.onboarding import OnboardingSurveyData, OnboardingSurveyRequest


def derive_experience_level(req: OnboardingSurveyRequest) -> str:
    ind_count = len([i for i in req.indicators if i != "none"])
    exp = req.trading_exp
    if exp == "none":
        return "beginner"
    if exp == "beginner":
        return "beginner" if ind_count <= 2 else "intermediate"
    if exp == "intermediate":
        return "intermediate"
    return "advanced" if ind_count <= 3 else "expert"


def ui_complexity_for(level: str) -> str:
    if level == "beginner":
        return "simple"
    if level in ("advanced", "expert"):
        return "advanced"
    return "standard"


def recommended_tags(req: OnboardingSurveyRequest) -> list[str]:
    tags: list[str] = []
    if "trend" in req.style:
        tags.append("trend_following")
    if "swing" in req.style:
        tags.append("swing")
    if "scalp" in req.style:
        tags.append("scalp")
    if "value" in req.style:
        tags.append("value")
    if "grid" in req.style:
        tags.append("grid")
    if "rsi" in req.indicators or "ma" in req.indicators:
        tags.append("mean_reversion")
    if not tags:
        tags.append("balanced")
    return tags[:4]


def build_survey_response(req: OnboardingSurveyRequest) -> OnboardingSurveyData:
    level = derive_experience_level(req)
    return OnboardingSurveyData(
        experience_level=level,  # type: ignore[arg-type]
        recommended_strategy_tags=recommended_tags(req),
        ui_complexity=ui_complexity_for(level),  # type: ignore[arg-type]
    )


def survey_to_json(req: OnboardingSurveyRequest) -> dict:
    return {
        "trading_exp": req.trading_exp,
        "style": req.style,
        "max_loss": req.max_loss,
        "indicators": req.indicators,
        "panda_autonomy": req.panda_autonomy,
    }

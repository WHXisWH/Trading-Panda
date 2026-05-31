"""Strategy–personality match score (0–100) — rule table, no LLM."""

from __future__ import annotations

from app.db.models import Panda
from app.schemas.strategy import ParsedStrategyLayers

PHILOSOPHY_AXIS_WEIGHTS: dict[str, dict[str, float]] = {
    "trend_following": {
        "patience": 0.35,
        "focus": 0.2,
        "boldness": 0.1,
        "contrarian": -0.3,
        "intuition": -0.05,
    },
    "contrarian": {
        "contrarian": 0.4,
        "boldness": 0.2,
        "intuition": 0.1,
        "patience": -0.1,
        "focus": 0.05,
    },
    "intuition_driven": {
        "intuition": 0.45,
        "boldness": 0.15,
        "contrarian": 0.1,
        "patience": -0.1,
        "focus": -0.05,
    },
    "grid": {
        "focus": 0.35,
        "patience": 0.25,
        "boldness": -0.15,
        "contrarian": 0.05,
        "intuition": -0.1,
    },
    "custom": {
        "patience": 0.15,
        "focus": 0.15,
        "boldness": 0.1,
        "intuition": 0.1,
        "contrarian": 0.1,
    },
}

PANDA_REACTIONS: dict[str, list[str]] = {
    "high": [
        "这套打法很合我的性子，咱们一起练！",
        "嗯，感觉对了——我会认真执行这些规则。",
    ],
    "mid": [
        "还行，给我点时间适应新规则。",
        "可以试试看，不过我得先熟悉一下。",
    ],
    "low": [
        "这策略跟我的天性有点拧……但主人说的算。",
        "嗯……趋势和直觉不太一样，我尽量跟上吧。",
    ],
}


def calc_personality_match(panda: Panda, parsed: ParsedStrategyLayers) -> int:
    weights = PHILOSOPHY_AXIS_WEIGHTS.get(parsed.philosophy, PHILOSOPHY_AXIS_WEIGHTS["custom"])
    axis_values = {
        "boldness": int(panda.boldness),
        "patience": int(panda.patience),
        "intuition": int(panda.intuition),
        "focus": int(panda.focus),
        "contrarian": int(panda.contrarian),
    }
    centered = sum((axis_values[k] - 50) * w for k, w in weights.items())
    score = 50 + centered
    return max(0, min(100, int(round(score))))


def panda_reaction_for_match(match: int, philosophy: str) -> str:
    if match >= 70:
        bucket = "high"
    elif match >= 45:
        bucket = "mid"
    else:
        bucket = "low"
    lines = PANDA_REACTIONS[bucket]
    idx = hash(philosophy) % len(lines)
    return lines[idx]

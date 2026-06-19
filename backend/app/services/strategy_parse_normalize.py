"""Normalize LLM strategy JSON into compilable ParsedStrategyLayers drafts."""

from __future__ import annotations

import re
from copy import deepcopy
from typing import Any

from app.engine.rule_engine import PHILOSOPHY_ALIASES

SUPPORTED_INDICATORS = frozenset({"RSI", "MA20", "MACD", "PRICE"})

PHILOSOPHY_TO_SCHEMA: dict[str, str] = {
    "trend_following": "trend_following",
    "trend": "trend_following",
    "balanced": "trend_following",
    "contrarian": "contrarian",
    "mean_reversion": "contrarian",
    "intuition_driven": "intuition_driven",
    "intuition": "intuition_driven",
    "grid": "grid",
    "grid_trading": "grid",
    "dca": "grid",
    "learning": "custom",
    "custom": "custom",
}

INDICATOR_ALIASES: dict[str, str] = {
    "VOLUME": "RSI",
    "VOL": "RSI",
    "MA": "MA20",
    "SMA": "MA20",
    "EMA": "MA20",
    "MOVING_AVERAGE": "MA20",
    "BOLLINGER": "RSI",
    "BB": "RSI",
    "STOCH": "RSI",
    "STOCHASTIC": "RSI",
    "MOMENTUM": "RSI",
    "SIGNAL": "MACD",
}

CONDITION_HINTS: dict[str, tuple[str, float | None]] = {
    "spike": ("> 70", 70.0),
    "surge": ("> 70", 70.0),
    "oversold": ("< 30", 30.0),
    "overbought": ("> 70", 70.0),
    "dip": ("< 35", 35.0),
    "clear signal": ("< 30", 30.0),
    "clear signals": ("< 30", 30.0),
    "small win": ("> 55", 55.0),
    "small wins": ("> 55", 55.0),
    "take profit": ("> 55", 55.0),
    "bullish": ("golden_cross", None),
    "bearish": ("death_cross", None),
    "golden cross": ("golden_cross", None),
    "death cross": ("death_cross", None),
    "cross above": ("cross_above", None),
    "cross below": ("cross_below", None),
    "breakout": ("> 0", 0.0),
    "breakdown": ("< 0", 0.0),
}

DEFAULT_RISK: dict[str, float] = {
    "stop_loss_pct": 0.05,
    "take_profit_pct": 0.10,
    "max_drawdown_pct": 0.15,
}

DEFAULT_POSITION: dict[str, Any] = {"type": "fixed", "value": 0.10, "scale_in": False}

_PAIR_RE = re.compile(r"\b([A-Z]{2,10})[/-]([A-Z]{2,10})\b", re.IGNORECASE)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _normalize_philosophy(raw: str | None) -> str:
    if not raw:
        return "custom"
    key = raw.strip().lower().replace(" ", "_")
    if key in PHILOSOPHY_TO_SCHEMA:
        return PHILOSOPHY_TO_SCHEMA[key]
    if key in PHILOSOPHY_ALIASES:
        return PHILOSOPHY_TO_SCHEMA.get(PHILOSOPHY_ALIASES[key], "custom")
    allowed = set(PHILOSOPHY_TO_SCHEMA.values())
    if key in allowed:
        return key
    return "custom"


def _map_indicator(raw: str) -> str:
    upper = raw.strip().upper()
    if upper in SUPPORTED_INDICATORS:
        return upper
    return INDICATOR_ALIASES.get(upper, "RSI")


def _normalize_condition(indicator: str, condition: str) -> tuple[str, float | None]:
    lowered = condition.strip().lower()
    for hint, mapped in CONDITION_HINTS.items():
        if hint in lowered:
            cond, threshold = mapped
            if indicator == "MACD" and cond in ("< 30", "> 70", "< 35", "> 55"):
                return "golden_cross", None
            if indicator == "PRICE" and cond.startswith("<"):
                return "below", threshold
            if indicator == "PRICE" and cond.startswith(">"):
                return "above", threshold
            return cond, threshold

    if indicator == "MACD" and lowered in ("buy", "sell", "signal", "cross"):
        return "golden_cross", None
    if indicator == "RSI" and any(k in lowered for k in ("buy", "long", "entry")):
        return "< 30", 30.0
    if indicator == "RSI" and any(k in lowered for k in ("sell", "exit", "win")):
        return "> 55", 55.0
    if indicator == "MA20" and "below" in lowered:
        return "cross_below", None
    if indicator == "MA20" and "above" in lowered:
        return "cross_above", None
    return condition.strip(), None


def _normalize_signal_rule(rule: dict[str, Any]) -> dict[str, Any]:
    indicator = _map_indicator(str(rule.get("indicator", "RSI")))
    condition, hinted_threshold = _normalize_condition(
        indicator, str(rule.get("condition", "< 30"))
    )
    action = str(rule.get("action", "BUY")).upper()
    if action not in ("BUY", "SELL"):
        action = "BUY"

    threshold = rule.get("threshold")
    if threshold is None and hinted_threshold is not None:
        threshold = hinted_threshold

    normalized: dict[str, Any] = {
        "indicator": indicator,
        "condition": condition,
        "action": action,
    }
    if threshold is not None:
        normalized["threshold"] = float(threshold)
    if rule.get("weight") is not None:
        normalized["weight"] = float(rule["weight"])
    return normalized


def _infer_position_sizing(raw_text: str, sizing: dict[str, Any] | None) -> dict[str, Any]:
    text = raw_text.lower()
    default_value = 0.05 if any(k in text for k in ("small", "learning", "tiny")) else 0.10
    merged = {"type": "fixed", "value": default_value, "scale_in": False, **(sizing or {})}
    merged["value"] = _clamp(float(merged["value"]), 0.01, 0.25)
    if merged.get("type") not in ("fixed", "kelly", "grid"):
        merged["type"] = "fixed"
    return merged


def _is_garbage_rule(rule: dict[str, Any]) -> bool:
    """Detect tautological or meaningless rules (not merely uncompiled ones)."""
    indicator = str(rule.get("indicator", "")).upper()
    condition = str(rule.get("condition", "")).lower().strip()
    threshold = rule.get("threshold")

    if indicator != "PRICE":
        return False

    if condition in ("> 0", ">0", "above 0", "< 0", "<0", "below 0"):
        return True

    if threshold is not None:
        t = float(threshold)
        if ">" in condition and t <= 0:
            return True
        if "<" in condition and t <= 0:
            return True
    return False


def _filter_garbage_rules(
    rules: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    kept: list[dict[str, Any]] = []
    warnings: list[str] = []
    for rule in rules:
        if _is_garbage_rule(rule):
            indicator = str(rule.get("indicator", ""))
            condition = str(rule.get("condition", ""))
            warnings.append(
                f"Removed unusable rule: {indicator} {condition} — please add a clearer buy/sell signal."
            )
            continue
        kept.append(rule)
    return kept, warnings


def _infer_risk_management(raw_text: str, risk: dict[str, Any] | None) -> dict[str, float]:
    merged = {**DEFAULT_RISK, **(risk or {})}
    text = raw_text.lower()
    if any(k in text for k in ("stop out fast", "tight stop", "cut loss")):
        merged["stop_loss_pct"] = min(float(merged["stop_loss_pct"]), 0.03)
    if any(k in text for k in ("small win", "sell quickly", "take profit fast")):
        merged["take_profit_pct"] = min(float(merged.get("take_profit_pct", 0.10)), 0.06)
    if any(k in text for k in ("learning", "still learning", "while learning")):
        merged["stop_loss_pct"] = min(float(merged["stop_loss_pct"]), 0.05)
        merged["max_drawdown_pct"] = min(float(merged["max_drawdown_pct"]), 0.15)
        if merged.get("take_profit_pct") is not None:
            merged["take_profit_pct"] = min(float(merged["take_profit_pct"]), 0.10)
    merged["stop_loss_pct"] = _clamp(float(merged["stop_loss_pct"]), 0.01, 0.25)
    merged["max_drawdown_pct"] = _clamp(float(merged["max_drawdown_pct"]), 0.05, 0.5)
    if merged.get("take_profit_pct") is not None:
        merged["take_profit_pct"] = _clamp(float(merged["take_profit_pct"]), 0.02, 0.5)
    return merged


def _extract_target_pairs(raw_text: str, existing: list[str] | None) -> list[str]:
    pairs: list[str] = []
    for base, quote in _PAIR_RE.findall(raw_text):
        pair = f"{base.upper()}/{quote.upper()}"
        if pair not in pairs:
            pairs.append(pair)
    for pair in existing or []:
        normalized = pair.replace("-", "/").upper()
        if normalized not in pairs:
            pairs.append(normalized)
    return pairs[:8]


def normalize_llm_parsed(
    raw: dict[str, Any],
    raw_text: str = "",
) -> tuple[dict[str, Any], list[str]]:
    """Coerce LLM output into schema-friendly strategy JSON before Pydantic validation."""
    warnings: list[str] = []
    data = deepcopy(raw)
    data["philosophy"] = _normalize_philosophy(str(data.get("philosophy", "")))
    data["position_sizing"] = _infer_position_sizing(raw_text, data.get("position_sizing"))
    data["risk_management"] = _infer_risk_management(raw_text, data.get("risk_management"))

    rules = data.get("signal_rules") or []
    if not isinstance(rules, list) or not rules:
        rules = build_heuristic_draft(raw_text)["signal_rules"]
        warnings.append("LLM returned no signal rules — a starter draft was applied.")
    normalized_rules = [_normalize_signal_rule(rule) for rule in rules][:8]
    kept_rules, garbage_warnings = _filter_garbage_rules(normalized_rules)
    warnings.extend(garbage_warnings)
    if not kept_rules:
        kept_rules = build_heuristic_draft(raw_text)["signal_rules"]
        warnings.append(
            "LLM rules were not usable — review and edit the starter signal rules below."
        )
    data["signal_rules"] = kept_rules
    data["target_pairs"] = _extract_target_pairs(raw_text, data.get("target_pairs"))
    return data, warnings


def build_heuristic_draft(raw_text: str) -> dict[str, Any]:
    """Fallback draft when LLM JSON cannot be validated."""
    text = raw_text.lower()
    rules: list[dict[str, Any]] = []
    if any(k in text for k in ("momentum", "trend", "candles", "breakout")):
        rules.extend(
            [
                {"indicator": "MA20", "condition": "cross_above", "action": "BUY"},
                {"indicator": "MA20", "condition": "cross_below", "action": "SELL"},
            ]
        )
    else:
        if any(k in text for k in ("buy", "clear signal", "entry", "long", "dip", "oversold")):
            rules.append(
                {"indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY"}
            )
        if any(k in text for k in ("sell", "win", "exit", "take profit")):
            rules.append(
                {"indicator": "RSI", "condition": "> 55", "threshold": 55, "action": "SELL"}
            )
    if not rules:
        rules.append(
            {"indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY"}
        )

    return {
        "philosophy": "trend_following"
        if any(k in text for k in ("momentum", "trend", "candles"))
        else "custom",
        "position_sizing": _infer_position_sizing(raw_text, None),
        "signal_rules": rules,
        "risk_management": _infer_risk_management(raw_text, None),
        "target_pairs": _extract_target_pairs(raw_text, None),
    }

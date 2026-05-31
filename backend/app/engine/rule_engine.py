"""Strategy rule engine — matches signal_rules against market indicators."""
from __future__ import annotations

import re
from typing import Any, Callable


RuleFn = Callable[[dict[str, Any]], bool]

PHILOSOPHY_ALIASES: dict[str, str] = {
    "trend_following": "趋势跟踪",
    "contrarian": "逆向抄底",
    "grid": "网格交易",
    "grid_trading": "网格交易",
    "dca": "定投",
    "intuition_driven": "直觉驱动",
    "balanced": "趋势跟踪",
    "custom": "趋势跟踪",
}


def normalize_philosophy(philosophy: str) -> str:
    if not philosophy:
        return "趋势跟踪"
    return PHILOSOPHY_ALIASES.get(philosophy.lower(), philosophy)


class RuleEngine:
    """Compile strategy signal_rules into callable predicates."""

    def __init__(self, signal_rules: list[dict[str, Any]] | None = None) -> None:
        self.signal_rules = signal_rules or []
        self._compiled: list[tuple[str, RuleFn]] = self._compile_rules(self.signal_rules)

    def _compile_rules(self, rules: list[dict[str, Any]]) -> list[tuple[str, RuleFn]]:
        compiled: list[tuple[str, RuleFn]] = []
        for rule in rules:
            indicator = str(rule.get("indicator", "")).upper()
            condition = str(rule.get("condition", "")).lower()
            action = str(rule.get("action", "BUY")).upper()
            threshold = _parse_threshold(condition, rule)

            fn = _compile_indicator(indicator, condition, threshold)
            if fn is not None:
                compiled.append((action, fn))
        return compiled

    def match_signals(self, market: dict[str, Any]) -> float:
        """Signed signal strength in [-1, 1]. Positive = BUY bias."""
        signed, _, _, _ = self.match_signal_detail(market)
        return signed

    def match_signal_detail(
        self, market: dict[str, Any]
    ) -> tuple[float, int, int, list[int]]:
        """Return (signed_score, buy_hits, sell_hits, matched_rule_indexes)."""
        buy_hits = 0
        sell_hits = 0
        matched: list[int] = []
        total = len(self._compiled) or 1

        for index, (action, fn) in enumerate(self._compiled):
            if not fn(market):
                continue
            matched.append(index)
            if action == "SELL":
                sell_hits += 1
            else:
                buy_hits += 1

        if buy_hits == 0 and sell_hits == 0:
            return 0.0, 0, 0, matched
        return (buy_hits - sell_hits) / total, buy_hits, sell_hits, matched


def _parse_threshold(condition: str, rule: dict[str, Any]) -> float:
    if "threshold" in rule:
        return float(rule["threshold"])
    match = re.search(r"([\d.]+)", condition)
    return float(match.group(1)) if match else 0.0


def _compile_indicator(
    indicator: str, condition: str, threshold: float
) -> RuleFn | None:
    if indicator == "RSI":
        if _has_kw(condition, "below", "less", "低于", "<"):
            return lambda m, t=threshold: float(m.get("rsi", 50)) < t
        if _has_kw(condition, "above", "greater", "高于", ">"):
            return lambda m, t=threshold: float(m.get("rsi", 50)) > t

    if indicator in ("MA", "MA20"):
        if condition in ("cross_above", "上穿", "golden_cross"):
            return lambda m: (
                float(m.get("price", 0)) > float(m.get("ma20", 0))
                and float(m.get("prev_price", 0)) <= float(m.get("prev_ma20", 0))
            )
        if condition in ("cross_below", "下穿", "death_cross"):
            return lambda m: (
                float(m.get("price", 0)) < float(m.get("ma20", 0))
                and float(m.get("prev_price", 0)) >= float(m.get("prev_ma20", 0))
            )

    if indicator == "MACD":
        sig = lambda m: str(m.get("macd_signal", "")).lower()
        if condition in ("golden_cross", "金叉", "bullish"):
            return lambda m: sig(m) in ("golden_cross", "bullish", "true", "1")
        if condition in ("death_cross", "死叉", "bearish"):
            return lambda m: sig(m) in ("death_cross", "bearish", "false", "0")

    if indicator == "PRICE":
        if _has_kw(condition, "above", ">"):
            return lambda m, t=threshold: float(m.get("price", 0)) > t
        if _has_kw(condition, "below", "<"):
            return lambda m, t=threshold: float(m.get("price", 0)) < t

    return None


def _has_kw(condition: str, *keywords: str) -> bool:
    return any(kw in condition for kw in keywords)


def rule_is_compilable(rule: dict[str, Any]) -> tuple[bool, str | None]:
    """Return whether a single signal_rule can be compiled by RuleEngine."""
    indicator = str(rule.get("indicator", "")).upper()
    if not indicator:
        return False, "missing indicator"

    condition = str(rule.get("condition", "")).lower()
    if not condition:
        return False, "missing condition"

    action = str(rule.get("action", "")).upper()
    if action not in ("BUY", "SELL"):
        return False, f"invalid action: {action or 'empty'}"

    threshold = _parse_threshold(condition, rule)
    if _compile_indicator(indicator, condition, threshold) is None:
        return False, f"unsupported indicator/condition: {indicator}/{condition}"

    return True, None


def validate_signal_rules(
    rules: list[dict[str, Any]],
) -> tuple[int, list[dict[str, Any]]]:
    """Validate rules; return (compiled_count, invalid_rules with index/reason)."""
    invalid: list[dict[str, Any]] = []
    compiled_count = 0

    for index, rule in enumerate(rules):
        ok, reason = rule_is_compilable(rule)
        if ok:
            compiled_count += 1
        else:
            invalid.append(
                {
                    "index": index,
                    "reason": reason or "invalid rule",
                    "indicator": str(rule.get("indicator", "")) or None,
                }
            )

    return compiled_count, invalid

"""Rule engine unit tests."""
from app.engine.rule_engine import RuleEngine, normalize_philosophy, rule_is_compilable, validate_signal_rules


def test_rsi_below_triggers_buy_rule():
    engine = RuleEngine([{"indicator": "RSI", "condition": "<30", "action": "BUY"}])
    score = engine.match_signals({"rsi": 25})
    assert score > 0


def test_rsi_above_triggers_sell_rule():
    engine = RuleEngine([{"indicator": "RSI", "condition": ">70", "action": "SELL"}])
    score = engine.match_signals({"rsi": 75})
    assert score < 0


def test_ma_cross_above():
    engine = RuleEngine(
        [{"indicator": "MA20", "condition": "cross_above", "action": "BUY"}]
    )
    market = {"price": 110, "ma20": 100, "prev_price": 95, "prev_ma20": 100}
    assert engine.match_signals(market) > 0


def test_ma_cross_below_sell():
    engine = RuleEngine(
        [{"indicator": "MA20", "condition": "cross_below", "action": "SELL"}]
    )
    market = {"price": 90, "ma20": 100, "prev_price": 105, "prev_ma20": 100}
    assert engine.match_signals(market) < 0


def test_macd_death_cross_sell():
    engine = RuleEngine(
        [{"indicator": "MACD", "condition": "death_cross", "action": "SELL"}]
    )
    assert engine.match_signals({"macd_signal": "death_cross"}) < 0


def test_macd_golden_cross_buy():
    engine = RuleEngine(
        [{"indicator": "MACD", "condition": "golden_cross", "action": "BUY"}]
    )
    assert engine.match_signals({"macd_signal": "golden_cross"}) > 0


def test_multiple_rules_partial_hits():
    engine = RuleEngine(
        [
            {"indicator": "RSI", "condition": "<30", "action": "BUY"},
            {"indicator": "RSI", "condition": ">70", "action": "SELL"},
        ]
    )
    assert engine.match_signals({"rsi": 25}) > 0
    assert engine.match_signals({"rsi": 75}) < 0


def test_no_rules_returns_zero():
    assert RuleEngine([]).match_signals({"rsi": 10}) == 0.0


def test_normalize_philosophy():
    assert normalize_philosophy("grid") == "网格交易"
    assert normalize_philosophy("") == "趋势跟踪"


def test_price_above_rule():
    engine = RuleEngine([{"indicator": "PRICE", "condition": ">60000", "action": "SELL"}])
    assert engine.match_signals({"price": 65000}) < 0
    assert engine.match_signals({"price": 55000}) == 0.0


def test_price_below_rule():
    engine = RuleEngine([{"indicator": "PRICE", "condition": "<50000", "action": "BUY"}])
    assert engine.match_signals({"price": 48000}) > 0


def test_explicit_threshold_in_rule():
    engine = RuleEngine(
        [{"indicator": "RSI", "condition": "below", "action": "BUY", "threshold": 40}]
    )
    assert engine.match_signals({"rsi": 35}) > 0
    assert engine.match_signals({"rsi": 45}) == 0.0


def test_rule_is_compilable_rejects_missing_indicator():
    ok, reason = rule_is_compilable({"indicator": "", "condition": "<30", "action": "BUY"})
    assert ok is False
    assert reason == "missing indicator"


def test_rule_is_compilable_rejects_missing_condition():
    ok, reason = rule_is_compilable({"indicator": "RSI", "condition": "", "action": "BUY"})
    assert ok is False
    assert reason == "missing condition"


def test_match_signal_detail_returns_hit_indexes():
    engine = RuleEngine(
        [
            {"indicator": "RSI", "condition": "<30", "action": "BUY"},
            {"indicator": "RSI", "condition": ">70", "action": "SELL"},
        ]
    )
    signed, buy_hits, sell_hits, matched = engine.match_signal_detail({"rsi": 25})
    assert signed > 0
    assert buy_hits == 1
    assert sell_hits == 0
    assert matched == [0]


def test_rule_is_compilable_rejects_invalid_action():
    ok, reason = rule_is_compilable(
        {"indicator": "RSI", "condition": "<30", "action": "HOLD"}
    )
    assert ok is False
    assert "invalid action" in (reason or "")


def test_validate_signal_rules_mixed_batch():
    rules = [
        {"indicator": "RSI", "condition": "<30", "action": "BUY"},
        {"indicator": "UNKNOWN", "condition": "magic", "action": "BUY"},
    ]
    compiled, invalid = validate_signal_rules(rules)
    assert compiled == 1
    assert len(invalid) == 1
    assert invalid[0]["index"] == 1

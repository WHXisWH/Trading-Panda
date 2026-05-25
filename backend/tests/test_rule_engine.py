"""Rule engine unit tests."""
from app.engine.rule_engine import RuleEngine, normalize_philosophy


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

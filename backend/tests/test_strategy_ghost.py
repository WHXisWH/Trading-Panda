from app.engine.strategy_ghost import GhostManager, ghost_weight_for_trades


def test_ghost_weight_decay():
    assert ghost_weight_for_trades(0) == 0.40
    assert ghost_weight_for_trades(50) == 0.20
    assert ghost_weight_for_trades(150) == 0.08
    assert ghost_weight_for_trades(300) == 0.0


def test_multi_shadow_cap():
    mgr = GhostManager()
    mgr.add_ghost({"signal_rules": []})
    mgr.add_ghost({"signal_rules": []})
    assert mgr.total_weight() <= 0.50


def test_ghost_expired_removed_from_blend():
    from app.engine.strategy_ghost import StrategyGhost

    mgr = GhostManager()
    mgr.ghosts = [
        StrategyGhost(parsed_json={"signal_rules": []}, trades_since_switch=300)
    ]
    assert mgr.total_weight() == 0.0
    assert mgr.blended_old_signal_strength({}) == (0.0, None)


def test_blended_returns_recent_ghost_strategy():
    mgr = GhostManager()
    mgr.add_ghost({"signal_rules": [{"indicator": "RSI", "condition": "<30", "action": "BUY"}]})
    weight, strategy = mgr.blended_old_signal_strength({"rsi": 25})
    assert weight == 0.40
    assert strategy is not None
    assert strategy["signal_rules"][0]["action"] == "BUY"


def test_on_trade_increments_all_ghosts():
    mgr = GhostManager()
    mgr.add_ghost({"signal_rules": []})
    mgr.on_trade()
    assert mgr.ghosts[0].trades_since_switch == 1

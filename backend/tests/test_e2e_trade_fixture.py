import random

from app.engine.decision_pipeline import DecisionPipeline
from app.services.e2e_trade_fixture import (
    E2E_PERSONALITY,
    E2E_POSITION_PCT,
    build_e2e_buy_strategy,
    build_e2e_tick,
)


def test_e2e_trade_fixture_executes_buy_above_threshold():
    strategy = {
        **build_e2e_buy_strategy("DEEP-SUI"),
        "proficiency": 100,
    }
    result = DecisionPipeline(rng=random.Random(0)).run(
        market_data=build_e2e_tick("DEEP-SUI"),
        personality={"panda_id": "panda-1", **E2E_PERSONALITY},
        strategy=strategy,
        experience={},
        emotion="focused",
    )

    assert result.action == "BUY"
    assert result.zone == "EXECUTE"
    assert result.final_score > result.entry_threshold
    assert 10_000 * E2E_POSITION_PCT <= 50

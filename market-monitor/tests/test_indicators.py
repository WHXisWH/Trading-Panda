from feed.deepbook_client import Candle
from pipeline.indicators import compute_indicators


def _candles(n: int, base: float = 100.0) -> list[Candle]:
    out: list[Candle] = []
    for i in range(n):
        c = base + i * 0.5
        out.append(
            Candle(
                open=c - 0.2,
                high=c + 0.3,
                low=c - 0.3,
                close=c,
                volume=10.0 + i,
                timestamp=1_700_000_000.0 + i * 60,
            )
        )
    return out


def test_compute_indicators_uptrend() -> None:
    snap = compute_indicators(_candles(30))
    assert snap is not None
    assert snap.price > snap.prev_price
    assert snap.ma20 > 0
    assert 0 <= snap.rsi <= 100


def test_insufficient_candles() -> None:
    assert compute_indicators(_candles(1)) is None

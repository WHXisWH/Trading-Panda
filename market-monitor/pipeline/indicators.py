from dataclasses import dataclass

from feed.deepbook_client import Candle


@dataclass(frozen=True)
class IndicatorSnapshot:
    price: float
    prev_price: float
    volume: float
    rsi: float
    ma20: float
    prev_ma20: float
    macd_signal: bool
    volatility: float
    trend_strength: float


def compute_indicators(candles: list[Candle]) -> IndicatorSnapshot | None:
    if len(candles) < 2:
        return None

    closes = [c.close for c in candles]
    last = candles[-1]
    prev = candles[-2]
    price = last.close
    prev_price = prev.close
    volume = last.volume

    ma20 = _sma(closes, 20)
    prev_ma20 = _sma(closes[:-1], 20) if len(closes) > 1 else ma20
    rsi = _rsi(closes, 14)
    macd_signal = _macd_cross(closes)
    volatility = _volatility(closes, 14)
    trend_strength = min(1.0, abs(price - ma20) / ma20) if ma20 > 0 else 0.0

    return IndicatorSnapshot(
        price=price,
        prev_price=prev_price,
        volume=volume,
        rsi=rsi,
        ma20=ma20,
        prev_ma20=prev_ma20,
        macd_signal=macd_signal,
        volatility=volatility,
        trend_strength=trend_strength,
    )


def _sma(values: list[float], period: int) -> float:
    window = values[-period:] if len(values) >= period else values
    if not window:
        return 0.0
    return sum(window) / len(window)


def _rsi(closes: list[float], period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    gains = 0.0
    losses = 0.0
    for i in range(-period, 0):
        delta = closes[i] - closes[i - 1]
        if delta >= 0:
            gains += delta
        else:
            losses -= delta
    if losses == 0:
        return 100.0 if gains > 0 else 50.0
    rs = gains / losses
    return 100.0 - (100.0 / (1.0 + rs))


def _ema(values: list[float], period: int) -> list[float]:
    if not values:
        return []
    k = 2 / (period + 1)
    out = [values[0]]
    for v in values[1:]:
        out.append(v * k + out[-1] * (1 - k))
    return out


def _macd_cross(closes: list[float]) -> bool:
    if len(closes) < 35:
        return False
    ema12 = _ema(closes, 12)
    ema26 = _ema(closes, 26)
    macd_line = [a - b for a, b in zip(ema12, ema26)]
    signal = _ema(macd_line, 9)
    if len(macd_line) < 2 or len(signal) < 2:
        return False
    prev_diff = macd_line[-2] - signal[-2]
    curr_diff = macd_line[-1] - signal[-1]
    return prev_diff <= 0 < curr_diff or prev_diff >= 0 > curr_diff


def _volatility(closes: list[float], period: int = 14) -> float:
    if len(closes) < 2:
        return 0.0
    window = closes[-period:] if len(closes) >= period else closes
    returns = []
    for i in range(1, len(window)):
        if window[i - 1] != 0:
            returns.append((window[i] - window[i - 1]) / window[i - 1])
    if not returns:
        return 0.0
    mean = sum(returns) / len(returns)
    var = sum((r - mean) ** 2 for r in returns) / len(returns)
    return var**0.5

def detect_regime(
    price: float, ma20: float, trend_strength: float, rsi: float
) -> str:
    if ma20 <= 0:
        return "ranging"
    if trend_strength < 0.02:
        return "ranging"
    if price > ma20 and rsi >= 50:
        return "bull"
    if price < ma20 and rsi <= 50:
        return "bear"
    return "ranging"

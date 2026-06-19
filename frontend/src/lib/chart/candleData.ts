import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import type { CandlesResponse, MarketInterval, MarketTickPayload } from "@/types/ws";
import type { OhlcBar } from "@/lib/chart/indicators/types";

function toChartTime(raw: number | undefined): UTCTimestamp | null {
  if (!raw || !Number.isFinite(raw)) {
    return null;
  }
  return Math.floor(raw > 1e12 ? raw / 1000 : raw) as UTCTimestamp;
}

export function candlesFromHistory(history: CandlesResponse | null | undefined): CandlestickData[] {
  if (!history?.candles?.length) {
    return [];
  }
  const candles: CandlestickData[] = [];
  for (const c of history.candles) {
    const time = toChartTime(c.t);
    if (time == null) {
      continue;
    }
    candles.push({
      time,
      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
    });
  }
  return candles;
}

export function ohlcBarsFromHistory(history: CandlesResponse | null | undefined): OhlcBar[] {
  if (!history?.candles?.length) {
    return [];
  }
  const bars: OhlcBar[] = [];
  for (const c of history.candles) {
    const time = toChartTime(c.t);
    if (time == null) {
      continue;
    }
    bars.push({
      time,
      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
      volume: c.v,
    });
  }
  return bars;
}

export function mergeLiveBarIntoOhlc(
  bars: OhlcBar[],
  interval: MarketInterval,
  lastTick: MarketTickPayload | null | undefined,
): OhlcBar[] {
  const candle = lastTick?.candle;
  if (interval !== "1m" || !candle || lastTick?.timestamp == null) {
    return bars;
  }
  const time = toChartTime(lastTick.timestamp);
  if (time == null || bars.length === 0) {
    return bars;
  }
  const next = [...bars];
  const last = next[next.length - 1];
  const liveBar: OhlcBar = {
    time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
  if (last.time === time) {
    next[next.length - 1] = liveBar;
  } else if (last.time < time) {
    next.push(liveBar);
  }
  return next;
}

export { toChartTime };

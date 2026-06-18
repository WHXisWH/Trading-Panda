import type { CandleBar, CandlesResponse, MarketInterval, MarketTickPayload } from "@/types/ws";

export const CANDLES_PAGE_SIZE = 150;
export const CANDLES_MEMORY_CAP = 4000;
export const CANDLES_TAIL_FETCH = 3;

const INTERVAL_SECONDS: Record<MarketInterval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

export function intervalToSeconds(interval: MarketInterval): number {
  return INTERVAL_SECONDS[interval];
}

export function tailRefreshMs(interval: MarketInterval): number {
  if (interval === "1m") {
    return 60_000;
  }
  return intervalToSeconds(interval) * 1000;
}

export function mergeCandleBars(existing: CandleBar[], incoming: CandleBar[]): CandleBar[] {
  const byTime = new Map<number, CandleBar>();
  for (const bar of existing) {
    byTime.set(bar.t, bar);
  }
  for (const bar of incoming) {
    byTime.set(bar.t, bar);
  }
  return Array.from(byTime.values()).sort((a, b) => a.t - b.t);
}

export function capCandleBars(bars: CandleBar[], maxBars: number = CANDLES_MEMORY_CAP): CandleBar[] {
  if (bars.length <= maxBars) {
    return bars;
  }
  return bars.slice(bars.length - maxBars);
}

export function toCandlesResponse(
  pool: string,
  pair: string,
  interval: MarketInterval,
  bars: CandleBar[],
  meta: Pick<CandlesResponse, "has_more" | "oldest_t" | "newest_t">,
): CandlesResponse {
  return {
    pool,
    pair,
    interval,
    candles: bars,
    has_more: meta.has_more,
    oldest_t: meta.oldest_t,
    newest_t: meta.newest_t,
  };
}

export function oldestBarTime(bars: CandleBar[]): number | null {
  if (bars.length === 0) {
    return null;
  }
  return bars[0].t;
}

export function newestBarTime(bars: CandleBar[]): number | null {
  if (bars.length === 0) {
    return null;
  }
  return bars[bars.length - 1].t;
}

/** Merge a live market.tick candle into the in-memory bar series. */
export function barFromMarketTick(tick: MarketTickPayload | null): CandleBar | null {
  const candle = tick?.candle;
  if (!candle || tick?.timestamp == null) {
    return null;
  }
  const t =
    tick.timestamp > 1e12
      ? Math.floor(tick.timestamp / 1000)
      : Math.floor(tick.timestamp);
  return {
    t,
    o: candle.open,
    h: candle.high,
    l: candle.low,
    c: candle.close,
    v: candle.volume,
  };
}

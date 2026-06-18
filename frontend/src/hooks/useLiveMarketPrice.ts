"use client";

import { useCallback, useEffect, useState } from "react";
import type { CandlesResponse, MarketTickPayload } from "@/types/ws";

const LIVE_PRICE_TICK_MS = 1_000;

export function resolveLiveMarketPrice(
  lastTick: MarketTickPayload | null | undefined,
  history: CandlesResponse | null | undefined,
): number | undefined {
  const tickPrice = lastTick?.price ?? lastTick?.candle?.close;
  if (tickPrice != null && Number.isFinite(tickPrice) && tickPrice > 0) {
    return tickPrice;
  }
  const lastClose = history?.candles?.at(-1)?.c;
  if (lastClose != null && Number.isFinite(lastClose) && lastClose > 0) {
    return lastClose;
  }
  return undefined;
}

/** Last price from WS tick / latest candle; re-evaluated every second. */
export function useLiveMarketPrice(
  lastTick: MarketTickPayload | null | undefined,
  history: CandlesResponse | null | undefined,
): number | undefined {
  const resolve = useCallback(
    () => resolveLiveMarketPrice(lastTick, history),
    [history, lastTick],
  );
  const [livePrice, setLivePrice] = useState<number | undefined>(() => resolve());

  useEffect(() => {
    setLivePrice(resolve());
  }, [resolve]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLivePrice(resolve());
    }, LIVE_PRICE_TICK_MS);
    return () => window.clearInterval(timer);
  }, [resolve]);

  return livePrice;
}

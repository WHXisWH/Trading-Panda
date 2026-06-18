"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  computeMarket24hChange,
  fetchMarket24hReferenceClose,
  fetchPoolMarketStats,
  type PoolMarketStats,
} from "@/lib/market/poolStats";

const POOL_STATS_REFRESH_MS = 60_000;
const LIVE_METRIC_TICK_MS = 1_000;

export function usePoolMarketStats(
  pool: string,
  lastPrice?: number,
  enabled = true,
) {
  const priceRef = useRef(lastPrice);
  priceRef.current = lastPrice;

  return useQuery<PoolMarketStats | null>({
    queryKey: ["pool-market-stats", pool],
    enabled: enabled && !!pool,
    queryFn: () => fetchPoolMarketStats(pool, priceRef.current),
    refetchInterval: POOL_STATS_REFRESH_MS,
    staleTime: 55_000,
    placeholderData: (previousData) => previousData,
  });
}

/** 24h reference close from REST (60s); percentage recomputed every second from live price. */
export function useLiveMarket24hChange(
  pool: string,
  livePrice: number | undefined,
  enabled = true,
) {
  const { data: referenceClose } = useQuery<number | null>({
    queryKey: ["market-24h-reference", pool],
    enabled: enabled && !!pool,
    queryFn: () => fetchMarket24hReferenceClose(pool),
    refetchInterval: POOL_STATS_REFRESH_MS,
    staleTime: 55_000,
  });

  const [change24hPct, setChange24hPct] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      setChange24hPct(computeMarket24hChange(livePrice, referenceClose));
    };
    update();
    const timer = window.setInterval(update, LIVE_METRIC_TICK_MS);
    return () => window.clearInterval(timer);
  }, [livePrice, referenceClose]);

  return change24hPct;
}

/** @deprecated Use useLiveMarket24hChange for toolbar display. */
export function useMarket24hChange(pool: string, currentPrice: number | undefined, enabled = true) {
  return useLiveMarket24hChange(pool, currentPrice, enabled);
}

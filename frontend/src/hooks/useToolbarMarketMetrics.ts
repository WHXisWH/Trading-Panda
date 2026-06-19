"use client";

import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLatestTail } from "@/lib/market/candles";
import {
  computeMarket24hChange,
  fetchMarket24hReferenceClose,
  fetchPoolMarketStats,
  type PoolMarketStats,
} from "@/lib/market/poolStats";
import {
  pickNewerMarketPrice,
  resolveRestLastCloseSnapshot,
  resolveTickPriceSnapshot,
  TOOLBAR_POOL_STATS_MS,
  TOOLBAR_REF_24H_MS,
  TOOLBAR_TAIL_POLL_MS,
} from "@/lib/market/toolbarMetrics";
import type { MarketTickPayload } from "@/types/ws";

export interface ToolbarMarketMetrics {
  lastPrice: number | undefined;
  change24hPct: number | null;
  poolStats: PoolMarketStats | null | undefined;
  poolStatsLoading: boolean;
}

/** Toolbar Last / 24h / pool stats — WS tick + 15s REST tail, decoupled from chart interval. */
export function useToolbarMarketMetrics(
  pool: string,
  lastTick: MarketTickPayload | null | undefined,
  enabled = true,
): ToolbarMarketMetrics {
  const tickSnapshot = useMemo(() => resolveTickPriceSnapshot(lastTick), [lastTick]);

  const { data: tailPage } = useQuery({
    queryKey: ["toolbar-market-tail", pool],
    enabled: enabled && !!pool,
    queryFn: () => fetchLatestTail({ pool, interval: "1m" }),
    refetchInterval: TOOLBAR_TAIL_POLL_MS,
    staleTime: TOOLBAR_TAIL_POLL_MS - 1_000,
  });

  const restSnapshot = useMemo(() => resolveRestLastCloseSnapshot(tailPage), [tailPage]);

  const lastPrice = useMemo(
    () => pickNewerMarketPrice(tickSnapshot, restSnapshot),
    [restSnapshot, tickSnapshot],
  );

  const { data: referenceClose } = useQuery({
    queryKey: ["market-24h-reference", pool],
    enabled: enabled && !!pool,
    queryFn: () => fetchMarket24hReferenceClose(pool),
    refetchInterval: TOOLBAR_REF_24H_MS,
    staleTime: TOOLBAR_REF_24H_MS - 5_000,
  });

  const change24hPct = useMemo(
    () => computeMarket24hChange(lastPrice, referenceClose),
    [lastPrice, referenceClose],
  );

  const priceRef = useRef(lastPrice);
  priceRef.current = lastPrice;

  const { data: poolStats, isPending: poolStatsPending } = useQuery({
    queryKey: ["pool-market-stats", pool],
    enabled: enabled && !!pool,
    queryFn: () => fetchPoolMarketStats(pool, priceRef.current),
    refetchInterval: TOOLBAR_POOL_STATS_MS,
    staleTime: TOOLBAR_POOL_STATS_MS - 1_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    lastPrice,
    change24hPct,
    poolStats,
    poolStatsLoading: poolStatsPending && poolStats == null,
  };
}

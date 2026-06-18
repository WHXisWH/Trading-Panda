"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { fetchLatestTail, fetchMarketCandles } from "@/lib/market/candles";
import {
  CANDLES_MEMORY_CAP,
  CANDLES_PAGE_SIZE,
  capCandleBars,
  mergeCandleBars,
  oldestBarTime,
  tailRefreshMs,
  toCandlesResponse,
} from "@/lib/market/candleStore";
import type {
  CandlesResponse,
  MarketInterval,
  MarketTickPayload,
  SubscribeMarketPayload,
  WsServerEvent,
} from "@/types/ws";

export type UseMarketCandlesOptions = {
  pool?: string;
  pairs?: string[];
  interval?: MarketInterval;
  enabled?: boolean;
  pageSize?: number;
  memoryCap?: number;
};

export function useMarketCandles(options: UseMarketCandlesOptions = {}) {
  const {
    pool,
    pairs = [],
    interval = "1m",
    enabled = true,
    pageSize = CANDLES_PAGE_SIZE,
    memoryCap = CANDLES_MEMORY_CAP,
  } = options;

  const { accessToken } = useAuth();
  const [bars, setBars] = useState<CandlesResponse["candles"]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [lastTick, setLastTick] = useState<MarketTickPayload | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  const wsEnabled =
    enabled && interval === "1m" && !!accessToken && pairs.length > 0;

  const candlesEnabled = enabled && !!pool;

  const handleWsEvent = useCallback((event: WsServerEvent) => {
    if (event.event !== "market.tick") {
      return;
    }
    setLastTick(event.payload as MarketTickPayload);
  }, []);

  const ws = useWebSocket({
    token: accessToken,
    enabled: wsEnabled,
    onEvent: handleWsEvent,
  });

  const subscribeMarket = useCallback(
    (override?: SubscribeMarketPayload) => {
      const payload: SubscribeMarketPayload = {
        pairs: override?.pairs ?? pairs,
        interval: override?.interval ?? interval,
      };
      if ((payload.pairs?.length ?? 0) === 0) {
        return false;
      }
      return ws.sendCommand("subscribe.market", {
        assets: [],
        pairs: payload.pairs ?? [],
        interval: payload.interval ?? "1m",
      });
    },
    [interval, pairs, ws],
  );

  useEffect(() => {
    if (!ws.isConnected || !wsEnabled) {
      return;
    }
    subscribeMarket({ pairs, interval: "1m" });
  }, [pairs, subscribeMarket, ws.isConnected, wsEnabled]);

  const applyPage = useCallback(
    (page: CandlesResponse, mode: "replace" | "prepend" | "merge") => {
      setBars((prev) => {
        let merged = prev;
        if (mode === "replace") {
          merged = page.candles;
        } else if (mode === "prepend") {
          merged = mergeCandleBars(page.candles, prev);
        } else {
          merged = mergeCandleBars(prev, page.candles);
        }
        return capCandleBars(merged, memoryCap);
      });
      if (mode === "prepend") {
        setHasMore(Boolean(page.has_more));
        hasMoreRef.current = Boolean(page.has_more);
      } else if (mode === "replace") {
        setHasMore(Boolean(page.has_more));
        hasMoreRef.current = Boolean(page.has_more);
      }
    },
    [memoryCap],
  );

  const loadInitial = useCallback(async () => {
    if (!pool || !candlesEnabled) {
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const page = await fetchMarketCandles({ pool, interval, limit: pageSize });
      applyPage(page, "replace");
    } catch (err: unknown) {
      setBars([]);
      setHasMore(false);
      hasMoreRef.current = false;
      setHistoryError(err instanceof Error ? err.message : "Failed to load candles");
    } finally {
      setHistoryLoading(false);
    }
  }, [applyPage, candlesEnabled, interval, pageSize, pool]);

  const loadMoreOlder = useCallback(async () => {
    if (!pool || !enabled || loadingMoreRef.current || !hasMoreRef.current) {
      return;
    }
    const before = oldestBarTime(bars);
    if (before == null) {
      return;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchMarketCandles({
        pool,
        interval,
        limit: pageSize,
        before,
      });
      applyPage(page, "prepend");
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load more candles");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [applyPage, bars, enabled, interval, pageSize, pool]);

  const refreshTail = useCallback(async () => {
    if (!pool || !enabled || interval === "1m") {
      return;
    }
    try {
      const page = await fetchLatestTail({ pool, interval });
      applyPage(page, "merge");
    } catch {
      /* tail refresh is best-effort */
    }
  }, [applyPage, enabled, interval, pool]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!enabled || interval === "1m") {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshTail();
    }, tailRefreshMs(interval));
    return () => window.clearInterval(timer);
  }, [enabled, interval, refreshTail]);

  useEffect(() => {
    if (interval !== "1m") {
      setLastTick(null);
    }
  }, [interval]);

  const history = useMemo((): CandlesResponse | null => {
    if (!pool || bars.length === 0) {
      return null;
    }
    return toCandlesResponse(pool, pool, interval, bars, {
      has_more: hasMore,
      oldest_t: oldestBarTime(bars),
      newest_t: bars.length > 0 ? bars[bars.length - 1].t : null,
    });
  }, [bars, hasMore, interval, pool]);

  const marketFresh = useMemo(() => {
    if (interval === "1m" && lastTick?.timestamp) {
      const ts =
        lastTick.timestamp > 1e12 ? lastTick.timestamp / 1000 : lastTick.timestamp;
      return Date.now() / 1000 - ts <= 120;
    }
    const newest = bars[bars.length - 1]?.t;
    if (newest == null) {
      return ws.status === "open";
    }
    return Date.now() / 1000 - newest <= intervalToSecondsSafe(interval) * 2;
  }, [bars, interval, lastTick, ws.status]);

  return {
    history,
    hasMore,
    historyLoading,
    loadingMore,
    historyError,
    lastTick: interval === "1m" ? lastTick : null,
    loadMoreOlder,
    reloadHistory: loadInitial,
    status: ws.status,
    marketFresh,
  };
}

function intervalToSecondsSafe(interval: MarketInterval): number {
  const map: Record<MarketInterval, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
  };
  return map[interval];
}

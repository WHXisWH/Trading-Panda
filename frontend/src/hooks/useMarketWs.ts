"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHubWebSocket } from "@/providers/WebSocketProvider";
import { fetchMarketCandles } from "@/lib/market/candles";
import { dedupeMarketPairs } from "@/lib/market/canonicalMarketPair";
import type {
  CandlesResponse,
  MarketInterval,
  MarketTickPayload,
  SubscribeMarketPayload,
  WsServerEvent,
} from "@/types/ws";

export type UseMarketWsOptions = {
  /** Legacy asset codes (BTC/ETH/SUI → *-USDC channels) */
  assets?: string[];
  /** DeepBook pool names for monitor ticks, e.g. DEEP/SUI */
  pairs?: string[];
  interval?: MarketInterval;
  /** Load REST history when pool is set */
  pool?: string;
  candleLimit?: number;
  enabled?: boolean;
  onTick?: (payload: MarketTickPayload) => void;
};

export function useMarketWs(options: UseMarketWsOptions = {}) {
  const {
    assets = [],
    pairs = [],
    interval = "1m",
    pool,
    candleLimit = 100,
    enabled = true,
    onTick,
  } = options;

  const { sendCommand, isConnected, status, subscribeEvents } = useHubWebSocket();
  const [lastTick, setLastTick] = useState<MarketTickPayload | null>(null);
  const [history, setHistory] = useState<CandlesResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const onTickRef = useRef(onTick);
  const marketSubKeyRef = useRef("");
  onTickRef.current = onTick;

  const normalizedPairs = useMemo(() => dedupeMarketPairs(pairs), [pairs]);
  const normalizedAssets = assets;
  const wsEnabled = enabled && (normalizedAssets.length > 0 || normalizedPairs.length > 0);

  const handleEvent = useCallback((event: WsServerEvent) => {
    if (event.event !== "market.tick") {
      return;
    }
    const payload = event.payload as MarketTickPayload;
    setLastTick(payload);
    onTickRef.current?.(payload);
  }, []);

  useEffect(() => subscribeEvents(handleEvent), [handleEvent, subscribeEvents]);

  useEffect(() => {
    if (!isConnected) {
      marketSubKeyRef.current = "";
      return;
    }
    if (!wsEnabled) {
      if (marketSubKeyRef.current) {
        marketSubKeyRef.current = "";
        sendCommand("unsubscribe.market", {});
      }
      return;
    }
    const key = `${normalizedAssets.join(",")}|${normalizedPairs.join(",")}|${interval}`;
    if (marketSubKeyRef.current === key) {
      return;
    }
    marketSubKeyRef.current = key;
    sendCommand("subscribe.market", {
      assets: normalizedAssets,
      pairs: normalizedPairs,
      interval,
    });
  }, [
    interval,
    isConnected,
    normalizedAssets,
    normalizedPairs,
    sendCommand,
    wsEnabled,
  ]);

  const subscribe = useCallback(
    (override?: SubscribeMarketPayload) => {
      const payload: SubscribeMarketPayload = {
        assets: override?.assets ?? normalizedAssets,
        pairs: override?.pairs ?? normalizedPairs,
        interval: override?.interval ?? interval,
      };
      const hasAssets = (payload.assets?.length ?? 0) > 0;
      const hasPairs = (payload.pairs?.length ?? 0) > 0;
      if (!hasAssets && !hasPairs) {
        return false;
      }
      return sendCommand("subscribe.market", {
        assets: payload.assets ?? [],
        pairs: payload.pairs ?? [],
        interval: payload.interval ?? "1m",
      });
    },
    [interval, normalizedAssets, normalizedPairs, sendCommand],
  );

  const unsubscribe = useCallback(() => {
    marketSubKeyRef.current = "";
    return sendCommand("unsubscribe.market", {});
  }, [sendCommand]);

  const reloadHistory = useCallback(() => {
    if (!pool || !enabled) {
      return Promise.resolve(null);
    }
    setHistoryLoading(true);
    setHistoryError(null);
    return fetchMarketCandles({ pool, interval, limit: candleLimit })
      .then((data) => {
        setHistory(data);
        return data;
      })
      .catch((err: unknown) => {
        setHistory(null);
        setHistoryError(err instanceof Error ? err.message : "Failed to load candles");
        return null;
      })
      .finally(() => {
        setHistoryLoading(false);
      });
  }, [candleLimit, enabled, interval, pool]);

  useEffect(() => {
    let cancelled = false;
    reloadHistory().then((data) => {
      if (cancelled || data) {
        return;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reloadHistory]);

  return {
    status,
    isConnected,
    lastTick,
    history,
    historyLoading,
    historyError,
    reloadHistory,
    subscribe,
    unsubscribe,
    sendCommand,
    disconnect: () => false,
    reconnect: () => false,
  };
}

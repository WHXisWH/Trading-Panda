"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { fetchMarketCandles } from "@/lib/market/candles";
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

  const { accessToken } = useAuth();
  const [lastTick, setLastTick] = useState<MarketTickPayload | null>(null);
  const [history, setHistory] = useState<CandlesResponse | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const handleEvent = useCallback((event: WsServerEvent) => {
    if (event.event !== "market.tick") {
      return;
    }
    const payload = event.payload as MarketTickPayload;
    setLastTick(payload);
    onTickRef.current?.(payload);
  }, []);

  const ws = useWebSocket({
    token: accessToken,
    enabled: enabled && (!!accessToken && (assets.length > 0 || pairs.length > 0)),
    onEvent: handleEvent,
  });

  const subscribe = useCallback(
    (override?: SubscribeMarketPayload) => {
      const payload: SubscribeMarketPayload = {
        assets: override?.assets ?? assets,
        pairs: override?.pairs ?? pairs,
        interval: override?.interval ?? interval,
      };
      const hasAssets = (payload.assets?.length ?? 0) > 0;
      const hasPairs = (payload.pairs?.length ?? 0) > 0;
      if (!hasAssets && !hasPairs) {
        return false;
      }
      return ws.sendCommand("subscribe.market", {
        assets: payload.assets ?? [],
        pairs: payload.pairs ?? [],
        interval: payload.interval ?? "1m",
      });
    },
    [assets, interval, pairs, ws],
  );

  const unsubscribe = useCallback(() => {
    return ws.sendCommand("unsubscribe.market", {});
  }, [ws]);

  useEffect(() => {
    if (!ws.isConnected) {
      return;
    }
    subscribe();
  }, [subscribe, ws.isConnected]);

  useEffect(() => {
    if (!pool || !enabled) {
      return;
    }
    let cancelled = false;
    setHistoryError(null);
    fetchMarketCandles({ pool, interval, limit: candleLimit })
      .then((data) => {
        if (!cancelled) {
          setHistory(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setHistoryError(err instanceof Error ? err.message : "Failed to load candles");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [candleLimit, enabled, interval, pool]);

  return {
    ...ws,
    lastTick,
    history,
    historyError,
    subscribe,
    unsubscribe,
  };
}

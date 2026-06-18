"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import type { WsConnectionStatus } from "@/types/ws";

function usePeriodicNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

interface Props {
  wsStatus?: WsConnectionStatus;
  lastTickTimestamp?: number | null;
  tickStale?: boolean;
}

/** Minimal live feed strip — kept separate from pool metric cards. */
export function MarketFeedStatus({ wsStatus, lastTickTimestamp, tickStale = false }: Props) {
  const now = usePeriodicNow(1000);
  const lastTickAgeSec =
    lastTickTimestamp != null
      ? Math.max(
          0,
          Math.floor(
            now / 1000 -
              (lastTickTimestamp > 1e12 ? lastTickTimestamp / 1000 : lastTickTimestamp),
          ),
        )
      : null;

  const isOpen = wsStatus === "open";
  const isConnecting = wsStatus === "connecting";

  let message = "Disconnected";
  if (isConnecting) {
    message = "Connecting…";
  } else if (isOpen && tickStale) {
    message = "Stale tick";
  } else if (isOpen && lastTickAgeSec != null) {
    message = `Live · ${lastTickAgeSec}s`;
  } else if (isOpen) {
    message = "Live";
  }

  return (
    <div className="chart-feed-status" role="status" aria-live="polite">
      <span
        className={clsx(
          "chart-feed-dot",
          isOpen && !tickStale && "chart-feed-dot--live",
          (tickStale || isConnecting) && "chart-feed-dot--warn",
          !isOpen && !isConnecting && "chart-feed-dot--off",
        )}
        aria-hidden
      />
      <span
        className={clsx(
          "chart-feed-text",
          isOpen && !tickStale && "chart-feed-text--live",
          (tickStale || isConnecting) && "chart-feed-text--warn",
          !isOpen && !isConnecting && "chart-feed-text--off",
        )}
      >
        {message}
      </span>
    </div>
  );
}

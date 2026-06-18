import type { MarketInterval } from "@/types/ws";

export const MARKET_INTERVALS: MarketInterval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

const INTERVAL_LABELS: Record<MarketInterval, string> = {
  "1m": "1 minute",
  "5m": "5 minutes",
  "15m": "15 minutes",
  "1h": "1 hour",
  "4h": "4 hours",
  "1d": "1 day",
};

export const MARKET_INTERVAL_OPTIONS = MARKET_INTERVALS.map((value) => ({
  value,
  label: `${value} · ${INTERVAL_LABELS[value]}`,
}));

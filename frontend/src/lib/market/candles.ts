import type { CandlesResponse, MarketInterval } from "@/types/ws";
import { CANDLES_PAGE_SIZE, CANDLES_TAIL_FETCH } from "@/lib/market/candleStore";

export async function fetchMarketCandles(params: {
  pool: string;
  interval?: MarketInterval;
  limit?: number;
  before?: number;
}): Promise<CandlesResponse> {
  const search = new URLSearchParams({
    pool: params.pool,
    interval: params.interval ?? "1m",
    limit: String(params.limit ?? CANDLES_PAGE_SIZE),
  });
  if (params.before != null) {
    search.set("before", String(params.before));
  }
  const res = await fetch(`/api/market/candles?${search.toString()}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(detail || `candles ${res.status}`);
  }
  return res.json() as Promise<CandlesResponse>;
}

export function fetchLatestTail(params: {
  pool: string;
  interval: MarketInterval;
}): Promise<CandlesResponse> {
  return fetchMarketCandles({
    pool: params.pool,
    interval: params.interval,
    limit: CANDLES_TAIL_FETCH,
  });
}

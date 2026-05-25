import type { CandlesResponse } from "@/types/ws";

export async function fetchMarketCandles(params: {
  pool: string;
  interval?: string;
  limit?: number;
}): Promise<CandlesResponse> {
  const search = new URLSearchParams({
    pool: params.pool,
    interval: params.interval ?? "1m",
    limit: String(params.limit ?? 100),
  });
  const res = await fetch(`/api/market/candles?${search.toString()}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(detail || `candles ${res.status}`);
  }
  return res.json() as Promise<CandlesResponse>;
}

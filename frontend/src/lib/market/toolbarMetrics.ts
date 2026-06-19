import type { CandlesResponse, MarketTickPayload } from "@/types/ws";

export const TOOLBAR_TAIL_POLL_MS = 15_000;
export const TOOLBAR_REF_24H_MS = 60_000;
export const TOOLBAR_POOL_STATS_MS = 15_000;

export type PriceSnapshot = {
  price?: number;
  ts?: number;
};

export function resolveTickPriceSnapshot(
  tick: MarketTickPayload | null | undefined,
): PriceSnapshot {
  const price = tick?.price ?? tick?.candle?.close;
  if (price == null || !Number.isFinite(price) || price <= 0) {
    return {};
  }
  const raw = tick?.timestamp;
  const ts =
    raw == null
      ? undefined
      : raw > 1e12
        ? Math.floor(raw / 1000)
        : Math.floor(raw);
  return { price, ts };
}

export function resolveRestLastCloseSnapshot(
  page: CandlesResponse | null | undefined,
): PriceSnapshot {
  const bar = page?.candles?.at(-1);
  if (!bar || bar.c <= 0) {
    return {};
  }
  return { price: bar.c, ts: bar.t };
}

/** Prefer the snapshot with the newest timestamp; tie-break toward REST when equal. */
export function pickNewerMarketPrice(a: PriceSnapshot, b: PriceSnapshot): number | undefined {
  if (a.price == null && b.price == null) {
    return undefined;
  }
  if (a.price != null && b.price == null) {
    return a.price;
  }
  if (a.price == null && b.price != null) {
    return b.price;
  }
  const tsA = a.ts ?? 0;
  const tsB = b.ts ?? 0;
  return tsB >= tsA ? b.price : a.price;
}

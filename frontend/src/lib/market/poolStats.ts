import { sameMarketPair } from "@/lib/market/canonicalMarketPair";
import { fetchMarketCandles } from "@/lib/market/candles";

export interface PoolMarketStats {
  volume24h: number;
  spreadBps: number;
  bidDepth: number;
  askDepth: number;
  liquidity: number;
  matchedPool?: string;
  matchedPair?: string;
}

export interface MonitorPairRow {
  pool?: string;
  pair?: string;
  base_asset?: string;
  quote_asset?: string;
  stable_quote?: boolean;
  base_decimals?: number;
  quote_decimals?: number;
  volume_24h?: number;
  spread_bps?: number;
  bid_depth?: number;
  ask_depth?: number;
}

export interface MonitorHealthPoolRow {
  pool?: string;
  spread_bps?: number;
  volume_24h?: number;
  bid_depth?: number;
  ask_depth?: number;
  base_decimals?: number;
  quote_decimals?: number;
  stable_quote?: boolean;
}

interface PairsResponse {
  pairs?: MonitorPairRow[];
}

/** Split canonical pair label into base / quote legs. */
export function parseMarketPairLegs(value: string): { base: string; quote: string } | null {
  const normalized = value.trim().replace(/_/g, "-").replace(/\//g, "-");
  const parts = normalized.split("-").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  return {
    base: parts[0].toUpperCase(),
    quote: parts.slice(1).join("-").toUpperCase(),
  };
}

/** Match UI pool label to market-monitor `/pairs` row (handles DEEP-SUI → DEEP-USDC). */
export function findMonitorPairRow(
  rows: MonitorPairRow[],
  pool: string,
): MonitorPairRow | undefined {
  const exact = rows.find(
    (item) =>
      (item.pool && sameMarketPair(item.pool, pool)) ||
      (item.pair && sameMarketPair(item.pair, pool)),
  );
  if (exact) {
    return exact;
  }

  const legs = parseMarketPairLegs(pool);
  if (!legs) {
    return undefined;
  }

  const baseMatches = rows.filter(
    (row) => (row.base_asset ?? "").toUpperCase() === legs.base,
  );
  if (baseMatches.length === 0) {
    return undefined;
  }

  const sameQuote = baseMatches.find(
    (row) => (row.quote_asset ?? "").toUpperCase() === legs.quote,
  );
  if (sameQuote) {
    return sameQuote;
  }

  const stableQuote = baseMatches.find(
    (row) => row.stable_quote || (row.quote_asset ?? "").toUpperCase() === "USDC",
  );
  if (stableQuote) {
    return stableQuote;
  }

  return [...baseMatches].sort(
    (a, b) => Number(b.volume_24h ?? 0) - Number(a.volume_24h ?? 0),
  )[0];
}

/** Exact pool label match only (no cross-pool fallback). */
export function findExactMonitorPairRow(
  rows: MonitorPairRow[],
  pool: string,
): MonitorPairRow | undefined {
  return rows.find(
    (item) =>
      (item.pool && sameMarketPair(item.pool, pool)) ||
      (item.pair && sameMarketPair(item.pair, pool)),
  );
}

function healthRowToMonitorRow(
  key: string,
  row: MonitorHealthPoolRow,
): MonitorPairRow {
  const pool = row.pool ?? key;
  const legs = parseMarketPairLegs(pool);
  return {
    pool,
    pair: pool.replace(/_/g, "-"),
    base_asset: legs?.base,
    quote_asset: legs?.quote,
    stable_quote: row.stable_quote ?? legs?.quote === "USDC",
    base_decimals: row.base_decimals,
    quote_decimals: row.quote_decimals,
    volume_24h: row.volume_24h,
    spread_bps: row.spread_bps,
    bid_depth: row.bid_depth,
    ask_depth: row.ask_depth,
  };
}

/** Merge ranked `/pairs` with broader `/health` (depth prefers exact pool). */
export function mergeMonitorRows(
  pairsRow: MonitorPairRow | undefined,
  healthRow: MonitorPairRow | undefined,
  exactPairsRow?: MonitorPairRow | undefined,
): MonitorPairRow | undefined {
  if (!pairsRow && !healthRow) {
    return undefined;
  }
  const depthRow = exactPairsRow ?? healthRow ?? pairsRow;
  return {
    pool: healthRow?.pool ?? exactPairsRow?.pool ?? pairsRow?.pool,
    pair: healthRow?.pair ?? exactPairsRow?.pair ?? pairsRow?.pair,
    base_asset: depthRow?.base_asset ?? pairsRow?.base_asset ?? healthRow?.base_asset,
    quote_asset: depthRow?.quote_asset ?? pairsRow?.quote_asset ?? healthRow?.quote_asset,
    stable_quote: depthRow?.stable_quote ?? pairsRow?.stable_quote ?? healthRow?.stable_quote,
    base_decimals: depthRow?.base_decimals ?? pairsRow?.base_decimals ?? healthRow?.base_decimals,
    quote_decimals: depthRow?.quote_decimals ?? pairsRow?.quote_decimals ?? healthRow?.quote_decimals,
    volume_24h: Number(healthRow?.volume_24h ?? pairsRow?.volume_24h ?? 0),
    spread_bps: Number(healthRow?.spread_bps ?? pairsRow?.spread_bps ?? 0),
    bid_depth: depthRow?.bid_depth ?? healthRow?.bid_depth ?? pairsRow?.bid_depth,
    ask_depth: depthRow?.ask_depth ?? healthRow?.ask_depth ?? pairsRow?.ask_depth,
  };
}

/** Match UI pool to market-monitor `/health` pools map (broader than ranked `/pairs`). */
export function findHealthPoolRow(
  pools: Record<string, MonitorHealthPoolRow>,
  pool: string,
): MonitorPairRow | undefined {
  for (const [key, row] of Object.entries(pools)) {
    if (sameMarketPair(key, pool) || (row.pool && sameMarketPair(row.pool, pool))) {
      return healthRowToMonitorRow(key, row);
    }
  }

  const legs = parseMarketPairLegs(pool);
  if (!legs) {
    return undefined;
  }

  const sameQuote = Object.entries(pools).find(([key, row]) => {
    const candidate = row.pool ?? key;
    const candidateLegs = parseMarketPairLegs(candidate);
    return (
      candidateLegs?.base === legs.base && candidateLegs?.quote === legs.quote
    );
  });
  if (sameQuote) {
    return healthRowToMonitorRow(sameQuote[0], sameQuote[1]);
  }

  const stableQuote = Object.entries(pools).find(([key, row]) => {
    const candidate = row.pool ?? key;
    const candidateLegs = parseMarketPairLegs(candidate);
    return candidateLegs?.base === legs.base && candidateLegs?.quote === "USDC";
  });
  if (stableQuote) {
    return healthRowToMonitorRow(stableQuote[0], stableQuote[1]);
  }

  return undefined;
}

function normalizeDepth(raw: number, decimals?: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  if (decimals != null && raw >= 100_000) {
    return raw / 10 ** decimals;
  }
  return raw;
}

function estimateLiquidityUsd(
  row: MonitorPairRow,
  lastPrice?: number,
): number {
  return computePoolLiquidityUsd(
    {
      bidDepth: normalizeDepth(Number(row.bid_depth ?? 0), row.base_decimals),
      askDepth: normalizeDepth(Number(row.ask_depth ?? 0), row.base_decimals),
    },
    lastPrice,
  );
}

/** Top-of-book bid + ask notional (quote terms; USDC pools ≈ USD). */
export function computePoolLiquidityUsd(
  stats: Pick<PoolMarketStats, "bidDepth" | "askDepth"> | null | undefined,
  lastPrice?: number,
): number {
  if (!stats) {
    return 0;
  }
  const tokenDepth = (stats.bidDepth ?? 0) + (stats.askDepth ?? 0);
  if (tokenDepth <= 0) {
    return 0;
  }
  if (lastPrice != null && lastPrice > 0) {
    return tokenDepth * lastPrice;
  }
  return tokenDepth;
}

export async function fetchPoolMarketStats(
  pool: string,
  lastPrice?: number,
): Promise<PoolMarketStats | null> {
  const [pairsRes, healthRes] = await Promise.all([
    fetch("/api/market/pairs", { cache: "no-store" }),
    fetch("/api/market/health", { cache: "no-store" }),
  ]);

  let pairsRow: MonitorPairRow | undefined;
  let exactPairsRow: MonitorPairRow | undefined;
  if (pairsRes.ok) {
    const data = (await pairsRes.json()) as PairsResponse;
    const rows = data.pairs ?? [];
    pairsRow = findMonitorPairRow(rows, pool);
    exactPairsRow = findExactMonitorPairRow(rows, pool);
  }

  let healthRow: MonitorPairRow | undefined;
  if (healthRes.ok) {
    const health = (await healthRes.json()) as { pools?: Record<string, MonitorHealthPoolRow> };
    healthRow = findHealthPoolRow(health.pools ?? {}, pool);
  }

  const row = mergeMonitorRows(pairsRow, healthRow, exactPairsRow);

  if (!row) {
    return null;
  }

  const bidDepth = normalizeDepth(Number(row.bid_depth ?? 0), row.base_decimals);
  const askDepth = normalizeDepth(Number(row.ask_depth ?? 0), row.base_decimals);
  return {
    volume24h: Number(row.volume_24h ?? 0),
    spreadBps: Number(row.spread_bps ?? 0),
    bidDepth,
    askDepth,
    liquidity: estimateLiquidityUsd(row, lastPrice),
    matchedPool: row.pool,
    matchedPair: row.pair,
  };
}

/** Oldest hourly close in the last 24 bars (~24h reference). */
export async function fetchMarket24hReferenceClose(pool: string): Promise<number | null> {
  const page = await fetchMarketCandles({ pool, interval: "1h", limit: 24 });
  const refClose = page.candles[0]?.c;
  if (refClose == null || refClose <= 0) {
    return null;
  }
  return refClose;
}

export function computeMarket24hChange(
  currentPrice: number | undefined,
  referenceClose: number | null | undefined,
): number | null {
  if (
    currentPrice == null ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    referenceClose == null ||
    referenceClose <= 0
  ) {
    return null;
  }
  return ((currentPrice - referenceClose) / referenceClose) * 100;
}

export function formatCompactUsd(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

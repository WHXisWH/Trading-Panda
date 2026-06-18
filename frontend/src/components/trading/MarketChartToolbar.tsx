"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import { CircleHelp } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  computePoolLiquidityUsd,
  formatCompactUsd,
  type PoolMarketStats,
} from "@/lib/market/poolStats";

function resolveChangeTone(pct: number | null | undefined): MetricTone {
  if (pct == null || !Number.isFinite(pct)) {
    return "muted";
  }
  if (pct > 0) {
    return "up";
  }
  if (pct < 0) {
    return "down";
  }
  return "muted";
}

function formatChangePct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function formatPrice(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  if (Math.abs(value) < 1) {
    return value.toPrecision(5);
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

type MetricTone = "price" | "volume" | "liquidity" | "spread" | "up" | "down" | "muted";

interface MetricProps {
  label: string;
  value: string;
  hint: string;
  tone?: MetricTone;
}

const VALUE_TONE_CLASS: Record<MetricTone, string> = {
  price: "chart-metric-value--price",
  volume: "chart-metric-value--volume",
  liquidity: "chart-metric-value--liquidity",
  spread: "chart-metric-value--spread",
  up: "chart-metric-value--up",
  down: "chart-metric-value--down",
  muted: "chart-metric-value--muted",
};

function MetricCell({ label, value, hint, tone = "price" }: MetricProps) {
  return (
    <div className="chart-metric-cell">
      <div className="chart-metric-head">
        <p className="chart-metric-label">{label}</p>
        <Tooltip
          content={hint}
          side="top"
          align="start"
          className="chart-metric-tooltip"
        >
          <button
            type="button"
            className="chart-metric-help"
            aria-label={`About ${label}`}
          >
            <CircleHelp size={13} strokeWidth={2.25} aria-hidden />
          </button>
        </Tooltip>
      </div>
      <p className={clsx("chart-metric-value", VALUE_TONE_CLASS[tone])}>{value}</p>
    </div>
  );
}

export interface MarketChartToolbarProps {
  lastPrice?: number;
  change24hPct?: number | null;
  poolStats?: PoolMarketStats | null;
  poolStatsLoading?: boolean;
}

export function MarketChartToolbar({
  lastPrice,
  change24hPct,
  poolStats,
  poolStatsLoading = false,
}: MarketChartToolbarProps) {
  const changeKnown = change24hPct != null && Number.isFinite(change24hPct);
  const changeTone = resolveChangeTone(change24hPct);

  const liquidityUsd = useMemo(
    () => computePoolLiquidityUsd(poolStats, lastPrice),
    [lastPrice, poolStats],
  );

  const volValue = poolStatsLoading ? "…" : formatCompactUsd(poolStats?.volume24h);
  const liqValue =
    poolStatsLoading ? "…" : liquidityUsd > 0 ? formatCompactUsd(liquidityUsd) : "—";
  const spreadValue =
    poolStatsLoading
      ? "…"
      : poolStats?.spreadBps != null && poolStats.spreadBps > 0 && poolStats.spreadBps < 9999
        ? `${poolStats.spreadBps.toFixed(1)} bps`
        : "—";

  const hasVol = !poolStatsLoading && (poolStats?.volume24h ?? 0) > 0;
  const hasLiq = !poolStatsLoading && liquidityUsd > 0;
  const hasSpread = spreadValue !== "—" && spreadValue !== "…";

  return (
    <div className="chart-metric-rail">
      <MetricCell
        label="Last"
        value={formatPrice(lastPrice)}
        hint="Last DeepBook trade price for this pool."
        tone="price"
      />
      <MetricCell
        label="24h"
        value={changeKnown ? formatChangePct(change24hPct!) : "—"}
        hint="Change versus ~24 hours ago (hourly candles)."
        tone={changeTone}
      />
      <MetricCell
        label="24h Vol"
        value={volValue}
        hint="Quote notional traded on DeepBook in the last 24 hours."
        tone={hasVol ? "volume" : "muted"}
      />
      <MetricCell
        label="Liquidity"
        value={liqValue}
        hint="Estimated bid + ask depth near top of book."
        tone={hasLiq ? "liquidity" : "muted"}
      />
      <MetricCell
        label="Spread"
        value={spreadValue}
        hint="Top-of-book spread in basis points."
        tone={hasSpread ? "spread" : "muted"}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { CandlestickChart } from "@/components/trading/CandlestickChart";
import { Select } from "@/components/ui/Select";
import { MARKET_INTERVAL_OPTIONS } from "@/lib/market/chartIntervals";
import { agentWalletSetupPath } from "@/lib/ui/routeJump";
import type { MarketInterval } from "@/types/ws";

type ChartProps = ComponentProps<typeof CandlestickChart>;

interface Props extends ChartProps {
  pandaId?: string;
  authorizedPools?: string[];
}

/** Training Ledger chart panel — pool + interval selectors above K-line. */
export function MarketChartPanel({
  pandaId,
  authorizedPools = [],
  pool,
  onPoolChange,
  interval = "1m",
  onIntervalChange,
  ...chartProps
}: Props) {
  const hasPools = authorizedPools.length > 0;

  return (
    <div className="space-y-2">
      <div className="ledger-chart-toolbar">
        <div className="ledger-chart-toolbar-group">
          <span className="ledger-chart-toolbar-label">Pool</span>
          {hasPools ? (
            <Select
              size="sm"
              aria-label="Trading pool"
              className="ledger-chart-select w-auto font-mono"
              value={pool}
              disabled={authorizedPools.length <= 1}
              onValueChange={(value) => onPoolChange?.(value)}
              options={authorizedPools.map((pair) => ({ value: pair, label: pair }))}
            />
          ) : (
            <span className="text-[11px] text-product-amber">No pairs configured yet</span>
          )}
        </div>

        <span className="ledger-chart-toolbar-divider" aria-hidden />

        <div className="ledger-chart-toolbar-group">
          <span className="ledger-chart-toolbar-label">Interval</span>
          <Select
            size="sm"
            aria-label="Candle interval"
            className="ledger-chart-select w-auto font-mono"
            value={interval}
            onValueChange={(value) => onIntervalChange?.(value as MarketInterval)}
            options={MARKET_INTERVAL_OPTIONS}
          />
        </div>

        {!hasPools && pandaId ? (
          <Link
            href={agentWalletSetupPath(pandaId)}
            className="ml-auto text-[11px] font-medium text-product-gold underline-offset-2 hover:underline"
          >
            Configure in Agent Wallet →
          </Link>
        ) : null}
      </div>

      <div className="ledger-surface overflow-hidden p-0">
        <CandlestickChart
          variant="product"
          pool={pool}
          onPoolChange={onPoolChange}
          interval={interval}
          onIntervalChange={onIntervalChange}
          showPoolSelector={false}
          showIntervalSelector={false}
          {...chartProps}
        />
      </div>
    </div>
  );
}

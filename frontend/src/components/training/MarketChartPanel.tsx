"use client";

import type { ComponentProps } from "react";
import { CandlestickChart } from "@/components/trading/CandlestickChart";

type Props = ComponentProps<typeof CandlestickChart>;

/** Training Ledger chart panel — wraps shared CandlestickChart with cockpit chrome. */
export function MarketChartPanel(props: Props) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-2">
      <CandlestickChart {...props} />
    </div>
  );
}

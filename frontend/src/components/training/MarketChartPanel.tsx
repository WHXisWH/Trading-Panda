"use client";

import type { ComponentProps } from "react";
import { CandlestickChart } from "@/components/trading/CandlestickChart";

type Props = ComponentProps<typeof CandlestickChart>;

/** Training Ledger chart panel — cockpit chrome with product visual system. */
export function MarketChartPanel(props: Props) {
  return (
    <div className="ledger-surface overflow-hidden p-0">
      <CandlestickChart variant="product" {...props} />
    </div>
  );
}

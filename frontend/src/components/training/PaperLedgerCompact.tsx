"use client";

import { clsx } from "clsx";
import type { TrainingLedgerState } from "@/services/training.service";

interface Props {
  ledger?: TrainingLedgerState;
  equity?: number;
  initialCapital?: number;
}

export function PaperLedgerCompact({ ledger, equity, initialCapital = 10_000 }: Props) {
  const cash = ledger?.cash_balance ?? 0;
  const eq = equity ?? ledger?.equity ?? initialCapital;
  const realized = ledger?.realized_pnl ?? 0;
  const unrealized = ledger?.unrealized_pnl ?? 0;
  const positions = ledger?.positions ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Equity" value={`$${eq.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <Metric label="Cash" value={`$${cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <Metric
          label="Realized"
          value={`${realized >= 0 ? "+" : ""}${realized.toFixed(2)}`}
          tone={realized >= 0 ? "up" : "down"}
        />
        <Metric
          label="Unrealized"
          value={`${unrealized >= 0 ? "+" : ""}${unrealized.toFixed(2)}`}
          tone={unrealized >= 0 ? "up" : "down"}
        />
      </div>
      {positions.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-product-muted">
          {positions.map((p) => `${p.asset} × ${p.quantity.toFixed(4)}`).join(" · ")}
        </p>
      ) : (
        <p className="text-[11px] text-product-muted">No open positions</p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="ledger-metric-cell">
      <div className="product-field-label">{label}</div>
      <div
        className={clsx(
          "mt-1 font-mono text-sm font-bold",
          tone === "up" && "text-product-green",
          tone === "down" && "text-product-red",
          !tone && "text-product-text",
        )}
      >
        {value}
      </div>
    </div>
  );
}

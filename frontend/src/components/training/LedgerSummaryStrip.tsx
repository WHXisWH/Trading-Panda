"use client";

import type { TrainingLedgerState } from "@/services/training.service";

interface Props {
  ledger?: TrainingLedgerState;
  equity?: number;
  initialCapital?: number;
}

export function LedgerSummaryStrip({ ledger, equity, initialCapital = 10_000 }: Props) {
  const cash = ledger?.cash_balance ?? 0;
  const eq = equity ?? ledger?.equity ?? initialCapital;
  const realized = ledger?.realized_pnl ?? 0;
  const unrealized = ledger?.unrealized_pnl ?? 0;
  const positions = ledger?.positions ?? [];

  return (
    <div className="product-panel p-4">
      <p className="product-field-label">Paper ledger</p>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-2">
        <Metric label="Equity" value={`$${eq.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <Metric label="Cash" value={`$${cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <Metric
          label="Realized PnL"
          value={`${realized >= 0 ? "+" : ""}${realized.toFixed(2)}`}
          tone={realized >= 0 ? "up" : "down"}
        />
        <Metric
          label="Unrealized PnL"
          value={`${unrealized >= 0 ? "+" : ""}${unrealized.toFixed(2)}`}
          tone={unrealized >= 0 ? "up" : "down"}
        />
      </div>
      {positions.length > 0 ? (
        <p className="mt-3 text-[11px] text-product-muted">
          Positions:{" "}
          {positions.map((p) => `${p.asset} × ${p.quantity.toFixed(4)}`).join(" · ")}
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-product-muted">No open positions</p>
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
    <div className="rounded-xl border border-product-line/60 bg-black/20 px-3 py-2">
      <div className="product-field-label">{label}</div>
      <div
        className={
          tone === "up"
            ? "mt-1 font-mono text-sm font-bold text-product-green"
            : tone === "down"
              ? "mt-1 font-mono text-sm font-bold text-product-red"
              : "mt-1 font-mono text-sm font-bold text-product-text"
        }
      >
        {value}
      </div>
    </div>
  );
}

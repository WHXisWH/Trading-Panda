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
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--color-border)] bg-paper-card p-4 md:grid-cols-4">
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
      {positions.length > 0 ? (
        <div className="col-span-full text-[12px] text-neutral-600">
          Positions:{" "}
          {positions
            .map((p) => `${p.asset} × ${p.quantity.toFixed(4)}`)
            .join(" · ")}
        </div>
      ) : null}
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
    <div>
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div
        className={
          tone === "up"
            ? "text-emerald-600 font-semibold"
            : tone === "down"
              ? "text-red-600 font-semibold"
              : "font-semibold text-neutral-900"
        }
      >
        {value}
      </div>
    </div>
  );
}

"use client";

import { clsx } from "clsx";
import type { TrainingLedgerState } from "@/services/training.service";

interface Props {
  ledger?: TrainingLedgerState;
  equity?: number;
  initialCapital?: number;
}

export function PaperLedgerHeaderMetrics({ ledger, equity, initialCapital = 10_000 }: Props) {
  const cash = ledger?.cash_balance ?? 0;
  const eq = equity ?? ledger?.equity ?? initialCapital;
  const realized = ledger?.realized_pnl ?? 0;
  const unrealized = ledger?.unrealized_pnl ?? 0;
  const positions = ledger?.positions ?? [];

  const positionLabel =
    positions.length > 0
      ? positions.map((p) => `${p.asset} × ${p.quantity.toFixed(4)}`).join(" · ")
      : "Flat";

  return (
    <div className="ledger-header-metrics" aria-label="Paper ledger summary">
      <div className="ledger-header-metrics-grid">
        <Metric label="Equity" value={`$${formatMoney(eq)}`} emphasis />
        <Metric label="Cash" value={`$${formatMoney(cash)}`} />
        <Metric
          label="Realized"
          value={formatSigned(realized)}
          tone={realized >= 0 ? "up" : "down"}
        />
        <Metric
          label="Unrealized"
          value={formatSigned(unrealized)}
          tone={unrealized >= 0 ? "up" : "down"}
        />
      </div>
      <p className="ledger-header-positions" title={positionLabel}>
        {positionLabel}
      </p>
    </div>
  );
}

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatSigned(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${formatMoney(Math.abs(value))}`;
}

function Metric({
  label,
  value,
  tone,
  emphasis = false,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  emphasis?: boolean;
}) {
  return (
    <div className="ledger-header-metric">
      <span className="ledger-header-metric-label">{label}</span>
      <span
        className={clsx(
          "ledger-header-metric-value",
          emphasis && "ledger-header-metric-value--emphasis",
          tone === "up" && "text-product-green",
          tone === "down" && "text-product-red",
        )}
      >
        {value}
      </span>
    </div>
  );
}

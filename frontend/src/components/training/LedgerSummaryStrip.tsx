"use client";

import { clsx } from "clsx";
import type { TrainingLedgerState } from "@/services/training.service";
import type { OrderIntentApi } from "@/types/autonomous-wallet";

interface Props {
  ledger?: TrainingLedgerState;
  equity?: number;
  initialCapital?: number;
  lastIntent?: OrderIntentApi | null;
  skillVersion?: number;
}

export function LedgerSummaryStrip({
  ledger,
  equity,
  initialCapital = 10_000,
  lastIntent,
  skillVersion = 0,
}: Props) {
  const cash = ledger?.cash_balance ?? 0;
  const eq = equity ?? ledger?.equity ?? initialCapital;
  const realized = ledger?.realized_pnl ?? 0;
  const unrealized = ledger?.unrealized_pnl ?? 0;
  const positions = ledger?.positions ?? [];
  const intentSide = lastIntent?.side ?? "—";
  const intentStatus = lastIntent?.status ?? "—";

  return (
    <div className="ledger-surface p-4">
      <p className="ledger-step-label">Paper ledger</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
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

      <div className="mt-4 border-t border-product-line/40 pt-4">
        <p className="ledger-step-label">Panda Agent</p>
        <dl className="mt-3 space-y-0">
          <AgentRow label="Skill version" value={String(skillVersion)} />
          <AgentRow
            label="Latest intent"
            value={intentSide}
            valueClass={intentSide === "HOLD" ? "text-product-muted" : "text-product-gold"}
          />
          <AgentRow
            label="Intent status"
            value={intentStatus}
            valueClass={clsx(
              intentStatus === "EXECUTED" && "text-product-green",
              intentStatus === "REJECTED" && "text-product-red",
            )}
          />
        </dl>
      </div>
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

function AgentRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="product-metric-row">
      <span>{label}</span>
      <strong className={valueClass}>{value}</strong>
    </div>
  );
}

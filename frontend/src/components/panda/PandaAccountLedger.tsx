"use client";

import { useState } from "react";
import type { AccountPanelSnapshot } from "@/components/trading/AccountPanel";

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

interface Props {
  snapshot: AccountPanelSnapshot;
}

export function PandaAccountLedger({ snapshot }: Props) {
  const [expanded, setExpanded] = useState(false);
  const {
    equity,
    initialCapital,
    positions,
    tradeCount,
    pool,
    lastPrice,
    training,
  } = snapshot;

  const pnl = equity - initialCapital;
  const pnlPct = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0;
  const isProfit = pnl >= 0;

  const positionKey = Object.keys(positions).find(
    (k) => k === pool || pool.startsWith(k) || k.startsWith(pool.split("/")[0] ?? ""),
  );
  const qty = positionKey ? positions[positionKey] : 0;
  const positionLabel =
    qty > 0
      ? `${qty < 0.0001 ? qty.toExponential(2) : qty.toFixed(4)}`
      : "—";

  const entryHint =
    lastPrice != null && qty > 0
      ? `@ ${lastPrice < 1 ? lastPrice.toPrecision(4) : lastPrice.toFixed(2)}`
      : "—";

  const positionPct =
    equity > 0 && lastPrice != null && qty > 0
      ? `${((qty * lastPrice) / equity) * 100}%`
      : "—";

  return (
    <section className="border-t border-[var(--color-border)] pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium text-neutral-500">训练账本账户</h3>
        <span className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              training ? "bg-primary-500" : "bg-neutral-300"
            }`}
            aria-hidden
          />
          {training ? "训练中" : "未训练"}
        </span>
      </div>

      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-neutral-500">权益</span>
        <div className="text-right">
          <p className="font-mono text-[16px] font-semibold leading-tight">
            {formatUsd(equity)}
          </p>
          <p
            className={`font-mono text-[11px] font-medium ${
              isProfit ? "text-primary-500" : "text-red-600"
            }`}
          >
            {isProfit ? "+" : ""}
            {formatUsd(pnl)} ({isProfit ? "+" : ""}
            {pnlPct.toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="space-y-1.5 text-[12px]">
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">持仓 ({pool})</span>
          <span className="min-w-0 truncate text-right font-mono">
            {positionLabel}
            {qty > 0 && entryHint !== "—" ? (
              <span className="text-neutral-500"> {entryHint}</span>
            ) : null}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">成交笔数</span>
          <span className="font-mono">{tradeCount}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-[11px] text-primary-500 hover:underline"
      >
        {expanded ? "收起详情 ▲" : "展开详情 ▼"}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 border-t border-[var(--color-border)] pt-2 text-[12px]">
          <div className="flex justify-between">
            <span className="text-neutral-500">初始资金</span>
            <span className="font-mono text-neutral-500">{formatUsd(initialCapital)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">参考价</span>
            <span className="font-mono text-neutral-500">{entryHint}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">仓位占比</span>
            <span>{positionPct}</span>
          </div>
        </div>
      )}
    </section>
  );
}

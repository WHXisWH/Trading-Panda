"use client";

import { clsx } from "clsx";
import type { TradeRecordApi } from "@/types/trading";
import type { DecisionLog } from "@/types/trading";

function formatTradeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function actionLabel(action: string): string {
  if (action === "BUY") return "买入";
  if (action === "SELL") return "卖出";
  return action;
}

export function tradeToDecisionLog(trade: TradeRecordApi): DecisionLog {
  return {
    timestamp: trade.created_at,
    action: trade.action,
    final_score: trade.final_score,
    zone: trade.decision_details?.zone ?? "EXECUTE",
    asset: trade.asset,
    price: trade.price,
    steps: trade.decision_details?.steps ?? [],
    entry_threshold: trade.decision_details?.entry_threshold,
  };
}

interface Props {
  items: TradeRecordApi[];
  selectedId?: string | null;
  onSelect?: (trade: TradeRecordApi) => void;
  loading?: boolean;
  className?: string;
  embedded?: boolean;
}

export function TradeHistory({
  items,
  selectedId,
  onSelect,
  loading,
  className,
  embedded = false,
}: Props) {
  return (
    <section
      className={clsx(
        "flex min-h-0 flex-col",
        !embedded && "border-t border-[var(--color-border)] pt-3",
        className,
      )}
    >
      <h3 className="text-[13px] font-semibold">交易历史</h3>
      {loading && <p className="mt-1 text-[10px] text-ink-500">加载中…</p>}
      {!loading && items.length === 0 && (
        <p className="mt-1 text-[10px] text-ink-500">尚无成交记录</p>
      )}
      <ul
        className={clsx(
          "mt-2 space-y-1 overflow-y-auto text-[11px]",
          embedded ? "min-h-0 flex-1" : "max-h-[min(240px,35vh)]",
        )}
      >
        {items.map((item) => {
          const selected = selectedId === item.id;
          const pnl = item.pnl_pct;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect?.(item)}
                className={clsx(
                  "flex w-full flex-wrap items-center justify-between gap-1 rounded px-2 py-1.5 text-left",
                  selected ? "bg-bamboo-50 ring-1 ring-bamboo-500" : "hover:bg-paper-card",
                )}
              >
                <span className="text-ink-500">{formatTradeTime(item.created_at)}</span>
                <span
                  className={clsx(
                    "font-medium",
                    item.action === "BUY" ? "text-profit" : "text-loss",
                  )}
                >
                  {actionLabel(item.action)}
                </span>
                <span className="font-mono text-[10px] text-ink-500">
                  @{item.price < 1 ? item.price.toPrecision(4) : item.price.toFixed(2)}
                </span>
                {pnl != null && (
                  <span className={pnl >= 0 ? "text-profit" : "text-loss"}>
                    {(pnl * 100).toFixed(2)}%
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

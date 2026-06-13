"use client";

import { useMemo, useState } from "react";
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

function formatTradePrice(price: number): string {
  return price < 1 ? price.toPrecision(4) : price.toFixed(2);
}

function formatQuantity(quantity: number): string {
  return quantity < 1 ? quantity.toPrecision(3) : quantity.toFixed(2);
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

type TradeFilter = "all" | "buy" | "sell" | "win" | "loss";

const FILTERS: { key: TradeFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "buy", label: "买入" },
  { key: "sell", label: "卖出" },
  { key: "win", label: "盈利" },
  { key: "loss", label: "亏损" },
];

function matchesFilter(trade: TradeRecordApi, filter: TradeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "buy") return trade.action === "BUY";
  if (filter === "sell") return trade.action === "SELL";
  if (filter === "win") return trade.pnl_pct != null && trade.pnl_pct > 0;
  return trade.pnl_pct != null && trade.pnl_pct < 0;
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
  const [filter, setFilter] = useState<TradeFilter>("all");

  const filtered = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter],
  );

  const showFilters = items.length > 0;

  return (
    <section
      className={clsx(
        "flex min-h-0 flex-col",
        !embedded && "border-t border-[var(--color-border)] pt-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold">交易历史</h3>
        {showFilters && (
          <div className="flex overflow-hidden rounded border border-[var(--color-border)] bg-white">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={clsx(
                  "px-1.5 py-0.5 text-[10px] transition-colors",
                  filter === f.key
                    ? "bg-primary-500 text-white"
                    : "text-neutral-500 hover:bg-primary-50",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="mt-1 text-[10px] text-neutral-500">加载中…</p>}
      {!loading && items.length === 0 && (
        <p className="mt-1 text-[10px] text-neutral-500">
          尚无成交记录 — 开始训练后熊猫的成交会出现在这里
        </p>
      )}
      {!loading && items.length > 0 && filtered.length === 0 && (
        <p className="mt-1 text-[10px] text-neutral-500">当前筛选下没有匹配记录</p>
      )}

      <ul
        className={clsx(
          "mt-2 space-y-1 overflow-y-auto text-[11px]",
          embedded ? "min-h-0 flex-1" : "max-h-[min(240px,35vh)]",
        )}
      >
        {filtered.map((item) => {
          const selected = selectedId === item.id;
          const pnl = item.pnl_pct;
          const isBuy = item.action === "BUY";
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect?.(item)}
                className={clsx(
                  "w-full rounded px-2 py-1.5 text-left",
                  selected ? "bg-primary-50 ring-1 ring-primary-500" : "hover:bg-neutral-100",
                )}
              >
                <span className="flex flex-wrap items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={clsx(
                        "rounded px-1 py-px text-[9px] font-semibold",
                        isBuy
                          ? "bg-primary-50 text-profit"
                          : "bg-[var(--color-seal-bg)] text-loss",
                      )}
                    >
                      {actionLabel(item.action)}
                    </span>
                    <span className="font-mono text-[10px] text-ink-700">{item.asset}</span>
                    <span className="text-[10px] text-neutral-500">
                      {formatTradeTime(item.created_at)}
                    </span>
                  </span>
                  {pnl != null ? (
                    <span
                      className={clsx(
                        "font-mono font-medium",
                        pnl >= 0 ? "text-profit" : "text-loss",
                      )}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {(pnl * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink-400">持仓中</span>
                  )}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center justify-between gap-1 text-[10px] text-neutral-500">
                  <span className="font-mono">
                    @{formatTradePrice(item.price)} × {formatQuantity(item.quantity)}
                  </span>
                  <span className="font-mono">决策分 {item.final_score.toFixed(2)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

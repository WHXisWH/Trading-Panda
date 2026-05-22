"use client";

import { clsx } from "clsx";
import type { TradingPool } from "@/lib/mockData";

interface Props {
  pool: TradingPool;
  selected: boolean;
  onToggle: () => void;
}

export function PoolListItem({ pool, selected, onToggle }: Props) {
  const up = pool.change24h >= 0;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        "flex w-full min-h-[72px] flex-wrap items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-colors",
        selected
          ? "border-bamboo-500 bg-bamboo-50"
          : "border-[var(--color-border)] bg-white hover:border-bamboo-500/50"
      )}
    >
      <span
        className={clsx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs",
          selected
            ? "border-bamboo-500 bg-bamboo-500 text-white"
            : "border-[var(--color-text-placeholder)]"
        )}
      >
        {selected ? "✓" : ""}
      </span>

      <div className="min-w-[140px] flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[15px]">{pool.name}</span>
          {pool.recommended && (
            <span className="rounded bg-bamboo-500 px-1.5 py-0.5 text-[10px] text-white">
              🏷️ 推荐
            </span>
          )}
        </div>
        <p className="text-[11px] text-ink-500">{pool.description}</p>
      </div>

      <div className="text-center text-[12px]">
        <p>
          流动性 <span className="font-medium">{pool.liquidity}</span>
        </p>
        <p className="text-ink-500">24h {pool.volume24h}</p>
        {pool.fee && <p className="text-[10px] text-ink-500">费率 {pool.fee}</p>}
      </div>

      <div className="text-center">
        <p className="font-mono text-[15px] font-semibold">{pool.price}</p>
        <p className={clsx("text-[12px] font-medium", up ? "text-profit" : "text-loss")}>
          {up ? "+" : ""}
          {pool.change24h}% {up ? "🟢" : "🔴"}
        </p>
      </div>
    </button>
  );
}

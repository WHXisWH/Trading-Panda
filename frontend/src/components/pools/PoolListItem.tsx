"use client";

import { clsx } from "clsx";
import type { PoolCatalogItem } from "@/types/pools";

interface Props {
  pool: PoolCatalogItem;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function PoolListItem({ pool, selected, disabled, onToggle }: Props) {
  const up = (pool.change24h ?? 0) >= 0;
  const statusLabel =
    pool.status === "online"
      ? "🟢 行情正常"
      : pool.status === "degraded"
        ? "🟡 数据延迟"
        : "⚪ 等待行情";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled && !selected}
      className={clsx(
        "flex w-full min-h-[72px] flex-wrap items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-colors",
        selected
          ? "border-primary-500 bg-primary-50"
          : "border-[var(--color-border)] bg-white hover:border-primary-500/50",
        disabled && !selected && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={clsx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs",
          selected
            ? "border-primary-500 bg-primary-500 text-white"
            : "border-[var(--color-text-placeholder)]",
        )}
      >
        {selected ? "✓" : ""}
      </span>

      <div className="min-w-[140px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold">{pool.name}</span>
          {pool.recommended && (
            <span className="rounded bg-primary-500 px-1.5 py-0.5 text-[10px] text-white">
              推荐
            </span>
          )}
          <span className="text-[10px] text-neutral-500">{statusLabel}</span>
        </div>
        <p className="text-[11px] text-neutral-500">{pool.description}</p>
        {pool.healthError && (
          <p className="text-[10px] text-red-600">{pool.healthError}</p>
        )}
      </div>

      <div className="text-center text-[12px]">
        <p>
          来源 <span className="font-medium">{pool.liquidity ?? "DeepBook"}</span>
        </p>
        <p className="text-neutral-500">成交量 {pool.volume24h ?? "—"}</p>
      </div>

      <div className="text-center">
        <p className="font-mono text-[15px] font-semibold">{pool.price ?? "—"}</p>
        {pool.change24h != null && pool.price !== "—" && (
          <p className={clsx("text-[12px] font-medium", up ? "text-primary-500" : "text-red-600")}>
            {up ? "+" : ""}
            {pool.change24h.toFixed(2)}% 区间
          </p>
        )}
      </div>
    </button>
  );
}

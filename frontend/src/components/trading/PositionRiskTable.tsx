"use client";

import { clsx } from "clsx";
import { formatUsd, formatQty } from "@/lib/trading/performanceMetrics";

interface Props {
  positions: Record<string, number>;
  equity: number;
  lastPrice?: number;
  className?: string;
}

export function PositionRiskTable({
  positions,
  equity,
  lastPrice,
  className,
}: Props) {
  const rows = Object.entries(positions).filter(([, qty]) => qty > 0);
  const totalNotional = rows.reduce((sum, [, qty]) => {
    return sum + (lastPrice ? qty * lastPrice : 0);
  }, 0);
  const exposurePct = equity > 0 && totalNotional > 0 ? (totalNotional / equity) * 100 : 0;

  if (rows.length === 0) {
    return (
      <div className={clsx("p-4", className)}>
        <div className="rounded-lg bg-paper-card px-4 py-6 text-center">
          <p className="text-[13px] font-medium text-ink-700">空仓</p>
          <p className="mt-1 text-[11px] text-ink-500">
            训练开始后，成交会更新这里的资产数量和仓位占比
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("p-3", className)}>
      {/* Exposure summary */}
      <div className="mb-3 flex items-center gap-4 rounded-lg bg-paper-card px-3 py-2 text-[11px]">
        <div>
          <span className="text-ink-500">总持仓价值 </span>
          <span className="font-mono font-semibold text-ink-900">
            {lastPrice ? formatUsd(totalNotional) : "--"}
          </span>
        </div>
        <div>
          <span className="text-ink-500">风险敞口 </span>
          <span
            className={clsx(
              "font-mono font-semibold",
              exposurePct > 50 ? "text-loss" : "text-ink-900",
            )}
          >
            {exposurePct > 0 ? `${exposurePct.toFixed(1)}%` : "--"}
          </span>
        </div>
        <div>
          <span className="text-ink-500">持仓数 </span>
          <span className="font-mono font-semibold text-ink-900">{rows.length}</span>
        </div>
      </div>

      {/* Position table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[10px] uppercase text-ink-500">
              <th className="px-2 py-2 font-medium">资产</th>
              <th className="px-2 py-2 font-medium text-right">数量</th>
              <th className="px-2 py-2 font-medium text-right">参考价</th>
              <th className="px-2 py-2 font-medium text-right">名义价值</th>
              <th className="px-2 py-2 font-medium text-right">仓位占比</th>
              <th className="px-2 py-2 font-medium text-right">风险</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([asset, qty]) => {
              const notional = lastPrice ? qty * lastPrice : 0;
              const pct = equity > 0 && notional > 0 ? (notional / equity) * 100 : 0;
              const riskLevel = pct > 30 ? "high" : pct > 15 ? "medium" : "low";

              return (
                <tr
                  key={asset}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="px-2 py-2.5">
                    <span className="font-mono font-semibold text-ink-900">{asset}</span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-ink-700">
                    {formatQty(qty)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-ink-500">
                    {lastPrice ? lastPrice.toPrecision(6) : "--"}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-ink-700">
                    {notional > 0 ? formatUsd(notional) : "--"}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-ink-700">
                    {pct > 0 ? `${pct.toFixed(1)}%` : "--"}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <span
                      className={clsx(
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                        riskLevel === "high" && "bg-red-50 text-red-600",
                        riskLevel === "medium" && "bg-yellow-50 text-yellow-700",
                        riskLevel === "low" && "bg-bamboo-50 text-bamboo-700",
                      )}
                    >
                      {riskLevel === "high" ? "高" : riskLevel === "medium" ? "中" : "低"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

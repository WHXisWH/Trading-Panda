import { clsx } from "clsx";
import type { Position } from "@/lib/mockData";

interface Props {
  positions: Position[];
}

export function PositionList({ positions }: Props) {
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-semibold">📦 持仓</h3>
      {positions.map((pos) => {
        const profit = pos.pnl >= 0;
        return (
          <div
            key={pos.asset}
            className={clsx(
              "rounded-lg p-3 text-[13px]",
              profit ? "bg-bamboo-50" : "bg-red-50"
            )}
          >
            <div className="flex justify-between font-medium">
              <span>{pos.asset}</span>
              <span className="text-[11px] text-ink-500">{pos.side}</span>
            </div>
            <p className="font-mono text-[12px]">{pos.quantity}</p>
            <p
              className={clsx(
                "text-lg font-bold",
                profit ? "text-profit" : "text-loss"
              )}
            >
              {profit ? "+" : ""}${Math.abs(pos.pnl)} {profit ? "🟢" : "🔴"}
            </p>
            <p className={clsx("text-[11px]", profit ? "text-profit" : "text-loss")}>
              {profit ? "+" : ""}
              {pos.pnlPct}%
            </p>
            <p className="text-[11px] text-ink-500">{pos.entryPrice}</p>
          </div>
        );
      })}
      <div className="rounded-lg border border-[var(--color-border)] p-2 text-center">
        <span className="text-[11px] text-ink-500">总盈亏 </span>
        <span className={clsx("font-bold", totalPnl >= 0 ? "text-profit" : "text-loss")}>
          {totalPnl >= 0 ? "+" : ""}${totalPnl} {totalPnl >= 0 ? "🟢" : "🔴"}
        </span>
      </div>
    </div>
  );
}

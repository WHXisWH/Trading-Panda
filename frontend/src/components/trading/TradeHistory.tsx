import type { TradeHistoryItem } from "@/lib/mockData";
import { clsx } from "clsx";

interface Props {
  items: TradeHistoryItem[];
}

export function TradeHistory({ items }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-[15px] font-semibold">📋 交易历史</h3>
      <ul className="max-h-48 space-y-1 overflow-y-auto text-[12px]">
        {items.map((item, i) => (
          <li
            key={`${item.time}-${i}`}
            className="flex justify-between rounded px-2 py-1 hover:bg-paper-card"
          >
            <span className="text-ink-500">{item.time}</span>
            <span
              className={clsx(
                "font-medium",
                item.action === "买入" ? "text-profit" : "text-loss"
              )}
            >
              {item.action}
            </span>
            <span className="font-mono text-[11px]">{item.quantity}</span>
            {item.pnl && (
              <span className={item.pnl.startsWith("+") ? "text-profit" : "text-loss"}>
                {item.pnl}
              </span>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="text-[11px] text-bamboo-500 hover:underline">
        查看更多 →
      </button>
    </div>
  );
}

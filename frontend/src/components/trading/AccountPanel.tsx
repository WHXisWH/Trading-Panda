"use client";

export interface AccountPanelSnapshot {
  equity: number;
  initialCapital: number;
  positions: Record<string, number>;
  tradeCount: number;
  pool: string;
  lastPrice?: number;
  training: boolean;
}

interface Props {
  snapshot: AccountPanelSnapshot;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function AccountPanel({ snapshot }: Props) {
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
      ? `${qty < 0.0001 ? qty.toExponential(2) : qty.toFixed(4)} ${positionKey ?? pool}`
      : "—";

  const entryHint =
    lastPrice != null && qty > 0 ? `@ ${lastPrice < 1 ? lastPrice.toPrecision(4) : lastPrice.toFixed(2)}` : "—";

  const positionPct =
    equity > 0 && lastPrice != null && qty > 0
      ? `${((qty * lastPrice) / equity) * 100}%`
      : "—";

  return (
    <div className="min-w-0 max-w-full space-y-2 rounded-lg bg-paper-card p-3 text-[13px]">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-900">账户</h3>
        <span className="text-[10px] text-ink-500">
          {training ? "训练中" : "未训练"}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-ink-500">权益</span>
        <span className="font-mono font-medium">{formatUsd(equity)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-ink-500">初始资金</span>
        <span className="font-mono text-ink-500">{formatUsd(initialCapital)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-ink-500">持仓 ({pool})</span>
        <span className="font-mono">{positionLabel}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-ink-500">参考价</span>
        <span className="font-mono text-ink-500">{entryHint}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-ink-500">盈亏</span>
        <span
          className={
            isProfit
              ? "font-mono font-semibold text-profit"
              : "font-mono font-semibold text-loss"
          }
        >
          {isProfit ? "+" : ""}
          {formatUsd(pnl)} ({isProfit ? "+" : ""}
          {pnlPct.toFixed(2)}%)
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-ink-500">成交笔数</span>
        <span className="font-mono">{tradeCount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-ink-500">仓位占比</span>
        <span>{positionPct}</span>
      </div>
    </div>
  );
}

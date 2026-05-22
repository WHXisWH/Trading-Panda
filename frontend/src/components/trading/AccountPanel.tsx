interface Props {
  balance?: string;
  position?: string;
  entryPrice?: string;
  pnl?: string;
  pnlPct?: string;
  positionPct?: string;
  isProfit?: boolean;
}

export function AccountPanel({
  balance = "$9,880",
  position = "0.085 BTC",
  entryPrice = "@ $58,820",
  pnl = "+$120 (+0.2%)",
  pnlPct,
  positionPct = "4.8%",
  isProfit = true,
}: Props) {
  return (
    <div className="space-y-2 rounded-lg bg-paper-card p-3 text-[13px]">
      <h3 className="font-semibold text-ink-900">账户</h3>
      <div className="flex justify-between">
        <span className="text-ink-500">余额</span>
        <span className="font-mono font-medium">{balance}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-ink-500">持仓</span>
        <span className="font-mono">{position}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-ink-500">入场</span>
        <span className="font-mono text-ink-500">{entryPrice}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-ink-500">盈亏</span>
        <span className={isProfit ? "text-profit font-mono font-semibold" : "text-loss font-mono font-semibold"}>
          {pnl}
        </span>
      </div>
      {pnlPct && (
        <div className="flex justify-between text-[11px]">
          <span className="text-ink-500">盈亏%</span>
          <span className={isProfit ? "text-profit" : "text-loss"}>{pnlPct}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-ink-500">仓位</span>
        <span>{positionPct}</span>
      </div>
    </div>
  );
}

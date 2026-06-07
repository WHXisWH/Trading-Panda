"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { TradeHistory } from "@/components/trading/TradeHistory";
import type { AccountPanelSnapshot } from "@/components/trading/AccountPanel";
import type { DecisionLog, TradeRecordApi } from "@/types/trading";
import type { MarketInterval, WsConnectionStatus } from "@/types/ws";

type TabId = "overview" | "positions" | "trades" | "diagnostics";

interface Props {
  account: AccountPanelSnapshot;
  trades: TradeRecordApi[];
  selectedTradeId: string | null;
  onSelectTrade: (trade: TradeRecordApi) => void;
  tradesLoading?: boolean;
  liveDecision: DecisionLog | null;
  pool: string;
  interval: MarketInterval;
  marketStatus: WsConnectionStatus;
  historyLoading: boolean;
  historyError: string | null;
  candleCount: number;
  lastTickAgeSec: number | null;
  actorActive: boolean;
  strategyReady: boolean;
  simulationId: string | null;
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "总览" },
  { id: "positions", label: "持仓" },
  { id: "trades", label: "成交" },
  { id: "diagnostics", label: "诊断" },
];

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatQty(value: number): string {
  if (Math.abs(value) < 0.0001 && value !== 0) return value.toExponential(2);
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function statusTone(ok: boolean): string {
  return ok ? "bg-bamboo-50 text-bamboo-600" : "bg-white text-ink-500";
}

function computeTradeStats(trades: TradeRecordApi[]) {
  const executed = trades.filter((t) => t.action !== "HOLD");
  const wins = executed.filter((t) => (t.pnl_pct ?? 0) > 0).length;
  const pnl = executed.reduce((sum, t) => sum + (t.pnl_pct ?? 0), 0);
  const avgScore =
    executed.length > 0
      ? executed.reduce((sum, t) => sum + t.final_score, 0) / executed.length
      : 0;
  return {
    executed: executed.length,
    winRate: executed.length > 0 ? (wins / executed.length) * 100 : 0,
    pnlPct: pnl * 100,
    avgScore,
  };
}

export function DashboardTradingWorkspace({
  account,
  trades,
  selectedTradeId,
  onSelectTrade,
  tradesLoading,
  liveDecision,
  pool,
  interval,
  marketStatus,
  historyLoading,
  historyError,
  candleCount,
  lastTickAgeSec,
  actorActive,
  strategyReady,
  simulationId,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const stats = useMemo(() => computeTradeStats(trades), [trades]);
  const pnl = account.equity - account.initialCapital;
  const pnlPct = account.initialCapital > 0 ? (pnl / account.initialCapital) * 100 : 0;
  const positionRows = Object.entries(account.positions).filter(([, qty]) => qty > 0);

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-paper-card px-3 py-2">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">模拟交易工作台</h2>
          <p className="text-[10px] text-ink-500">
            {pool} · {interval} · {account.training ? "训练中" : "未训练"}
          </p>
        </div>
        <div className="flex overflow-hidden rounded border border-[var(--color-border)] bg-white">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "h-8 px-3 text-[11px] font-medium",
                activeTab === tab.id
                  ? "bg-bamboo-500 text-white"
                  : "text-ink-500 hover:bg-bamboo-50",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-3 p-3 md:grid-cols-4">
          <Metric
            label="权益"
            value={formatUsd(account.equity)}
            detail={`${formatPct(pnlPct)} · ${formatUsd(pnl)}`}
            positive={pnl >= 0}
          />
          <Metric
            label="胜率"
            value={`${stats.winRate.toFixed(1)}%`}
            detail={`${stats.executed} 笔成交`}
          />
          <Metric
            label="平均决策分"
            value={stats.executed ? stats.avgScore.toFixed(2) : "--"}
            detail={liveDecision ? `${liveDecision.action} · ${liveDecision.zone}` : "等待决策"}
          />
          <Metric
            label="当前持仓"
            value={positionRows.length ? `${positionRows.length} 个资产` : "空仓"}
            detail={positionRows[0] ? `${positionRows[0][0]} ${formatQty(positionRows[0][1])}` : "无持仓风险"}
          />
        </div>
      )}

      {activeTab === "positions" && (
        <div className="p-3">
          {positionRows.length === 0 ? (
            <p className="rounded-lg bg-paper-card px-3 py-4 text-[12px] text-ink-500">
              当前没有持仓。训练开始后，成交会更新这里的资产数量和仓位占比。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[12px]">
                <thead className="text-[10px] uppercase text-ink-500">
                  <tr>
                    <th className="px-2 py-2">资产</th>
                    <th className="px-2 py-2">数量</th>
                    <th className="px-2 py-2">参考价</th>
                    <th className="px-2 py-2">名义价值</th>
                    <th className="px-2 py-2">仓位占比</th>
                  </tr>
                </thead>
                <tbody>
                  {positionRows.map(([asset, qty]) => {
                    const notional = account.lastPrice ? qty * account.lastPrice : 0;
                    const pct = account.equity > 0 ? (notional / account.equity) * 100 : 0;
                    return (
                      <tr key={asset} className="border-t border-[var(--color-border)]">
                        <td className="px-2 py-2 font-mono font-semibold">{asset}</td>
                        <td className="px-2 py-2 font-mono">{formatQty(qty)}</td>
                        <td className="px-2 py-2 font-mono">
                          {account.lastPrice ? account.lastPrice.toPrecision(6) : "--"}
                        </td>
                        <td className="px-2 py-2 font-mono">{notional ? formatUsd(notional) : "--"}</td>
                        <td className="px-2 py-2 font-mono">{notional ? `${pct.toFixed(2)}%` : "--"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "trades" && (
        <TradeHistory
          embedded
          className="max-h-[320px] px-3 py-3"
          items={trades}
          selectedId={selectedTradeId}
          onSelect={onSelectTrade}
          loading={tradesLoading}
        />
      )}

      {activeTab === "diagnostics" && (
        <div className="grid gap-2 p-3 md:grid-cols-2">
          <Diagnostic label="策略" value={strategyReady ? "ready" : "missing"} ok={strategyReady} />
          <Diagnostic label="Actor" value={actorActive ? "active" : "idle"} ok={actorActive} />
          <Diagnostic label="WebSocket" value={marketStatus} ok={marketStatus === "open"} />
          <Diagnostic label="REST candles" value={historyError ? "error" : historyLoading ? "loading" : "ready"} ok={!historyError && candleCount > 0} />
          <Diagnostic label="K线数量" value={`${candleCount} bars`} ok={candleCount > 0} />
          <Diagnostic label="最近 tick" value={lastTickAgeSec == null ? "none" : `${lastTickAgeSec}s ago`} ok={lastTickAgeSec != null && lastTickAgeSec < 60} />
          <Diagnostic label="Simulation" value={simulationId ? simulationId.slice(0, 8) : "none"} ok={Boolean(simulationId)} />
          <Diagnostic label="错误" value={historyError ?? "none"} ok={!historyError} wide />
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  positive,
}: {
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg bg-paper-card px-3 py-3">
      <p className="text-[10px] text-ink-500">{label}</p>
      <p className="mt-1 font-mono text-[18px] font-semibold text-ink-900">{value}</p>
      <p
        className={clsx(
          "mt-1 text-[11px]",
          positive == null ? "text-ink-500" : positive ? "text-profit" : "text-loss",
        )}
      >
        {detail}
      </p>
    </div>
  );
}

function Diagnostic({
  label,
  value,
  ok,
  wide,
}: {
  label: string;
  value: string;
  ok: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[12px]",
        wide && "md:col-span-2",
      )}
    >
      <span className="text-ink-500">{label}</span>
      <span className={clsx("truncate rounded px-2 py-0.5 font-mono text-[11px]", statusTone(ok))}>
        {value}
      </span>
    </div>
  );
}

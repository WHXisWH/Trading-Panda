"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { TradeHistory } from "@/components/trading/TradeHistory";
import { EquityCurve } from "@/components/trading/EquityCurve";
import { PositionRiskTable } from "@/components/trading/PositionRiskTable";
import {
  computeTradeStats,
  buildEquityCurve,
  computePortfolioMetrics,
  formatUsd,
  formatPct,
} from "@/lib/trading/performanceMetrics";
import type { DecisionLog, TradeRecordApi } from "@/types/trading";
import type { MarketInterval, WsConnectionStatus } from "@/types/ws";

type TabId = "overview" | "positions" | "trades" | "equity" | "diagnostics";

interface Props {
  equity: number;
  initialCapital: number;
  positions: Record<string, number>;
  tradeCount: number;
  lastPrice?: number;
  isRunning: boolean;
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
  { id: "equity", label: "权益" },
  { id: "diagnostics", label: "诊断" },
];

function DiagnosticRow({
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
      <span
        className={clsx(
          "truncate rounded-full px-2 py-0.5 font-mono text-[11px]",
          ok ? "bg-bamboo-50 text-bamboo-600" : "bg-paper-card text-ink-500",
        )}
      >
        {value}
      </span>
    </div>
  );
}

const DIAGNOSTIC_LABELS: Record<string, Record<string, string>> = {
  strategy: { ready: "已就绪", missing: "未设置" },
  actor: { active: "活跃", idle: "空闲" },
  ws: {
    open: "已连接",
    connecting: "连接中",
    closed: "已断开",
    error: "错误",
    idle: "未连接",
  },
  candles: { ready: "正常", loading: "加载中", error: "异常" },
};

export function DashboardTradingWorkspace({
  equity,
  initialCapital,
  positions,
  lastPrice,
  isRunning,
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
  const equityPoints = useMemo(
    () => buildEquityCurve(trades, initialCapital),
    [trades, initialCapital],
  );
  const portfolio = useMemo(
    () => computePortfolioMetrics(trades, initialCapital, equity),
    [trades, initialCapital, equity],
  );
  const pnl = equity - initialCapital;
  const pnlPct = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0;
  const positionCount = Object.values(positions).filter((q) => q > 0).length;

  const strategyLabel = strategyReady
    ? DIAGNOSTIC_LABELS.strategy.ready
    : DIAGNOSTIC_LABELS.strategy.missing;
  const actorLabel = actorActive
    ? DIAGNOSTIC_LABELS.actor.active
    : DIAGNOSTIC_LABELS.actor.idle;
  const wsLabel = DIAGNOSTIC_LABELS.ws[marketStatus] ?? marketStatus;
  const candleStatus = historyError ? "error" : historyLoading ? "loading" : "ready";
  const candleLabel = DIAGNOSTIC_LABELS.candles[candleStatus] ?? candleStatus;
  const tickLabel =
    lastTickAgeSec == null
      ? "无数据"
      : lastTickAgeSec < 60
        ? `${lastTickAgeSec}秒前`
        : `${Math.floor(lastTickAgeSec / 60)}分钟前`;

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-paper-card px-4 py-2.5">
        <div>
          <h2 className="text-[14px] font-semibold text-ink-900">模拟交易工作台</h2>
          <p className="text-[10px] text-ink-500">
            {pool} · {interval} · {isRunning ? "训练中" : "未训练"}
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "h-8 px-3 text-[11px] font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-bamboo-500 text-white"
                  : "text-ink-500 hover:bg-bamboo-50 hover:text-bamboo-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="权益"
              value={formatUsd(equity)}
              detail={`${formatPct(pnlPct)} · ${formatUsd(pnl)}`}
              positive={pnl >= 0}
            />
            <MetricCard
              label="胜率"
              value={stats.totalTrades > 0 ? `${stats.winRate.toFixed(1)}%` : "--"}
              detail={`${stats.winCount}胜 / ${stats.lossCount}负 · 共${stats.totalTrades}笔`}
            />
            <MetricCard
              label="盈亏因子"
              value={
                stats.profitFactor === Infinity
                  ? "∞"
                  : stats.profitFactor > 0
                    ? stats.profitFactor.toFixed(2)
                    : "--"
              }
              detail={`期望值 ${stats.expectancy > 0 ? "+" : ""}${stats.expectancy.toFixed(2)}%`}
              positive={stats.profitFactor > 1}
            />
            <MetricCard
              label="最大回撤"
              value={
                portfolio.maxDrawdownPct > 0
                  ? `-${portfolio.maxDrawdownPct.toFixed(2)}%`
                  : "0%"
              }
              detail={`最大连亏 ${stats.maxConsecutiveLoss} 笔`}
              positive={portfolio.maxDrawdownPct < 5}
            />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <MiniMetric label="平均决策分" value={stats.avgScore > 0 ? stats.avgScore.toFixed(2) : "--"} />
            <MiniMetric label="平均盈亏" value={stats.totalTrades > 0 ? formatPct(stats.avgPnlPct) : "--"} />
            <MiniMetric label="最大单笔盈" value={stats.maxWin > 0 ? formatPct(stats.maxWin) : "--"} />
            <MiniMetric label="最大单笔亏" value={stats.maxLoss < 0 ? formatPct(stats.maxLoss) : "--"} />
            <MiniMetric label="夏普比率" value={portfolio.sharpeRatio !== 0 ? portfolio.sharpeRatio.toFixed(2) : "--"} />
            <MiniMetric label="持仓数" value={`${positionCount} 个`} />
          </div>

          {liveDecision && (
            <div className="mt-3 rounded-lg bg-paper-card px-3 py-2 text-[11px]">
              <span className="text-ink-500">最新决策 </span>
              <span className={clsx("font-semibold", liveDecision.action === "BUY" ? "text-profit" : liveDecision.action === "SELL" ? "text-loss" : "text-ink-700")}>
                {liveDecision.action}
              </span>
              <span className="ml-2 text-ink-500">
                分数 <span className="font-mono text-ink-700">{liveDecision.final_score.toFixed(2)}</span>
              </span>
              <span className="ml-2 text-ink-500">
                区间 <span className={clsx("font-semibold", liveDecision.zone === "EXECUTE" ? "text-bamboo-600" : "text-ink-700")}>{liveDecision.zone}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {activeTab === "positions" && (
        <PositionRiskTable
          positions={positions}
          equity={equity}
          lastPrice={lastPrice}
        />
      )}

      {activeTab === "trades" && (
        <TradeHistory
          embedded
          className="max-h-[360px] px-3 py-3"
          items={trades}
          selectedId={selectedTradeId}
          onSelect={onSelectTrade}
          loading={tradesLoading}
        />
      )}

      {activeTab === "equity" && (
        <div className="p-3">
          <EquityCurve
            points={equityPoints}
            initialCapital={initialCapital}
          />
        </div>
      )}

      {activeTab === "diagnostics" && (
        <div className="grid gap-2 p-4 md:grid-cols-2">
          <DiagnosticRow label="策略状态" value={strategyLabel} ok={strategyReady} />
          <DiagnosticRow label="Actor 状态" value={actorLabel} ok={actorActive} />
          <DiagnosticRow label="WebSocket" value={wsLabel} ok={marketStatus === "open"} />
          <DiagnosticRow label="K线数据" value={candleLabel} ok={!historyError && candleCount > 0} />
          <DiagnosticRow label="K线数量" value={`${candleCount} 根`} ok={candleCount > 0} />
          <DiagnosticRow label="最近行情" value={tickLabel} ok={lastTickAgeSec != null && lastTickAgeSec < 60} />
          <DiagnosticRow label="会话 ID" value={simulationId ? simulationId.slice(0, 8) + "…" : "无"} ok={Boolean(simulationId)} />
          <DiagnosticRow label="异常信息" value={historyError ?? "无"} ok={!historyError} wide />
        </div>
      )}
    </section>
  );
}

function MetricCard({
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
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-mono text-[20px] font-bold text-ink-900">{value}</p>
      <p
        className={clsx(
          "mt-0.5 text-[11px]",
          positive == null ? "text-ink-500" : positive ? "text-profit" : "text-loss",
        )}
      >
        {detail}
      </p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-center">
      <p className="text-[9px] text-ink-500">{label}</p>
      <p className="mt-0.5 font-mono text-[13px] font-semibold text-ink-800">{value}</p>
    </div>
  );
}

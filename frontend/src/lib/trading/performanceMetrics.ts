/** Pure utility functions for trading performance calculations */

import type { TradeRecordApi } from "@/types/trading";

export interface TradeStats {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnlPct: number;
  avgPnlPct: number;
  avgScore: number;
  maxWin: number;
  maxLoss: number;
  profitFactor: number;
  maxConsecutiveLoss: number;
  expectancy: number;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;
  tradeIndex: number;
}

export interface PortfolioMetrics {
  equity: number;
  initialCapital: number;
  pnl: number;
  pnlPct: number;
  peakEquity: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
}

export function computeTradeStats(trades: TradeRecordApi[]): TradeStats {
  const executed = trades.filter((t) => t.action !== "HOLD");
  if (executed.length === 0) {
    return {
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      totalPnlPct: 0,
      avgPnlPct: 0,
      avgScore: 0,
      maxWin: 0,
      maxLoss: 0,
      profitFactor: 0,
      maxConsecutiveLoss: 0,
      expectancy: 0,
    };
  }

  const wins = executed.filter((t) => (t.pnl_pct ?? 0) > 0);
  const losses = executed.filter((t) => (t.pnl_pct ?? 0) < 0);

  const totalPnlPct = executed.reduce((s, t) => s + (t.pnl_pct ?? 0), 0);
  const avgPnlPct = totalPnlPct / executed.length;
  const avgScore =
    executed.reduce((s, t) => s + t.final_score, 0) / executed.length;

  const totalWinPnl = wins.reduce((s, t) => s + (t.pnl_pct ?? 0), 0);
  const totalLossPnl = Math.abs(
    losses.reduce((s, t) => s + (t.pnl_pct ?? 0), 0),
  );
  const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? Infinity : 0;

  const maxWin = wins.length > 0 ? Math.max(...wins.map((t) => t.pnl_pct ?? 0)) : 0;
  const maxLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.pnl_pct ?? 0)) : 0;

  let maxConsecutiveLoss = 0;
  let currentStreak = 0;
  for (const t of executed) {
    if ((t.pnl_pct ?? 0) < 0) {
      currentStreak++;
      maxConsecutiveLoss = Math.max(maxConsecutiveLoss, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const winRate = wins.length / executed.length;
  const avgWin = wins.length > 0 ? totalWinPnl / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLossPnl / losses.length : 0;
  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;

  return {
    totalTrades: executed.length,
    winCount: wins.length,
    lossCount: losses.length,
    winRate: winRate * 100,
    totalPnlPct: totalPnlPct * 100,
    avgPnlPct: avgPnlPct * 100,
    avgScore,
    maxWin: maxWin * 100,
    maxLoss: maxLoss * 100,
    profitFactor,
    maxConsecutiveLoss,
    expectancy: expectancy * 100,
  };
}

export function buildEquityCurve(
  trades: TradeRecordApi[],
  initialCapital: number,
): EquityPoint[] {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const points: EquityPoint[] = [
    { timestamp: Date.now() - 86400000, equity: initialCapital, drawdown: 0, tradeIndex: -1 },
  ];

  let equity = initialCapital;
  let peak = initialCapital;

  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i];
    const pnl = (trade.pnl_pct ?? 0) * equity;
    equity += pnl;
    peak = Math.max(peak, equity);
    const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

    points.push({
      timestamp: new Date(trade.created_at).getTime(),
      equity,
      drawdown,
      tradeIndex: i,
    });
  }

  return points;
}

export function computePortfolioMetrics(
  trades: TradeRecordApi[],
  initialCapital: number,
  currentEquity: number,
): PortfolioMetrics {
  const curve = buildEquityCurve(trades, initialCapital);
  const peakEquity = Math.max(...curve.map((p) => p.equity));
  const maxDrawdownPct = Math.max(...curve.map((p) => p.drawdown));
  const pnl = currentEquity - initialCapital;
  const pnlPct = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0;

  const returns = curve
    .slice(1)
    .map((p, i) => {
      const prev = curve[i].equity;
      return prev > 0 ? (p.equity - prev) / prev : 0;
    });

  const avgReturn = returns.length > 0
    ? returns.reduce((s, r) => s + r, 0) / returns.length
    : 0;
  const stdReturn = returns.length > 1
    ? Math.sqrt(
        returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) /
          (returns.length - 1),
      )
    : 0;
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  return {
    equity: currentEquity,
    initialCapital,
    pnl,
    pnlPct,
    peakEquity,
    maxDrawdown: peakEquity - currentEquity,
    maxDrawdownPct,
    sharpeRatio,
  };
}

export function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatQty(value: number): string {
  if (Math.abs(value) < 0.0001 && value !== 0) return value.toExponential(2);
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function formatPrice(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "--";
  if (Math.abs(value) < 1) return value.toPrecision(5);
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

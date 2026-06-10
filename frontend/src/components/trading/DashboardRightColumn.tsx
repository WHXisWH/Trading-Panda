"use client";

import { clsx } from "clsx";
import { DecisionPanel } from "@/components/trading/DecisionPanel";
import { TradeHistory } from "@/components/trading/TradeHistory";
import type { DecisionLog, TradeRecordApi } from "@/types/trading";

interface Props {
  liveDecision: DecisionLog | null;
  reviewDecision: DecisionLog | null;
  trades: TradeRecordApi[];
  selectedTradeId: string | null;
  onSelectTrade: (trade: TradeRecordApi) => void;
  onClearReview?: () => void;
  training: boolean;
  tradesLoading?: boolean;
  className?: string;
}

export function DashboardRightColumn({
  liveDecision,
  reviewDecision,
  trades,
  selectedTradeId,
  onSelectTrade,
  onClearReview,
  training,
  tradesLoading,
  className,
}: Props) {
  return (
    <aside
      className={clsx(
        "dashboard-col-right flex min-w-0 max-w-full flex-col gap-3",
        "xl:sticky xl:top-[calc(var(--navbar-height)+0.5rem)] xl:max-h-[calc(100dvh-var(--navbar-height)-1rem)]",
        className,
      )}
    >
      <div className="min-h-0 rounded-lg border border-[var(--color-border)] bg-white p-3">
        {reviewDecision && onClearReview && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-ink-500">复盘模式</span>
            <button
              type="button"
              onClick={onClearReview}
              className="text-[11px] text-bamboo-500 hover:underline"
            >
              返回实时
            </button>
          </div>
        )}
        <DecisionPanel
          liveDecision={liveDecision}
          reviewDecision={reviewDecision}
          training={training}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
        <TradeHistory
          embedded
          className="h-full px-3 py-3"
          items={trades}
          selectedId={selectedTradeId}
          onSelect={onSelectTrade}
          loading={tradesLoading}
        />
      </div>
    </aside>
  );
}

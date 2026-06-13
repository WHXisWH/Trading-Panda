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

export function DashboardMainFooter({
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
    <section
      className={clsx(
        "dashboard-main-footer flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-neutral-50",
        className,
      )}
    >
      <div className="shrink-0 border-b border-[var(--color-border)] p-4">
        {reviewDecision && onClearReview && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-500">Review</span>
            <button
              type="button"
              onClick={onClearReview}
              className="text-[11px] text-primary-500 hover:underline"
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
      <TradeHistory
        embedded
        className="min-h-0 flex-1 px-4 pb-4"
        items={trades}
        selectedId={selectedTradeId}
        onSelect={onSelectTrade}
        loading={tradesLoading}
      />
    </section>
  );
}

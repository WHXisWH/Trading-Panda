"use client";

import Link from "next/link";
import { SimulationControls } from "@/components/trading/SimulationControls";
import type { DeepbookPool } from "@/lib/constants/deepbookPools";

interface Props {
  pandaId: string;
  focus: number;
  subscribedPools: DeepbookPool[];
  simSpeed: string;
  simRunning: boolean;
  canTrain: boolean;
  hasStrategy: boolean;
  actorActive?: boolean;
  tradeCount?: number;
  onSpeedChange: (speed: string) => void;
  onToggleTraining: () => void;
  onOpenStrategy: () => void;
}

export function DashboardTrainingBar({
  pandaId,
  focus,
  subscribedPools,
  simSpeed,
  simRunning,
  canTrain,
  hasStrategy,
  actorActive,
  tradeCount = 0,
  onSpeedChange,
  onToggleTraining,
  onOpenStrategy,
}: Props) {
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-paper-card px-3 py-3 sm:px-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <SimulationControls active={simSpeed} onChange={onSpeedChange} />
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className={`rounded px-2 py-1 ${hasStrategy ? "bg-bamboo-50 text-bamboo-600" : "bg-white text-ink-500"}`}>
            {hasStrategy ? "策略已就绪" : "未设置策略"}
          </span>
          <span className={`rounded px-2 py-1 ${actorActive ? "bg-bamboo-50 text-bamboo-600" : "bg-white text-ink-500"}`}>
            {actorActive ? "Actor 活跃" : "Actor 空闲"}
          </span>
          <span className="rounded bg-white px-2 py-1 text-ink-500">
            {tradeCount} trades
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenStrategy}
          className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-bamboo-50"
        >
          策略
        </button>
        <button
          type="button"
          onClick={onToggleTraining}
          disabled={!canTrain}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
            simRunning ? "bg-vermillion" : "bg-bamboo-500"
          }`}
        >
          {simRunning ? "⏸ 暂停训练" : "▶ 开始训练"}
        </button>
        <Link
          href={`/pools?panda=${pandaId}&focus=${focus}`}
          className="text-[11px] text-bamboo-500 hover:underline"
        >
          管理交易池
          {subscribedPools.length ? ` (${subscribedPools.join(" · ")})` : ""} →
        </Link>
      </div>
    </div>
  );
}

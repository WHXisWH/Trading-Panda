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
  onSpeedChange: (speed: string) => void;
  onToggleTraining: () => void;
}

export function DashboardTrainingBar({
  pandaId,
  focus,
  subscribedPools,
  simSpeed,
  simRunning,
  canTrain,
  onSpeedChange,
  onToggleTraining,
}: Props) {
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-paper-card px-3 py-3 sm:px-4">
      <SimulationControls active={simSpeed} onChange={onSpeedChange} />
      <div className="flex flex-wrap items-center gap-3">
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

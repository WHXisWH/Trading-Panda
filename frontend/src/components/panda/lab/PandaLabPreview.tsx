"use client";

import { clsx } from "clsx";
import { PandaSvgRenderer } from "@/components/panda/PandaSvgRenderer";
import type { PandaStats } from "@/utils/pandaHelper";

interface PandaLabPreviewProps {
  stats: PandaStats;
  compareStats?: PandaStats | null;
  showCompare?: boolean;
  mintPreview?: boolean;
}

export function PandaLabPreview({
  stats,
  compareStats,
  showCompare = false,
  mintPreview = true,
}: PandaLabPreviewProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className={clsx(
          "grid w-full gap-6",
          showCompare && compareStats ? "md:grid-cols-2" : "grid-cols-1"
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-medium text-ink-500">主预览 · 384px</span>
          <div className="w-full max-w-[384px] rounded-xl border border-[var(--color-border)] bg-[#efece3] p-4 shadow-sm">
            <PandaSvgRenderer stats={stats} showBackground={false} className="mx-auto" />
          </div>
        </div>

        {showCompare && compareStats && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-medium text-ink-500">对比快照 A</span>
            <div className="w-full max-w-[384px] rounded-xl border border-dashed border-bamboo-400 bg-[#efece3] p-4">
              <PandaSvgRenderer stats={compareStats} showBackground={false} className="mx-auto" />
            </div>
          </div>
        )}
      </div>

      {mintPreview && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-medium text-ink-500">
            Mint 圆预览 · 120px
          </span>
          <div className="h-[120px] w-[120px] overflow-hidden rounded-full ring-4 ring-bamboo-500/30">
            <PandaSvgRenderer stats={stats} showBackground className="h-full w-full" />
          </div>
        </div>
      )}
    </div>
  );
}

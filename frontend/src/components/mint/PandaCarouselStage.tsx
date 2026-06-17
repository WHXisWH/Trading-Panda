"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { PandaCanvasRenderer } from "@/components/panda/PandaCanvasRenderer";
import type { PandaCanvasRenderOptions } from "@/lib/pandaCanvasAssets";
import { PANDA_LAB_PRESETS } from "@/lib/pandaLabPresets";
import type { PandaStats } from "@/utils/pandaHelper";

const CAROUSEL_RENDER_OPTIONS: PandaCanvasRenderOptions = {
  tierMode: "discrete",
  traitOpacityMode: "solid",
};

interface PandaCarouselStageProps {
  activeStats?: PandaStats | null;
  paused?: boolean;
  slowed?: boolean;
  className?: string;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/** Loops Panda Lab variants until mint reveals the real Panda (page-mint §5). */
export function PandaCarouselStage({
  activeStats,
  paused = false,
  slowed = false,
  className,
}: PandaCarouselStageProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  const displayStats = activeStats ?? PANDA_LAB_PRESETS[index % PANDA_LAB_PRESETS.length].stats;

  useEffect(() => {
    if (activeStats || paused || reducedMotion) return;
    const intervalMs = slowed ? 2400 : 3200;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % PANDA_LAB_PRESETS.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [activeStats, paused, reducedMotion, slowed]);

  return (
    <div className={clsx("flex flex-col items-center gap-3", className)}>
      <div
        className={clsx(
          "h-[var(--panda-avatar-mint)] w-[var(--panda-avatar-mint)] overflow-hidden rounded-full ring-4 transition-all duration-500",
          activeStats
            ? "ring-primary-500/50 animate-scale-in"
            : "ring-amber-400/25",
        )}
      >
        <PandaCanvasRenderer
          stats={displayStats}
          showBackground
          renderOptions={CAROUSEL_RENDER_OPTIONS}
          className="h-full w-full"
        />
      </div>
      {!activeStats && (
        <p className="text-[11px] text-neutral-400">
          {reducedMotion
            ? `Preview ${index + 1} / ${PANDA_LAB_PRESETS.length}`
            : PANDA_LAB_PRESETS[index % PANDA_LAB_PRESETS.length].label}
        </p>
      )}
    </div>
  );
}

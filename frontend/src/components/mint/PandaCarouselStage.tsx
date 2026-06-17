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

function captionForPreset(index: number, reducedMotion: boolean, revealed: boolean): {
  title: string;
  subtitle: string;
} {
  if (revealed) {
    return {
      title: "Your Panda",
      subtitle: "Personality sealed on-chain",
    };
  }
  const preset = PANDA_LAB_PRESETS[index % PANDA_LAB_PRESETS.length];
  return {
    title: preset.stageLabelEn,
    subtitle: reducedMotion
      ? `Preview ${index + 1} of ${PANDA_LAB_PRESETS.length}`
      : "",
  };
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
  const revealed = Boolean(activeStats);
  const caption = captionForPreset(index, reducedMotion, revealed);

  useEffect(() => {
    if (activeStats || paused || reducedMotion) return;
    const intervalMs = slowed ? 2400 : 3200;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % PANDA_LAB_PRESETS.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [activeStats, paused, reducedMotion, slowed]);

  return (
    <div className={clsx("relative flex h-full w-full items-center justify-center", className)}>
      <div
        className={clsx(
          "mint-panda-float h-[var(--mint-panda-size-mobile)] w-[var(--mint-panda-size-mobile)] overflow-hidden rounded-full sm:h-[var(--panda-avatar-mint)] sm:w-[var(--panda-avatar-mint)]",
          "ring-4 transition-all duration-500",
          revealed ? "animate-scale-in ring-product-green/50 shadow-[var(--glow-green)]" : "ring-product-gold/30",
          slowed && !revealed && "opacity-90",
        )}
      >
        <PandaCanvasRenderer
          stats={displayStats}
          showBackground
          renderOptions={CAROUSEL_RENDER_OPTIONS}
          className="h-full w-full"
        />
      </div>

      <div className="mint-stage-caption">
        <strong className="block text-sm leading-none text-product-text">{caption.title}</strong>
        {caption.subtitle ? (
          <span className="mt-1 block font-mono text-[10px] text-product-muted">{caption.subtitle}</span>
        ) : null}
      </div>
    </div>
  );
}

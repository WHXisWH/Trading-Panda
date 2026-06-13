"use client";

import { clsx } from "clsx";
import { PandaSvgRenderer } from "./PandaSvgRenderer";
import { emotionMeta } from "@/lib/emotion";
import {
  statsFromPanda,
  type PandaStats,
} from "@/utils/pandaHelper";

interface Props {
  emotionState?: string;
  stats?: PandaStats | null;
  /** Partial panda fields when stats not pre-built */
  panda?: {
    boldness: number;
    patience: number;
    intuition: number;
    focus: number;
    contrarian: number;
    emotion_state?: string;
    experience_level?: number;
  };
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "live" | "silhouette" | "loading";
  animate?: boolean;
  className?: string;
}

const SIZE_PX = {
  sm: 64,
  md: 96,
  lg: 128,
  xl: 192,
};

export function PandaAvatar({
  emotionState = "neutral",
  stats,
  panda,
  size = "md",
  variant = "live",
  animate = true,
  className,
}: Props) {
  const px = SIZE_PX[size];
  const meta = emotionMeta(emotionState);
  const resolvedStats =
    stats ?? (panda ? statsFromPanda(panda) : null);

  const defaultStats: PandaStats = {
    boldness: 50,
    patience: 50,
    intuition: 50,
    focus: 50,
    contrarian: 50,
    emotion: "calm",
    experience: 15,
  };

  if (variant === "silhouette") {
    return (
      <div
        className={clsx(
          "relative overflow-hidden rounded-full bg-neutral-900/10",
          className
        )}
        style={{ width: px, height: px }}
        aria-label="Panda silhouette"
      >
        <div
          className="absolute inset-[18%] rounded-full"
          style={{ background: `radial-gradient(circle, ${meta.color}44 0%, #1a1a1a 70%)` }}
        />
        <PandaSvgRenderer
          stats={panda ? statsFromPanda(panda) : defaultStats}
          showBackground
          className="h-full w-full opacity-40"
        />
      </div>
    );
  }

  if (variant === "loading") {
    return (
      <div
        className={clsx(
          "relative flex items-center justify-center overflow-hidden rounded-full bg-neutral-50",
          className
        )}
        style={{ width: px, height: px }}
      >
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-full ring-2 ring-neutral-100",
        className
      )}
      style={{ width: px, height: px }}
    >
      <PandaSvgRenderer
        stats={resolvedStats ?? defaultStats}
        showBackground
        className="h-full w-full"
      />
      <span
        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full shadow-sm"
        style={{ backgroundColor: meta.color }}
        title={meta.label}
      />
    </div>
  );
}

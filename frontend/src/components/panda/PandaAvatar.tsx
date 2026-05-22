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

  if (variant === "silhouette") {
    return (
      <div
        className={clsx(
          "relative overflow-hidden rounded-full bg-panda-black/10",
          animate && "animate-panda-breathe",
          className
        )}
        style={{ width: px, height: px }}
        aria-label="熊猫剪影"
      >
        <div
          className="absolute inset-[18%] rounded-full panda-silhouette"
          style={{ background: `radial-gradient(circle, ${meta.color}44 0%, #1a1a1a 70%)` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-3xl opacity-40">
          🐼
        </span>
      </div>
    );
  }

  if (variant === "loading") {
    return (
      <div
        className={clsx(
          "relative flex items-center justify-center overflow-hidden rounded-full bg-paper-card",
          className
        )}
        style={{ width: px, height: px }}
      >
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-bamboo-500 border-t-transparent" />
      </div>
    );
  }

  const defaultStats: PandaStats = {
    boldness: 50,
    patience: 50,
    intuition: 50,
    focus: 50,
    contrarian: 50,
    emotion: "calm",
    experience: 15,
  };

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-full ring-2 ring-paper-card",
        animate && "animate-panda-breathe",
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
        className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs shadow-sm"
        style={{ backgroundColor: meta.color + "33" }}
        title={meta.label}
      >
        {meta.emoji}
      </span>
    </div>
  );
}

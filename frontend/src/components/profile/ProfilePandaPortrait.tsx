"use client";

import { clsx } from "clsx";
import { PandaCanvasRenderer } from "@/components/panda/PandaCanvasRenderer";
import type { PandaCanvasRenderOptions } from "@/lib/pandaCanvasAssets";
import { statsFromPandaSummary } from "@/utils/pandaHelper";
import type { PandaDetailApi, PandaSummaryApi } from "@/types/panda";

const PROFILE_PANDA_RENDER_OPTIONS: PandaCanvasRenderOptions = {
  tierMode: "discrete",
  traitOpacityMode: "solid",
};

interface ProfilePandaPortraitProps {
  panda: PandaSummaryApi | PandaDetailApi;
  size?: "sidebar" | "detail" | "training";
  /** When set, overrides `panda.is_trading` for the status dot. */
  isTrading?: boolean;
  /** Full-color vs dimmed canvas (Training Ledger Actor presence). */
  isOnline?: boolean;
  showStatusDot?: boolean;
  className?: string;
}

const SIZE_CLASS = {
  sidebar: "h-14 w-14",
  detail: "h-48 w-48",
  training: "h-40 w-40",
} as const;

export function ProfilePandaPortrait({
  panda,
  size = "sidebar",
  isTrading = panda.is_trading,
  isOnline,
  showStatusDot = true,
  className,
}: ProfilePandaPortraitProps) {
  const stats = statsFromPandaSummary(panda);
  const frameClass = SIZE_CLASS[size];
  const portraitOnline = isOnline ?? isTrading;

  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-full border border-product-gold/20 bg-black/30",
        size === "detail" && "border-product-gold/25 shadow-[var(--glow-gold)]",
        size === "training" &&
          (portraitOnline
            ? "border-product-green/30 shadow-[0_0_28px_rgba(109,255,144,0.22)]"
            : "border-white/[0.06] shadow-none"),
        frameClass,
        className,
      )}
    >
      <PandaCanvasRenderer
        stats={stats}
        showBackground
        renderOptions={PROFILE_PANDA_RENDER_OPTIONS}
        className={clsx(
          "h-full w-full transition-[filter,opacity] duration-500",
          !portraitOnline && "opacity-50 grayscale",
        )}
      />
      {showStatusDot ? (
        <span
          className={clsx(
            "absolute rounded-full ring-2 ring-black/70",
            size === "detail" || size === "training"
              ? "bottom-4 right-5 h-3.5 w-3.5 ring-4"
              : "bottom-1 right-1 h-2.5 w-2.5",
            portraitOnline
              ? "bg-product-green shadow-[0_0_8px_rgba(109,255,144,0.7)]"
              : "bg-product-muted",
          )}
        />
      ) : null}
    </div>
  );
}

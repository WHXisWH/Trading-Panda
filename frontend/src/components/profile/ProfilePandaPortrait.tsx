"use client";

import { clsx } from "clsx";
import { PandaCanvasRenderer } from "@/components/panda/PandaCanvasRenderer";
import type { PandaCanvasRenderOptions } from "@/lib/pandaCanvasAssets";
import { statsFromPandaSummary } from "@/utils/pandaHelper";
import type { PandaSummaryApi } from "@/types/panda";

const PROFILE_PANDA_RENDER_OPTIONS: PandaCanvasRenderOptions = {
  tierMode: "discrete",
  traitOpacityMode: "solid",
};

interface ProfilePandaPortraitProps {
  panda: PandaSummaryApi;
  size?: "sidebar" | "detail";
  isTrading?: boolean;
  className?: string;
}

const SIZE_CLASS = {
  sidebar: "h-14 w-14",
  detail: "h-48 w-48",
} as const;

export function ProfilePandaPortrait({
  panda,
  size = "sidebar",
  isTrading = panda.is_trading,
  className,
}: ProfilePandaPortraitProps) {
  const stats = statsFromPandaSummary(panda);
  const frameClass = SIZE_CLASS[size];

  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-full border border-product-gold/20 bg-black/30",
        size === "detail" && "border-product-gold/25 shadow-[var(--glow-gold)]",
        frameClass,
        className,
      )}
    >
      <PandaCanvasRenderer
        stats={stats}
        showBackground
        renderOptions={PROFILE_PANDA_RENDER_OPTIONS}
        className="h-full w-full"
      />
      <span
        className={clsx(
          "absolute rounded-full ring-2 ring-black/70",
          size === "detail" ? "bottom-4 right-5 h-3.5 w-3.5 ring-4" : "bottom-1 right-1 h-2.5 w-2.5",
          isTrading ? "bg-product-green shadow-[0_0_8px_rgba(109,255,144,0.7)]" : "bg-product-muted",
        )}
      />
    </div>
  );
}

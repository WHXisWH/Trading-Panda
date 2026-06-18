"use client";

import { clsx } from "clsx";
import { PandaCanvasRenderer } from "@/components/panda/PandaCanvasRenderer";
import type { PandaCanvasRenderOptions } from "@/lib/pandaCanvasAssets";
import { WHY_PANDA } from "@/lib/landing/landingContent";

const WHY_RENDER_OPTIONS: PandaCanvasRenderOptions = {
  tierMode: "discrete",
  traitOpacityMode: "solid",
};

export function WhyPandaPortrait({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-3xl border border-product-green/35 bg-black/30 shadow-[0_0_32px_rgba(109,255,144,0.12)]",
        "h-24 w-24 sm:h-28 sm:w-28",
        className,
      )}
    >
      <PandaCanvasRenderer
        stats={WHY_PANDA.preset.stats}
        showBackground
        renderOptions={WHY_RENDER_OPTIONS}
        className="h-full w-full"
      />
      <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-product-green shadow-[0_0_8px_rgba(109,255,144,0.7)] ring-2 ring-black/70" />
    </div>
  );
}

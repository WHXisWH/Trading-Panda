"use client";

import { clsx } from "clsx";
import dynamic from "next/dynamic";
import { PandaCanvasRenderer } from "@/components/panda/PandaCanvasRenderer";
import { PandaVectorRenderer } from "@/components/panda/PandaVectorRenderer";
import {
  bodyLayers,
  patienceLayers,
  boldnessLayers,
  intuitionLayers,
  focusLayers,
  contrarianLayers,
} from "@/assets/pandaTraits";
import {
  getTraitTier,
  getGrowthStage,
  type PandaStats,
} from "@/utils/pandaHelper";
import type { PandaCanvasRenderOptions } from "@/lib/pandaCanvasAssets";

// Dynamically import the 3D Canvas with SSR disabled to prevent Next.js hydration mismatch
const Panda3DCanvas = dynamic(
  () => import("./Panda3DCanvas").then((mod) => mod.Panda3DCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-[#111215] text-[12px] text-ink-500">
        加载 3D 赛博引擎...
      </div>
    ),
  }
);

// Dynamically import the Rive Canvas with SSR disabled
const PandaRiveCanvas = dynamic(
  () => import("./PandaRiveCanvas").then((mod) => mod.PandaRiveCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-[#111215] text-[12px] text-ink-500">
        启动 Rive 骨骼引擎...
      </div>
    ),
  }
);

interface PandaSvgRendererProps {
  stats: PandaStats;
  className?: string;
  showBackground?: boolean;
  rendererType?: "canvas" | "pixel" | "vector" | "3d" | "rive";
  canvasRenderOptions?: PandaCanvasRenderOptions;
}

function LayerGroup({ html }: { html: string }) {
  if (!html) return null;
  return <g dangerouslySetInnerHTML={{ __html: html }} />;
}

export function PandaSvgRenderer({
  stats,
  className,
  showBackground = true,
  rendererType = "canvas",
  canvasRenderOptions,
}: PandaSvgRendererProps) {
  if (rendererType === "canvas") {
    return (
      <PandaCanvasRenderer
        stats={stats}
        showBackground={showBackground}
        className={className}
        renderOptions={canvasRenderOptions}
      />
    );
  }

  if (rendererType === "vector") {
    return (
      <PandaVectorRenderer
        stats={stats}
        showBackground={showBackground}
        className={className}
      />
    );
  }

  if (rendererType === "rive") {
    return (
      <div className={clsx("w-full max-w-[384px] aspect-square select-none", className)}>
        <PandaRiveCanvas stats={stats} showBackground={showBackground} />
      </div>
    );
  }

  if (rendererType === "3d") {
    return (
      <div className={clsx("w-full max-w-[384px] aspect-square select-none", className)}>
        <Panda3DCanvas stats={stats} showBackground={showBackground} />
      </div>
    );
  }

  if (rendererType === "pixel") {
    const growthStage = getGrowthStage(stats.experience);
    const patienceTier = getTraitTier(stats.patience);
    const boldnessTier = getTraitTier(stats.boldness);
    const focusTier = getTraitTier(stats.focus);
    const contrarianTier = getTraitTier(stats.contrarian);
    const intuitionOriginalTier = getTraitTier(stats.intuition);

    return (
      <div
        className={clsx(
          "pixel-panda aspect-square w-full max-w-[384px] select-none",
          className
        )}
      >
        <svg
          viewBox="0 0 96 96"
          xmlns="http://www.w3.org/2000/svg"
          shapeRendering="crispEdges"
          className="h-full w-full"
          role="img"
          aria-label="交易熊猫 (像素)"
        >
          {showBackground && (
            <rect width="96" height="96" fill="#efece3" rx="4" />
          )}

          <LayerGroup html={bodyLayers[growthStage]} />
          <LayerGroup html={contrarianLayers[contrarianTier]} />
          <LayerGroup html={focusLayers[focusTier]} />
          <LayerGroup html={intuitionLayers[intuitionOriginalTier]} />
          <LayerGroup html={boldnessLayers[boldnessTier]} />
          <LayerGroup html={patienceLayers[patienceTier]} />
        </svg>
      </div>
    );
  }
}

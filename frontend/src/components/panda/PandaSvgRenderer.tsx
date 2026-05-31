"use client";

import { clsx } from "clsx";
import {
  bodyLayers,
  patienceLayers,
  boldnessLayers,
  intuitionLayers,
  focusLayers,
  contrarianLayers,
  faceLayers,
} from "@/assets/pandaTraits";
import {
  getTraitTier,
  getGrowthStage,
  type PandaStats,
} from "@/utils/pandaHelper";

interface PandaSvgRendererProps {
  stats: PandaStats;
  className?: string;
  showBackground?: boolean;
}

function LayerGroup({ html }: { html: string }) {
  if (!html) return null;
  return <g dangerouslySetInnerHTML={{ __html: html }} />;
}

export function PandaSvgRenderer({
  stats,
  className,
  showBackground = true,
}: PandaSvgRendererProps) {
  const growthStage = getGrowthStage(stats.experience);
  const patienceTier = getTraitTier(stats.patience);
  const boldnessTier = getTraitTier(stats.boldness);
  const intuitionTier = getTraitTier(stats.intuition);
  const focusTier = getTraitTier(stats.focus);
  const contrarianTier = getTraitTier(stats.contrarian);

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
        aria-label="交易熊猫"
      >
        {showBackground && (
          <rect width="96" height="96" fill="#efece3" rx="4" />
        )}

        <LayerGroup html={bodyLayers[growthStage]} />
        <LayerGroup html={contrarianLayers[contrarianTier]} />
        <LayerGroup html={focusLayers[focusTier]} />
        <LayerGroup html={faceLayers[stats.emotion]} />
        <LayerGroup html={intuitionLayers[intuitionTier]} />
        <LayerGroup html={boldnessLayers[boldnessTier]} />
        <LayerGroup html={patienceLayers[patienceTier]} />
      </svg>
    </div>
  );
}

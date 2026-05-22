"use client";

import { clsx } from "clsx";
import {
  bodyLayers,
  patienceLayers,
  boldnessLayers,
  intuitionLayers,
  focusLayers,
  contrarianLayers,
  emotionLayers,
} from "@/assets/pandaTraits";
import {
  getTraitTier,
  getGrowthStage,
  emotionFilterParams,
  type PandaStats,
} from "@/utils/pandaHelper";

interface PandaSvgRendererProps {
  stats: PandaStats;
  className?: string;
  showBackground?: boolean;
}

function LayerGroup({ html }: { html: string }) {
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
  const filter = emotionFilterParams[stats.emotion];
  const inkBlurStdDev = filter.inkBlur;

  return (
    <div
      className={clsx(
        "aspect-square w-full max-w-[512px] select-none",
        className
      )}
    >
      <svg
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-md"
        role="img"
        aria-label="交易熊猫"
      >
        <defs>
          <filter id="ink-bleed" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={inkBlurStdDev}
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="ooze"
            />
            <feBlend in="SourceGraphic" in2="ooze" mode="normal" />
          </filter>
          <radialGradient id="ricePaperBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FAF9F5" />
            <stop offset="100%" stopColor="#EFECE3" />
          </radialGradient>
          <filter id="feibai" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.04"
              numOctaves={5}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={3}
            />
          </filter>
        </defs>

        {showBackground && (
          <rect width="512" height="512" fill="url(#ricePaperBg)" rx="24" />
        )}

        <g filter="url(#ink-bleed)" opacity={filter.opacity}>
          <LayerGroup html={bodyLayers[growthStage]} />
        </g>
        <LayerGroup html={contrarianLayers[contrarianTier]} />
        <LayerGroup html={focusLayers[focusTier]} />
        <LayerGroup html={emotionLayers[stats.emotion]} />
        <LayerGroup html={intuitionLayers[intuitionTier]} />
        <g filter="url(#feibai)">
          <LayerGroup html={boldnessLayers[boldnessTier]} />
        </g>
        <LayerGroup html={patienceLayers[patienceTier]} />
      </svg>
    </div>
  );
}

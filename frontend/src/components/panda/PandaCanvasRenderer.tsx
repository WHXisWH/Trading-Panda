"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import type { PandaStats } from "@/utils/pandaHelper";
import {
  canvasAssetPaths,
  type PandaCanvasAssetLayer,
  type PandaCanvasRenderOptions,
} from "@/lib/pandaCanvasAssets";
import {
  PANDA_CANVAS_SIZE,
  renderPandaCanvas,
  type LoadedPandaImageMap,
} from "@/lib/pandaCanvasDraw";

interface PandaCanvasRendererProps {
  stats: PandaStats;
  className?: string;
  showBackground?: boolean;
  renderOptions?: PandaCanvasRenderOptions;
  debugAssets?: PandaCanvasAssetLayer[];
}

type FailedImageMap = Record<string, true>;

const DEFAULT_RENDER_OPTIONS: PandaCanvasRenderOptions = {
  tierMode: "discrete",
};

export function PandaCanvasRenderer({
  stats,
  className,
  showBackground = true,
  renderOptions = DEFAULT_RENDER_OPTIONS,
  debugAssets,
}: PandaCanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [assetImages, setAssetImages] = useState<LoadedPandaImageMap>({});
  const [failedAssetImages, setFailedAssetImages] = useState<FailedImageMap>({});
  const [loadFailed, setLoadFailed] = useState(false);
  const assetPaths = useMemo(
    () => canvasAssetPaths(stats, renderOptions, debugAssets),
    [stats, renderOptions, debugAssets]
  );
  const assetPathKey = assetPaths.join("|");

  useEffect(() => {
    let cancelled = false;
    const missingPaths = assetPaths.filter(
      (path) => !assetImages[path] && !failedAssetImages[path]
    );

    missingPaths.forEach((path) => {
      const image = new Image();
      image.onload = () => {
        if (!cancelled) {
          setAssetImages((prev) => ({ ...prev, [path]: image }));
        }
      };
      image.onerror = () => {
        if (!cancelled) {
          setFailedAssetImages((prev) => ({ ...prev, [path]: true }));
          setLoadFailed(true);
        }
      };
      image.src = path;
    });

    return () => {
      cancelled = true;
    };
  }, [assetPathKey]);

  useEffect(() => {
    if (!canvasRef.current) return;
    renderPandaCanvas(
      canvasRef.current,
      assetImages,
      stats,
      showBackground,
      renderOptions,
      debugAssets,
      {
        pixelRatio:
          typeof window !== "undefined"
            ? Math.min(window.devicePixelRatio || 1, 2)
            : 1,
      }
    );
  }, [assetImages, stats, showBackground, renderOptions, debugAssets]);

  return (
    <div
      className={clsx(
        "canvas-panda aspect-square w-full max-w-[384px] select-none",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        width={PANDA_CANVAS_SIZE}
        height={PANDA_CANVAS_SIZE}
        className="h-full w-full object-contain"
        role="img"
        aria-label="Trading Panda canvas avatar"
      />
      {loadFailed && (
        <div className="flex h-full w-full items-center justify-center rounded-lg bg-neutral-50 text-[12px] text-neutral-500">
          熊猫素材加载失败
        </div>
      )}
    </div>
  );
}

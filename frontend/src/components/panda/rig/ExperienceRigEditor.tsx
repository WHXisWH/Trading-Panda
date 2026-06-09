"use client";

import NextImage from "next/image";
import {
  AlertCircle,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronsLeftRight,
  Copy,
  CheckCircle2,
  Eye,
  EyeOff,
  FileDown,
  Image as ImageIcon,
  Minus,
  Plus,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { clsx } from "clsx";
import {
  canvasSublayerAssetsFor,
  canvasSublayerOptions,
  type PandaCanvasAssetLayer,
  type PandaCanvasSublayerAttributeKey,
} from "@/lib/pandaCanvasAssets";
import {
  EXPERIENCE_RIG_HANDLE_KEYS,
  EXPERIENCE_RIG_LABELS,
  EXPERIENCE_RIG_POINT_KEYS,
  EXPERIENCE_RIG_RECT_KEYS,
  EXPERIENCE_RIG_TIERS,
  PANDA_RIG_CANVAS_SIZE,
  cloneExperienceRigManifest,
  createDefaultExperienceRigManifest,
  validateExperienceRigManifest,
  type ExperienceRigHandleKey,
  type ExperienceRigManifest,
  type ExperienceRigPoint,
  type ExperienceRigPointKey,
  type ExperienceRigRect,
  type ExperienceRigRectKey,
  type ExperienceRigTierKey,
  type ExperienceRigTierManifest,
} from "@/lib/pandaExperienceRig";
import {
  cloneSublayerPlacementManifest,
  createDefaultSublayerPlacementManifest,
  placementKeyFromSrc,
  validateSublayerPlacementManifest,
  type PandaSublayerPlacementManifest,
  type PandaSublayerPlacementRect,
} from "@/lib/pandaSublayerPlacement";

type DragMode = "move" | "resize-se";
type EditorMode = "base" | "placement";
type PlacementDragMode = "move" | "resize";

interface DragState {
  handle: ExperienceRigHandleKey;
  mode: DragMode;
  startPointer: ExperienceRigPoint;
  startRect?: ExperienceRigRect;
  startPoint?: ExperienceRigPoint;
}

interface PlacementDragState {
  mode: PlacementDragMode;
  startPointer: ExperienceRigPoint;
  startPlacement: PandaSublayerPlacementRect;
}

interface ExperienceRigEditorProps {
  initialManifest?: ExperienceRigManifest;
  initialPlacementManifest?: PandaSublayerPlacementManifest;
}

const RECT_COLORS: Record<ExperienceRigRectKey, string> = {
  faceRect: "#f97316",
  leftEye: "#22c55e",
  rightEye: "#22c55e",
  nose: "#38bdf8",
  mouth: "#ec4899",
  bodyRect: "#8b5cf6",
};

const POINT_COLORS: Record<ExperienceRigPointKey, string> = {
  headCenter: "#facc15",
  feetBase: "#14b8a6",
};

const MIN_RECT_SIZE = 6;

function clamp(value: number, min = 0, max = PANDA_RIG_CANVAS_SIZE): number {
  return Math.min(max, Math.max(min, value));
}

function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeRect(rect: ExperienceRigRect): ExperienceRigRect {
  const width = clamp(rect.width, MIN_RECT_SIZE, PANDA_RIG_CANVAS_SIZE);
  const height = clamp(rect.height, MIN_RECT_SIZE, PANDA_RIG_CANVAS_SIZE);
  return {
    x: roundCoord(clamp(rect.x, 0, PANDA_RIG_CANVAS_SIZE - width)),
    y: roundCoord(clamp(rect.y, 0, PANDA_RIG_CANVAS_SIZE - height)),
    width: roundCoord(width),
    height: roundCoord(height),
  };
}

function normalizePoint(point: ExperienceRigPoint): ExperienceRigPoint {
  return {
    x: roundCoord(clamp(point.x)),
    y: roundCoord(clamp(point.y)),
  };
}

function isRectKey(handle: ExperienceRigHandleKey): handle is ExperienceRigRectKey {
  return (EXPERIENCE_RIG_RECT_KEYS as string[]).includes(handle);
}

function isPointKey(handle: ExperienceRigHandleKey): handle is ExperienceRigPointKey {
  return (EXPERIENCE_RIG_POINT_KEYS as string[]).includes(handle);
}

function tierNumber(tier: ExperienceRigTierKey): number {
  return Number(tier.slice(-2));
}

function getPreviousTier(tier: ExperienceRigTierKey): ExperienceRigTierKey | null {
  const index = EXPERIENCE_RIG_TIERS.indexOf(tier);
  return index > 0 ? EXPERIENCE_RIG_TIERS[index - 1]! : null;
}

function pointerToRigPoint(
  event: React.PointerEvent<SVGElement>,
  svg: SVGSVGElement
): ExperienceRigPoint {
  const rect = svg.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * PANDA_RIG_CANVAS_SIZE),
    y: clamp(((event.clientY - rect.top) / rect.height) * PANDA_RIG_CANVAS_SIZE),
  };
}

function downloadJson(manifest: ExperienceRigManifest) {
  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "experience-rig.json";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPlacementJson(manifest: PandaSublayerPlacementManifest) {
  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sublayer-placement.json";
  a.click();
  URL.revokeObjectURL(url);
}

function normalizePlacementRect(
  rect: PandaSublayerPlacementRect
): PandaSublayerPlacementRect {
  const width = clamp(rect.width, MIN_RECT_SIZE, PANDA_RIG_CANVAS_SIZE * 2);
  const height = clamp(rect.height, MIN_RECT_SIZE, PANDA_RIG_CANVAS_SIZE * 2);
  return {
    x: roundCoord(clamp(rect.x, -PANDA_RIG_CANVAS_SIZE, PANDA_RIG_CANVAS_SIZE * 2)),
    y: roundCoord(clamp(rect.y, -PANDA_RIG_CANVAS_SIZE, PANDA_RIG_CANVAS_SIZE * 2)),
    width: roundCoord(width),
    height: roundCoord(height),
    rotation: roundCoord(rect.rotation ?? 0),
    opacity: Math.round(clamp(rect.opacity ?? 1, 0, 1) * 100) / 100,
  };
}

function rectCenter(rect: ExperienceRigRect): ExperienceRigPoint {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function rectTopCenter(rect: ExperienceRigRect): ExperienceRigPoint {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y,
  };
}

function rectBottomCenter(rect: ExperienceRigRect): ExperienceRigPoint {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height,
  };
}

function averagePoint(
  a: ExperienceRigPoint,
  b: ExperienceRigPoint
): ExperienceRigPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function pointWithOffset(
  point: ExperienceRigPoint,
  offset?: ExperienceRigPoint
): ExperienceRigPoint {
  if (!offset) return point;
  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
  };
}

function placementRectScale(
  current: ExperienceRigRect,
  baseline: ExperienceRigRect
): number {
  const widthScale = baseline.width === 0 ? 1 : current.width / baseline.width;
  const heightScale = baseline.height === 0 ? 1 : current.height / baseline.height;
  return Math.sqrt(Math.max(0.01, widthScale * heightScale));
}

function anchorForPlacementAsset(
  asset: PandaCanvasAssetLayer,
  rig: ExperienceRigTierManifest
): { point: ExperienceRigPoint; rect: ExperienceRigRect } {
  const leftEyeCenter = rectCenter(rig.leftEye);
  const rightEyeCenter = rectCenter(rig.rightEye);
  const eyesMidpoint = averagePoint(leftEyeCenter, rightEyeCenter);
  const upperBodyRect = {
    x: rig.bodyRect.x,
    y: rig.bodyRect.y,
    width: rig.bodyRect.width,
    height: rig.bodyRect.height * 0.45,
  };

  switch (asset.anchorPolicy) {
    case "faceTopCenter":
      return {
        point: pointWithOffset(rectTopCenter(rig.faceRect), asset.anchorOffset),
        rect: rig.faceRect,
      };
    case "leftEyeCenter":
      return {
        point: pointWithOffset(leftEyeCenter, asset.anchorOffset),
        rect: rig.leftEye,
      };
    case "rightEyeCenter":
      return {
        point: pointWithOffset(rightEyeCenter, asset.anchorOffset),
        rect: rig.rightEye,
      };
    case "eyesMidpoint":
      return {
        point: pointWithOffset(eyesMidpoint, asset.anchorOffset),
        rect: rig.faceRect,
      };
    case "mouthCenter":
      return {
        point: pointWithOffset(rectCenter(rig.mouth), asset.anchorOffset),
        rect: rig.mouth,
      };
    case "bodyCenter":
      return {
        point: pointWithOffset(rectCenter(rig.bodyRect), asset.anchorOffset),
        rect: rig.bodyRect,
      };
    case "upperBodyCenter":
      return {
        point: pointWithOffset(rectCenter(upperBodyRect), asset.anchorOffset),
        rect: upperBodyRect,
      };
    case "feetBase":
      return {
        point: pointWithOffset(rig.feetBase, asset.anchorOffset),
        rect: rig.bodyRect,
      };
    case "headCenterOffset":
      return {
        point: pointWithOffset(rig.headCenter, asset.anchorOffset),
        rect: rig.faceRect,
      };
    case "worldAura":
      return {
        point: pointWithOffset(rectCenter(rig.bodyRect), asset.anchorOffset),
        rect: rig.bodyRect,
      };
    default:
      return { point: rectBottomCenter(rig.bodyRect), rect: rig.bodyRect };
  }
}

function automaticPlacementForAsset(
  asset: PandaCanvasAssetLayer,
  currentRig: ExperienceRigTierManifest,
  baselineRig: ExperienceRigTierManifest
): PandaSublayerPlacementRect {
  const sourceAnchor = anchorForPlacementAsset(asset, baselineRig);
  const targetAnchor = anchorForPlacementAsset(asset, currentRig);
  const scale = placementRectScale(targetAnchor.rect, sourceAnchor.rect);
  const source = asset.pivot ?? sourceAnchor.point;
  return normalizePlacementRect({
    x: targetAnchor.point.x - source.x * scale,
    y: targetAnchor.point.y - source.y * scale,
    width: PANDA_RIG_CANVAS_SIZE * scale,
    height: PANDA_RIG_CANVAS_SIZE * scale,
    rotation: 0,
    opacity: 1,
  });
}

function buildTierErrorMap(errors: string[]): Record<ExperienceRigTierKey, string[]> {
  const map = {} as Record<ExperienceRigTierKey, string[]>;
  for (const item of EXPERIENCE_RIG_TIERS) {
    map[item] = [];
  }

  for (const error of errors) {
    const match = error.match(/^(tier-\d{2})\./);
    if (!match) continue;
    const tier = match[1] as ExperienceRigTierKey;
    map[tier]?.push(error.slice(match[0].length));
  }

  return map;
}

function StatusPill({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        OK
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
      <AlertCircle className="h-3.5 w-3.5" />
      {count}
    </span>
  );
}

function TierAtlas({
  manifest,
  activeTier,
  validationErrorMap,
  onSelectTier,
}: {
  manifest: ExperienceRigManifest;
  activeTier: ExperienceRigTierKey;
  validationErrorMap: Record<ExperienceRigTierKey, string[]>;
  onSelectTier: (tier: ExperienceRigTierKey) => void;
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Tiers</h2>
        </div>
        <StatusPill count={validationErrorMap[activeTier].length} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10">
        {EXPERIENCE_RIG_TIERS.map((item) => {
          const isActive = item === activeTier;
          const errors = validationErrorMap[item];
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelectTier(item)}
              className={clsx(
                "group flex flex-col gap-2 rounded-lg border p-2 text-left transition",
                isActive
                  ? "border-ink-900 bg-ink-50 shadow-sm"
                  : "border-[var(--color-border)] bg-paper-card hover:border-ink-300 hover:bg-white"
              )}
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-paper">
                <NextImage
                  src={manifest.tiers[item].image}
                  alt={item}
                  fill
                  sizes="(min-width: 1536px) 8vw, (min-width: 1280px) 16vw, (min-width: 768px) 30vw, 50vw"
                  className="object-contain"
                  unoptimized
                />
                <div className="absolute left-2 top-2">
                  <span className="inline-flex rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-ink-800 shadow-sm">
                    {item.slice(-2)}
                  </span>
                </div>
                <div className="absolute right-2 top-2">
                  <StatusPill count={errors.length} />
                </div>
                {isActive && (
                  <div className="absolute inset-0 rounded-md ring-2 ring-ink-900" />
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-ink-600">{item}</span>
                <span className="text-[11px] text-ink-500">
                  {isActive ? "当前" : `${errors.length} issues`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ExperienceRigEditor({
  initialManifest,
  initialPlacementManifest,
}: ExperienceRigEditorProps) {
  const [manifest, setManifest] = useState<ExperienceRigManifest>(() =>
    initialManifest
      ? cloneExperienceRigManifest(initialManifest)
      : createDefaultExperienceRigManifest()
  );
  const [placementManifest, setPlacementManifest] =
    useState<PandaSublayerPlacementManifest>(() =>
      initialPlacementManifest
        ? cloneSublayerPlacementManifest(initialPlacementManifest)
        : createDefaultSublayerPlacementManifest()
    );
  const [mode, setMode] = useState<EditorMode>("base");
  const [tier, setTier] = useState<ExperienceRigTierKey>("tier-01");
  const [referenceTier, setReferenceTier] =
    useState<ExperienceRigTierKey>("tier-05");
  const sublayerOptions = useMemo(() => canvasSublayerOptions(), []);
  const [placementAttribute, setPlacementAttribute] =
    useState<PandaCanvasSublayerAttributeKey>(
      sublayerOptions[0]?.attribute ?? "emotion"
    );
  const [placementSublayer, setPlacementSublayer] = useState(
    sublayerOptions[0]?.sublayer ?? "eyes"
  );
  const [placementAssetTier, setPlacementAssetTier] = useState(1);
  const [selected, setSelected] =
    useState<ExperienceRigHandleKey>("faceRect");
  const [showOverlay, setShowOverlay] = useState(true);
  const [imageOpacity, setImageOpacity] = useState(0.92);
  const [showMaskPreview, setShowMaskPreview] = useState(true);
  const [showEmotionPreview, setShowEmotionPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPlacement, setIsSavingPlacement] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [placementDragState, setPlacementDragState] =
    useState<PlacementDragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const placementSvgRef = useRef<SVGSVGElement | null>(null);

  const activeTier = manifest.tiers[tier];
  const referenceTierManifest = manifest.tiers[referenceTier];
  const baselineTierManifest = manifest.tiers["tier-05"];
  const activePlacementAssets = useMemo(
    () =>
      canvasSublayerAssetsFor(
        placementAttribute,
        placementSublayer,
        placementAssetTier
      ),
    [placementAttribute, placementAssetTier, placementSublayer]
  );
  const activePlacementAsset = activePlacementAssets[0];
  const activePlacementKey = activePlacementAsset
    ? placementKeyFromSrc(activePlacementAsset.src)
    : "";
  const automaticPlacement =
    activePlacementAsset && activeTier && baselineTierManifest
      ? automaticPlacementForAsset(
          activePlacementAsset,
          activeTier,
          baselineTierManifest
        )
      : null;
  const activePlacement =
    (activePlacementKey && placementManifest.placements[activePlacementKey]?.[tier]) ||
    automaticPlacement;
  const jsonPreview = useMemo(
    () => JSON.stringify(activeTier, null, 2),
    [activeTier]
  );
  const fullJson = useMemo(() => JSON.stringify(manifest, null, 2), [manifest]);
  const placementJsonPreview = useMemo(
    () =>
      activePlacementKey
        ? JSON.stringify(placementManifest.placements[activePlacementKey] ?? {}, null, 2)
        : "{}",
    [activePlacementKey, placementManifest]
  );
  const placementFullJson = useMemo(
    () => JSON.stringify(placementManifest, null, 2),
    [placementManifest]
  );
  const previousTier = getPreviousTier(tier);
  const validationErrors = useMemo(
    () => validateExperienceRigManifest(manifest),
    [manifest]
  );
  const validationErrorMap = useMemo(
    () => buildTierErrorMap(validationErrors),
    [validationErrors]
  );
  const globalValidationErrors = validationErrors.filter(
    (error) => !error.startsWith("tier-")
  );
  const placementValidationErrors = useMemo(
    () => validateSublayerPlacementManifest(placementManifest),
    [placementManifest]
  );
  const hasActivePlacementOverride = Boolean(
    activePlacementKey && placementManifest.placements[activePlacementKey]?.[tier]
  );

  const updateTier = useCallback(
    (
      updater: (
        current: ExperienceRigTierManifest
      ) => ExperienceRigTierManifest
    ) => {
      setManifest((current) => {
        const next = cloneExperienceRigManifest(current);
        next.tiers[tier] = updater(next.tiers[tier]);
        return next;
      });
    },
    [tier]
  );

  const updatePlacement = useCallback(
    (
      updater: (
        current: PandaSublayerPlacementRect
      ) => PandaSublayerPlacementRect
    ) => {
      if (!activePlacementAsset || !activePlacementKey) return;
      setPlacementManifest((current) => {
        const next = cloneSublayerPlacementManifest(current);
        const currentRect =
          next.placements[activePlacementKey]?.[tier] ??
          automaticPlacementForAsset(
            activePlacementAsset,
            manifest.tiers[tier],
            manifest.tiers["tier-05"]
          );
        const nextRect = normalizePlacementRect(updater(currentRect));
        next.placements[activePlacementKey] = {
          ...(next.placements[activePlacementKey] ?? {}),
          [tier]: nextRect,
        };
        return next;
      });
    },
    [activePlacementAsset, activePlacementKey, manifest, tier]
  );

  const movePlacement = useCallback(
    (dx: number, dy: number) => {
      updatePlacement((current) => ({
        ...current,
        x: current.x + dx,
        y: current.y + dy,
      }));
    },
    [updatePlacement]
  );

  const resizePlacement = useCallback(
    (widthDelta: number, heightDelta: number) => {
      updatePlacement((current) => ({
        ...current,
        width: current.width + widthDelta,
        height: current.height + heightDelta,
      }));
    },
    [updatePlacement]
  );

  const resetPlacement = useCallback(() => {
    if (!activePlacementKey) return;
    setPlacementManifest((current) => {
      const next = cloneSublayerPlacementManifest(current);
      const byTier = { ...(next.placements[activePlacementKey] ?? {}) };
      delete byTier[tier];
      if (Object.keys(byTier).length === 0) {
        delete next.placements[activePlacementKey];
      } else {
        next.placements[activePlacementKey] = byTier;
      }
      return next;
    });
    toast.message("已移除当前 override");
  }, [activePlacementKey, tier]);

  const copyTierFrom = useCallback(
    (sourceTier: ExperienceRigTierKey) => {
      if (sourceTier === tier) return;
      setManifest((current) => {
        const next = cloneExperienceRigManifest(current);
        const image = next.tiers[tier].image;
        next.tiers[tier] = {
          image,
          faceRect: { ...next.tiers[sourceTier].faceRect },
          leftEye: { ...next.tiers[sourceTier].leftEye },
          rightEye: { ...next.tiers[sourceTier].rightEye },
          nose: { ...next.tiers[sourceTier].nose },
          mouth: { ...next.tiers[sourceTier].mouth },
          bodyRect: { ...next.tiers[sourceTier].bodyRect },
          headCenter: { ...next.tiers[sourceTier].headCenter },
          feetBase: { ...next.tiers[sourceTier].feetBase },
        };
        return next;
      });
      toast.message(`已复制 ${sourceTier} 到 ${tier}`);
    },
    [tier]
  );

  const moveHandle = useCallback(
    (handle: ExperienceRigHandleKey, dx: number, dy: number) => {
      updateTier((current) => {
        if (isRectKey(handle)) {
          return {
            ...current,
            [handle]: normalizeRect({
              ...current[handle],
              x: current[handle].x + dx,
              y: current[handle].y + dy,
            }),
          };
        }

        return {
          ...current,
          [handle]: normalizePoint({
            x: current[handle].x + dx,
            y: current[handle].y + dy,
          }),
        };
      });
    },
    [updateTier]
  );

  const resizeRect = useCallback(
    (handle: ExperienceRigRectKey, widthDelta: number, heightDelta: number) => {
      updateTier((current) => ({
        ...current,
        [handle]: normalizeRect({
          ...current[handle],
          width: current[handle].width + widthDelta,
          height: current[handle].height + heightDelta,
        }),
      }));
    },
    [updateTier]
  );

  const copyPreviousTier = useCallback(() => {
    if (!previousTier) return;
    copyTierFrom(previousTier);
  }, [copyTierFrom, previousTier]);

  const copyReferenceTier = useCallback(() => {
    copyTierFrom(referenceTier);
  }, [copyTierFrom, referenceTier]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      const step = event.shiftKey ? 5 : 1;
      if (mode === "placement") {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          movePlacement(-step, 0);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          movePlacement(step, 0);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          movePlacement(0, -step);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          movePlacement(0, step);
        } else if (event.key === "[") {
          event.preventDefault();
          resizePlacement(-step, -step);
        } else if (event.key === "]") {
          event.preventDefault();
          resizePlacement(step, step);
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveHandle(selected, -step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveHandle(selected, step, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHandle(selected, 0, -step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHandle(selected, 0, step);
      } else if (event.key === "[" && isRectKey(selected)) {
        event.preventDefault();
        resizeRect(selected, -step, -step);
      } else if (event.key === "]" && isRectKey(selected)) {
        event.preventDefault();
        resizeRect(selected, step, step);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    mode,
    moveHandle,
    movePlacement,
    resizePlacement,
    resizeRect,
    selected,
  ]);

  const handlePointerDown = (
    event: React.PointerEvent<SVGElement>,
    handle: ExperienceRigHandleKey,
    mode: DragMode
  ) => {
    const svg = svgRef.current;
    if (!svg) return;
    event.preventDefault();
    event.stopPropagation();
    svg.setPointerCapture(event.pointerId);
    setSelected(handle);

    const point = pointerToRigPoint(event, svg);
    setDragState({
      handle,
      mode,
      startPointer: point,
      startRect: isRectKey(handle) ? { ...activeTier[handle] } : undefined,
      startPoint: isPointKey(handle) ? { ...activeTier[handle] } : undefined,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !dragState) return;

    const point = pointerToRigPoint(event, svg);
    const dx = point.x - dragState.startPointer.x;
    const dy = point.y - dragState.startPointer.y;

    updateTier((current) => {
      if (isRectKey(dragState.handle) && dragState.startRect) {
        const nextRect =
          dragState.mode === "resize-se"
            ? normalizeRect({
                ...dragState.startRect,
                width: dragState.startRect.width + dx,
                height: dragState.startRect.height + dy,
              })
            : normalizeRect({
                ...dragState.startRect,
                x: dragState.startRect.x + dx,
                y: dragState.startRect.y + dy,
              });
        return { ...current, [dragState.handle]: nextRect };
      }

      if (isPointKey(dragState.handle) && dragState.startPoint) {
        return {
          ...current,
          [dragState.handle]: normalizePoint({
            x: dragState.startPoint.x + dx,
            y: dragState.startPoint.y + dy,
          }),
        };
      }

      return current;
    });
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
    setDragState(null);
  };

  const handlePlacementPointerDown = (
    event: React.PointerEvent<SVGElement>,
    mode: PlacementDragMode
  ) => {
    const svg = placementSvgRef.current;
    if (!svg || !activePlacement) return;
    event.preventDefault();
    event.stopPropagation();
    svg.setPointerCapture(event.pointerId);

    setPlacementDragState({
      mode,
      startPointer: pointerToRigPoint(event, svg),
      startPlacement: { ...activePlacement },
    });
  };

  const handlePlacementPointerMove = (
    event: React.PointerEvent<SVGSVGElement>
  ) => {
    const svg = placementSvgRef.current;
    if (!svg || !placementDragState) return;

    const point = pointerToRigPoint(event, svg);
    const dx = point.x - placementDragState.startPointer.x;
    const dy = point.y - placementDragState.startPointer.y;

    updatePlacement(() => {
      if (placementDragState.mode === "resize") {
        return {
          ...placementDragState.startPlacement,
          width: placementDragState.startPlacement.width + dx,
          height: placementDragState.startPlacement.height + dy,
        };
      }
      return {
        ...placementDragState.startPlacement,
        x: placementDragState.startPlacement.x + dx,
        y: placementDragState.startPlacement.y + dy,
      };
    });
  };

  const handlePlacementPointerUp = (
    event: React.PointerEvent<SVGSVGElement>
  ) => {
    if (placementSvgRef.current?.hasPointerCapture(event.pointerId)) {
      placementSvgRef.current.releasePointerCapture(event.pointerId);
    }
    setPlacementDragState(null);
  };

  const copyCurrentTierJson = async () => {
    await navigator.clipboard.writeText(jsonPreview);
    toast.message("已复制当前 tier JSON");
  };

  const copyFullJson = async () => {
    await navigator.clipboard.writeText(fullJson);
    toast.message("已复制完整 experience-rig.json");
  };

  const copyPlacementJson = async () => {
    await navigator.clipboard.writeText(placementJsonPreview);
    toast.message("已复制当前 placement JSON");
  };

  const copyFullPlacementJson = async () => {
    await navigator.clipboard.writeText(placementFullJson);
    toast.message("已复制完整 sublayer-placement.json");
  };

  const saveManifest = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/panda-lab/rig", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: fullJson,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "保存失败");
      }

      toast.success("已保存 experience-rig.json");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const savePlacementManifest = async () => {
    setIsSavingPlacement(true);
    try {
      const response = await fetch("/api/panda-lab/sublayer-placement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: placementFullJson,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "保存失败");
      }

      toast.success("已保存 sublayer-placement.json");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSavingPlacement(false);
    }
  };

  const updateNumericField = (
    handle: ExperienceRigHandleKey,
    field: "x" | "y" | "width" | "height",
    value: number
  ) => {
    updateTier((current) => {
      if (isRectKey(handle)) {
        return {
          ...current,
          [handle]: normalizeRect({
            ...current[handle],
            [field]: value,
          }),
        };
      }

      if (field === "width" || field === "height") return current;
      return {
        ...current,
        [handle]: normalizePoint({
          ...current[handle],
          [field]: value,
        }),
      };
    });
  };

  const updatePlacementNumericField = (
    field: keyof PandaSublayerPlacementRect,
    value: number
  ) => {
    updatePlacement((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const activeTierErrors = validationErrorMap[tier];
  const selectedIsRect = isRectKey(selected);
  const filteredSublayerOptions = sublayerOptions.filter(
    (item) => item.attribute === placementAttribute
  );
  const placementAttributeOptions = sublayerOptions
    .map((item) => item.attribute)
    .filter((item, index, list) => list.indexOf(item) === index);
  const activePlacementStatus = hasActivePlacementOverride ? "override" : "default";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink-900">
            Experience Rig 标注台
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
            <span>512x512</span>
            <span className="h-1 w-1 rounded-full bg-ink-300" />
            <span>{tier}</span>
            <span className="h-1 w-1 rounded-full bg-ink-300" />
            <span>{EXPERIENCE_RIG_LABELS[selected]}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-white p-1">
            {(["base", "placement"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition",
                  mode === item
                    ? "bg-ink-900 text-white"
                    : "text-ink-600 hover:bg-paper-card"
                )}
              >
                {item === "base" ? "Base Rig" : "Placement"}
              </button>
            ))}
          </div>
          <StatusPill
            count={
              mode === "base"
                ? validationErrors.length
                : placementValidationErrors.length
            }
          />
          {mode === "base" ? (
            <>
              <button
                type="button"
                onClick={() => downloadJson(manifest)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] text-ink-700 hover:bg-paper-card"
              >
                <FileDown className="h-4 w-4" />
                导出
              </button>
              <button
                type="button"
                onClick={saveManifest}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-bamboo-500 px-3 py-2 text-[13px] font-medium text-white hover:bg-bamboo-600 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "保存中" : "保存 JSON"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => downloadPlacementJson(placementManifest)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] text-ink-700 hover:bg-paper-card"
              >
                <FileDown className="h-4 w-4" />
                导出
              </button>
              <button
                type="button"
                onClick={savePlacementManifest}
                disabled={isSavingPlacement}
                className="inline-flex items-center gap-2 rounded-lg bg-bamboo-500 px-3 py-2 text-[13px] font-medium text-white hover:bg-bamboo-600 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSavingPlacement ? "保存中" : "保存 Placement"}
              </button>
            </>
          )}
        </div>
      </header>

      {mode === "base" && (
        <TierAtlas
          manifest={manifest}
          activeTier={tier}
          validationErrorMap={validationErrorMap}
          onSelectTier={setTier}
        />
      )}

      {mode === "base" ? (
      <section className="grid gap-5 xl:grid-cols-[minmax(520px,1fr)_390px]">
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">
                Tier {String(tierNumber(tier)).padStart(2, "0")}
              </h2>
              <p className="mt-1 break-all font-mono text-[11px] text-ink-500">
                {activeTier.image}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyPreviousTier}
                disabled={!previousTier}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-[12px] text-ink-700 hover:bg-paper-card disabled:opacity-40"
              >
                <ChevronsLeftRight className="h-4 w-4" />
                上一档
              </button>
              <label className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[12px] text-ink-700">
                基准
                <select
                  value={referenceTier}
                  onChange={(event) =>
                    setReferenceTier(event.target.value as ExperienceRigTierKey)
                  }
                  className="bg-transparent font-mono text-[12px] text-ink-900 outline-none"
                >
                  {EXPERIENCE_RIG_TIERS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={copyReferenceTier}
                disabled={referenceTier === tier}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-[12px] text-ink-700 hover:bg-paper-card disabled:opacity-40"
              >
                <Copy className="h-4 w-4" />
                复制基准
              </button>
            </div>
          </div>

          <div className="mx-auto aspect-square w-full max-w-[720px] overflow-hidden rounded-lg border border-ink-200 bg-[linear-gradient(45deg,#f7f3ea_25%,transparent_25%),linear-gradient(-45deg,#f7f3ea_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f7f3ea_75%),linear-gradient(-45deg,transparent_75%,#f7f3ea_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${PANDA_RIG_CANVAS_SIZE} ${PANDA_RIG_CANVAS_SIZE}`}
              role="img"
              aria-label="Experience rig landmark editor"
              className="h-full w-full touch-none select-none"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <rect width="512" height="512" fill="#f7f3ea" />
              <image
                href={activeTier.image}
                x="0"
                y="0"
                width="512"
                height="512"
                preserveAspectRatio="xMidYMid meet"
                opacity={imageOpacity}
              />

              {showMaskPreview && (
                <g opacity="0.28">
                  <rect
                    x={activeTier.faceRect.x}
                    y={activeTier.faceRect.y}
                    width={activeTier.faceRect.width}
                    height={activeTier.faceRect.height}
                    rx="18"
                    fill="#f8fafc"
                  />
                  <rect
                    x={activeTier.leftEye.x}
                    y={activeTier.leftEye.y}
                    width={activeTier.leftEye.width}
                    height={activeTier.leftEye.height}
                    rx="12"
                    fill="#111827"
                  />
                  <rect
                    x={activeTier.rightEye.x}
                    y={activeTier.rightEye.y}
                    width={activeTier.rightEye.width}
                    height={activeTier.rightEye.height}
                    rx="12"
                    fill="#111827"
                  />
                </g>
              )}

              {showEmotionPreview && (
                <g>
                  <ellipse
                    cx={activeTier.leftEye.x + activeTier.leftEye.width / 2}
                    cy={activeTier.leftEye.y + activeTier.leftEye.height / 2}
                    rx={Math.max(4, activeTier.leftEye.width * 0.18)}
                    ry={Math.max(4, activeTier.leftEye.height * 0.24)}
                    fill="#111827"
                  />
                  <ellipse
                    cx={activeTier.rightEye.x + activeTier.rightEye.width / 2}
                    cy={activeTier.rightEye.y + activeTier.rightEye.height / 2}
                    rx={Math.max(4, activeTier.rightEye.width * 0.18)}
                    ry={Math.max(4, activeTier.rightEye.height * 0.24)}
                    fill="#111827"
                  />
                  <path
                    d={`M ${activeTier.mouth.x + 8} ${
                      activeTier.mouth.y + activeTier.mouth.height * 0.45
                    } Q ${activeTier.mouth.x + activeTier.mouth.width / 2} ${
                      activeTier.mouth.y + activeTier.mouth.height * 0.9
                    } ${activeTier.mouth.x + activeTier.mouth.width - 8} ${
                      activeTier.mouth.y + activeTier.mouth.height * 0.45
                    }`}
                    fill="none"
                    stroke="#111827"
                    strokeLinecap="round"
                    strokeWidth="5"
                  />
                </g>
              )}

              {showOverlay && (
                <g>
                  {EXPERIENCE_RIG_RECT_KEYS.map((key) => {
                    const rect = activeTier[key];
                    const selectedRect = selected === key;
                    return (
                      <g key={key}>
                        <rect
                          x={rect.x}
                          y={rect.y}
                          width={rect.width}
                          height={rect.height}
                          rx="4"
                          fill="transparent"
                          stroke={RECT_COLORS[key]}
                          strokeWidth={selectedRect ? 3 : 2}
                          strokeDasharray={selectedRect ? "none" : "7 5"}
                          className="cursor-move"
                          onPointerDown={(event) =>
                            handlePointerDown(event, key, "move")
                          }
                        />
                        <rect
                          x={rect.x + rect.width - 9}
                          y={rect.y + rect.height - 9}
                          width="18"
                          height="18"
                          rx="3"
                          fill={RECT_COLORS[key]}
                          className="cursor-nwse-resize"
                          onPointerDown={(event) =>
                            handlePointerDown(event, key, "resize-se")
                          }
                        />
                        <text
                          x={rect.x}
                          y={Math.max(12, rect.y - 6)}
                          fill={RECT_COLORS[key]}
                          fontSize="12"
                          fontWeight="700"
                        >
                          {EXPERIENCE_RIG_LABELS[key]}
                        </text>
                      </g>
                    );
                  })}

                  {EXPERIENCE_RIG_POINT_KEYS.map((key) => {
                    const point = activeTier[key];
                    const selectedPoint = selected === key;
                    return (
                      <g key={key}>
                        <line
                          x1={point.x - 16}
                          y1={point.y}
                          x2={point.x + 16}
                          y2={point.y}
                          stroke={POINT_COLORS[key]}
                          strokeWidth={selectedPoint ? 3 : 2}
                        />
                        <line
                          x1={point.x}
                          y1={point.y - 16}
                          x2={point.x}
                          y2={point.y + 16}
                          stroke={POINT_COLORS[key]}
                          strokeWidth={selectedPoint ? 3 : 2}
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={selectedPoint ? 8 : 6}
                          fill={POINT_COLORS[key]}
                          stroke="#111827"
                          strokeWidth="2"
                          className="cursor-move"
                          onPointerDown={(event) =>
                            handlePointerDown(event, key, "move")
                          }
                        />
                        <text
                          x={point.x + 10}
                          y={point.y - 10}
                          fill={POINT_COLORS[key]}
                          fontSize="12"
                          fontWeight="700"
                        >
                          {EXPERIENCE_RIG_LABELS[key]}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--color-border)] bg-paper-card p-3">
              <div className="flex items-center justify-between gap-2 text-[12px] text-ink-600">
                <span>当前</span>
                <span className="font-mono">{tier}</span>
              </div>
              <div className="relative mt-2 aspect-square overflow-hidden rounded-md bg-white">
                <NextImage
                  src={activeTier.image}
                  alt={`${tier} preview`}
                  fill
                  sizes="(min-width: 1280px) 20vw, 50vw"
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-paper-card p-3">
              <div className="flex items-center justify-between gap-2 text-[12px] text-ink-600">
                <span>基准</span>
                <span className="font-mono">{referenceTier}</span>
              </div>
              <div className="relative mt-2 aspect-square overflow-hidden rounded-md bg-white">
                <NextImage
                  src={referenceTierManifest.image}
                  alt={`${referenceTier} reference`}
                  fill
                  sizes="(min-width: 1280px) 20vw, 50vw"
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink-900">显示</h2>
              <span className="font-mono text-[11px] text-ink-500">
                {Math.round(imageOpacity * 100)}%
              </span>
            </div>
            <div className="mt-3 grid gap-3 text-[13px] text-ink-700">
              <label className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  {showOverlay ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  Overlay
                </span>
                <input
                  type="checkbox"
                  checked={showOverlay}
                  onChange={(event) => setShowOverlay(event.target.checked)}
                  className="accent-bamboo-600"
                />
              </label>
              <label className="grid gap-2">
                <span className="inline-flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  底图透明度
                </span>
                <input
                  type="range"
                  min="0.15"
                  max="1"
                  step="0.01"
                  value={imageOpacity}
                  onChange={(event) => setImageOpacity(Number(event.target.value))}
                  className="accent-bamboo-600"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Mask preview</span>
                <input
                  type="checkbox"
                  checked={showMaskPreview}
                  onChange={(event) =>
                    setShowMaskPreview(event.target.checked)
                  }
                  className="accent-bamboo-600"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Emotion preview</span>
                <input
                  type="checkbox"
                  checked={showEmotionPreview}
                  onChange={(event) =>
                    setShowEmotionPreview(event.target.checked)
                  }
                  className="accent-bamboo-600"
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink-900">Landmark</h2>
              <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                {EXPERIENCE_RIG_LABELS[selected]}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {EXPERIENCE_RIG_HANDLE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={clsx(
                    "rounded-md px-3 py-2 text-left text-[12px] transition",
                    selected === key
                      ? "bg-ink-900 text-white"
                      : "border border-[var(--color-border)] text-ink-700 hover:bg-paper-card"
                  )}
                >
                  {EXPERIENCE_RIG_LABELS[key]}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-paper-card p-3">
              <div className="grid grid-cols-3 justify-items-center gap-2">
                <span />
                <button
                  type="button"
                  aria-label="move up"
                  onClick={() => moveHandle(selected, 0, -1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-ink-700 hover:bg-paper"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <span />
                <button
                  type="button"
                  aria-label="move left"
                  onClick={() => moveHandle(selected, -1, 0)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-ink-700 hover:bg-paper"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="move down"
                  onClick={() => moveHandle(selected, 0, 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-ink-700 hover:bg-paper"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="move right"
                  onClick={() => moveHandle(selected, 1, 0)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-ink-700 hover:bg-paper"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-label="shrink rectangle"
                  disabled={!selectedIsRect}
                  onClick={() => {
                    if (isRectKey(selected)) resizeRect(selected, -1, -1);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[12px] text-ink-700 hover:bg-paper disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                  尺寸
                </button>
                <button
                  type="button"
                  aria-label="grow rectangle"
                  disabled={!selectedIsRect}
                  onClick={() => {
                    if (isRectKey(selected)) resizeRect(selected, 1, 1);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[12px] text-ink-700 hover:bg-paper disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  尺寸
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["x", "y"] as const).map((field) => (
                <label key={field} className="grid gap-1 text-[12px] text-ink-500">
                  {field.toUpperCase()}
                  <input
                    type="number"
                    value={activeTier[selected][field]}
                    onChange={(event) =>
                      updateNumericField(
                        selected,
                        field,
                        Number(event.target.value)
                      )
                    }
                    className="rounded-md border border-[var(--color-border)] px-2 py-1.5 text-[13px] text-ink-900"
                  />
                </label>
              ))}
              {isRectKey(selected) &&
                (["width", "height"] as const).map((field) => (
                  <label
                    key={field}
                    className="grid gap-1 text-[12px] text-ink-500"
                  >
                    {field === "width" ? "W" : "H"}
                    <input
                      type="number"
                      value={activeTier[selected][field]}
                      onChange={(event) =>
                        updateNumericField(
                          selected,
                          field,
                          Number(event.target.value)
                        )
                      }
                      className="rounded-md border border-[var(--color-border)] px-2 py-1.5 text-[13px] text-ink-900"
                    />
                  </label>
                ))}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink-900">校验</h2>
              <StatusPill
                count={activeTierErrors.length + globalValidationErrors.length}
              />
            </div>
            <div className="mt-3 grid gap-2">
              {globalValidationErrors.length === 0 &&
                activeTierErrors.length === 0 && (
                  <p className="rounded-md bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                    当前 tier 通过
                  </p>
                )}
              {globalValidationErrors.map((error) => (
                <p
                  key={error}
                  className="rounded-md bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700"
                >
                  {error}
                </p>
              ))}
              {activeTierErrors.map((error) => (
                <p
                  key={error}
                  className="rounded-md bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700"
                >
                  {error}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink-900">JSON</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyCurrentTierJson}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[12px] text-ink-700 hover:bg-paper-card"
                >
                  <Copy className="h-3.5 w-3.5" />
                  当前
                </button>
                <button
                  type="button"
                  onClick={copyFullJson}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[12px] text-ink-700 hover:bg-paper-card"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  全量
                </button>
              </div>
            </div>
            <pre className="mt-3 max-h-[360px] overflow-auto rounded-md bg-ink-900 p-3 text-[11px] leading-5 text-paper">
              {jsonPreview}
            </pre>
          </section>
        </aside>
      </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(520px,1fr)_390px]">
          <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">
                  Sublayer Placement
                </h2>
                <p className="mt-1 break-all font-mono text-[11px] text-ink-500">
                  {activePlacementAsset?.src ?? "no asset"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    hasActivePlacementOverride
                      ? "bg-amber-50 text-amber-700"
                      : "bg-ink-50 text-ink-600"
                  )}
                >
                  {activePlacementStatus}
                </span>
                <button
                  type="button"
                  onClick={resetPlacement}
                  disabled={!hasActivePlacementOverride}
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-[12px] text-ink-700 hover:bg-paper-card disabled:opacity-40"
                >
                  重置
                </button>
              </div>
            </div>

            <div className="mx-auto aspect-square w-full max-w-[720px] overflow-hidden rounded-lg border border-ink-200 bg-[linear-gradient(45deg,#f7f3ea_25%,transparent_25%),linear-gradient(-45deg,#f7f3ea_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f7f3ea_75%),linear-gradient(-45deg,transparent_75%,#f7f3ea_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]">
              <svg
                ref={placementSvgRef}
                viewBox={`0 0 ${PANDA_RIG_CANVAS_SIZE} ${PANDA_RIG_CANVAS_SIZE}`}
                role="img"
                aria-label="Sublayer placement editor"
                className="h-full w-full touch-none select-none"
                onPointerMove={handlePlacementPointerMove}
                onPointerUp={handlePlacementPointerUp}
                onPointerCancel={handlePlacementPointerUp}
              >
                <rect width="512" height="512" fill="#f7f3ea" />
                <image
                  href={activeTier.image}
                  x="0"
                  y="0"
                  width="512"
                  height="512"
                  preserveAspectRatio="xMidYMid meet"
                  opacity={imageOpacity}
                />

                <g opacity="0.72">
                  <rect
                    x={activeTier.leftEye.x}
                    y={activeTier.leftEye.y}
                    width={activeTier.leftEye.width}
                    height={activeTier.leftEye.height}
                    rx="8"
                    fill="transparent"
                    stroke="#22c55e"
                    strokeDasharray="6 4"
                    strokeWidth="2"
                  />
                  <rect
                    x={activeTier.rightEye.x}
                    y={activeTier.rightEye.y}
                    width={activeTier.rightEye.width}
                    height={activeTier.rightEye.height}
                    rx="8"
                    fill="transparent"
                    stroke="#22c55e"
                    strokeDasharray="6 4"
                    strokeWidth="2"
                  />
                  <rect
                    x={activeTier.mouth.x}
                    y={activeTier.mouth.y}
                    width={activeTier.mouth.width}
                    height={activeTier.mouth.height}
                    rx="5"
                    fill="transparent"
                    stroke="#ec4899"
                    strokeDasharray="6 4"
                    strokeWidth="2"
                  />
                </g>

                {activePlacementAsset && activePlacement && (
                  <g
                    transform={`rotate(${activePlacement.rotation ?? 0} ${
                      activePlacement.x + activePlacement.width / 2
                    } ${activePlacement.y + activePlacement.height / 2})`}
                  >
                    <image
                      href={activePlacementAsset.src}
                      x={activePlacement.x}
                      y={activePlacement.y}
                      width={activePlacement.width}
                      height={activePlacement.height}
                      preserveAspectRatio="none"
                      opacity={activePlacement.opacity ?? 1}
                      className="cursor-move"
                      onPointerDown={(event) =>
                        handlePlacementPointerDown(event, "move")
                      }
                    />
                    <rect
                      x={activePlacement.x}
                      y={activePlacement.y}
                      width={activePlacement.width}
                      height={activePlacement.height}
                      rx="4"
                      fill="transparent"
                      stroke="#111827"
                      strokeWidth="2"
                      className="cursor-move"
                      onPointerDown={(event) =>
                        handlePlacementPointerDown(event, "move")
                      }
                    />
                    <rect
                      x={activePlacement.x + activePlacement.width - 9}
                      y={activePlacement.y + activePlacement.height - 9}
                      width="18"
                      height="18"
                      rx="3"
                      fill="#111827"
                      className="cursor-nwse-resize"
                      onPointerDown={(event) =>
                        handlePlacementPointerDown(event, "resize")
                      }
                    />
                  </g>
                )}
              </svg>
            </div>
          </div>

          <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
            <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-ink-900">选择</h2>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1 text-[12px] text-ink-500">
                  Attribute
                  <select
                    value={placementAttribute}
                    onChange={(event) => {
                      const nextAttribute = event.target
                        .value as PandaCanvasSublayerAttributeKey;
                      const nextSublayer =
                        sublayerOptions.find(
                          (item) => item.attribute === nextAttribute
                        )?.sublayer ?? "";
                      setPlacementAttribute(nextAttribute);
                      setPlacementSublayer(nextSublayer);
                    }}
                    className="rounded-md border border-[var(--color-border)] px-2 py-2 text-[13px] text-ink-900"
                  >
                    {placementAttributeOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[12px] text-ink-500">
                  Sublayer
                  <select
                    value={placementSublayer}
                    onChange={(event) => setPlacementSublayer(event.target.value)}
                    className="rounded-md border border-[var(--color-border)] px-2 py-2 text-[13px] text-ink-900"
                  >
                    {filteredSublayerOptions.map((item) => (
                      <option
                        key={`${item.attribute}/${item.sublayer}`}
                        value={item.sublayer}
                      >
                        {item.sublayer}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-[12px] text-ink-500">
                    Asset tier
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={placementAssetTier}
                      onChange={(event) =>
                        setPlacementAssetTier(
                          Math.min(10, Math.max(1, Number(event.target.value)))
                        )
                      }
                      className="rounded-md border border-[var(--color-border)] px-2 py-2 text-[13px] text-ink-900"
                    />
                  </label>
                  <label className="grid gap-1 text-[12px] text-ink-500">
                    Experience
                    <select
                      value={tier}
                      onChange={(event) =>
                        setTier(event.target.value as ExperienceRigTierKey)
                      }
                      className="rounded-md border border-[var(--color-border)] px-2 py-2 text-[13px] text-ink-900"
                    >
                      {EXPERIENCE_RIG_TIERS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-900">位置</h2>
                <span className="font-mono text-[11px] text-ink-500">
                  {activePlacementKey || "none"}
                </span>
              </div>

              <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-paper-card p-3">
                <div className="grid grid-cols-3 justify-items-center gap-2">
                  <span />
                  <button
                    type="button"
                    aria-label="move placement up"
                    onClick={() => movePlacement(0, -1)}
                    disabled={!activePlacementAsset}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-ink-700 hover:bg-paper disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <span />
                  <button
                    type="button"
                    aria-label="move placement left"
                    onClick={() => movePlacement(-1, 0)}
                    disabled={!activePlacementAsset}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-ink-700 hover:bg-paper disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="move placement down"
                    onClick={() => movePlacement(0, 1)}
                    disabled={!activePlacementAsset}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-ink-700 hover:bg-paper disabled:opacity-40"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="move placement right"
                    onClick={() => movePlacement(1, 0)}
                    disabled={!activePlacementAsset}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-ink-700 hover:bg-paper disabled:opacity-40"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-label="shrink placement"
                    onClick={() => resizePlacement(-1, -1)}
                    disabled={!activePlacementAsset}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[12px] text-ink-700 hover:bg-paper disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                    尺寸
                  </button>
                  <button
                    type="button"
                    aria-label="grow placement"
                    onClick={() => resizePlacement(1, 1)}
                    disabled={!activePlacementAsset}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[12px] text-ink-700 hover:bg-paper disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                    尺寸
                  </button>
                </div>
              </div>

              {activePlacement && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(["x", "y", "width", "height", "rotation", "opacity"] as const).map(
                    (field) => (
                      <label
                        key={field}
                        className="grid gap-1 text-[12px] text-ink-500"
                      >
                        {field}
                        <input
                          type="number"
                          step={field === "opacity" ? 0.05 : 1}
                          value={activePlacement[field] ?? (field === "opacity" ? 1 : 0)}
                          onChange={(event) =>
                            updatePlacementNumericField(
                              field,
                              Number(event.target.value)
                            )
                          }
                          className="rounded-md border border-[var(--color-border)] px-2 py-1.5 text-[13px] text-ink-900"
                        />
                      </label>
                    )
                  )}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-900">校验</h2>
                <StatusPill count={placementValidationErrors.length} />
              </div>
              <div className="mt-3 grid gap-2">
                {placementValidationErrors.length === 0 && (
                  <p className="rounded-md bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                    Placement JSON 通过
                  </p>
                )}
                {placementValidationErrors.map((error) => (
                  <p
                    key={error}
                    className="rounded-md bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700"
                  >
                    {error}
                  </p>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-900">JSON</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyPlacementJson}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[12px] text-ink-700 hover:bg-paper-card"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    当前
                  </button>
                  <button
                    type="button"
                    onClick={copyFullPlacementJson}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[12px] text-ink-700 hover:bg-paper-card"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    全量
                  </button>
                </div>
              </div>
              <pre className="mt-3 max-h-[320px] overflow-auto rounded-md bg-ink-900 p-3 text-[11px] leading-5 text-paper">
                {placementJsonPreview}
              </pre>
            </section>
          </aside>
        </section>
      )}
    </div>
  );
}

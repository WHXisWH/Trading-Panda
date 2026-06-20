import sublayerPlacementJson from "../../public/assets/panda/sublayer-placement.json";
import sublayerSourceBboxesJson from "../../public/assets/panda/sublayer-source-bboxes.json";
import {
  canvasTier,
  canvasEmotionAssets,
  canvasExperienceAsset,
  canvasLayerStates,
  canvasTraitAssetsForState,
  type PandaCanvasAssetLayer,
  type PandaCanvasLayerState,
  type PandaCanvasRenderOptions,
} from "@/lib/pandaCanvasAssets";
import {
  getBaselineExperienceRigTier,
  getExperienceRigForValue,
} from "@/lib/pandaExperienceRigManifest";
import type {
  ExperienceRigPoint,
  ExperienceRigRect,
  ExperienceRigTierKey,
  ExperienceRigTierManifest,
} from "@/lib/pandaExperienceRig";
import { experienceTierKeyFromNumber } from "@/lib/pandaExperienceRig";
import {
  createEmptySublayerSourceBboxManifest,
  isValidSublayerPlacementManifest,
  isValidSublayerSourceBboxManifest,
  placementKeyFromSrc,
  resolveSublayerPlacement,
  type PandaSublayerPlacementManifest,
  type PandaSublayerPlacementRect,
  type PandaSublayerSourceBboxManifest,
} from "@/lib/pandaSublayerPlacement";
import type { PandaStats } from "@/utils/pandaHelper";

export const PANDA_CANVAS_SIZE = 512;

export type LoadedPandaImageMap = Record<
  string,
  CanvasImageSource | HTMLImageElement
>;

type PandaCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const SUBLAYER_PLACEMENTS: PandaSublayerPlacementManifest =
  isValidSublayerPlacementManifest(sublayerPlacementJson)
    ? sublayerPlacementJson
    : {
        version: 1,
        coordinateSpace: {
          width: PANDA_CANVAS_SIZE,
          height: PANDA_CANVAS_SIZE,
          unit: "px",
        },
        placements: {},
      };
const SUBLAYER_SOURCE_BBOXES: PandaSublayerSourceBboxManifest =
  isValidSublayerSourceBboxManifest(sublayerSourceBboxesJson)
    ? sublayerSourceBboxesJson
    : createEmptySublayerSourceBboxManifest();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function drawPaperBackground(ctx: PandaCanvasContext) {
  const grad = ctx.createRadialGradient(256, 230, 40, 256, 256, 330);
  grad.addColorStop(0, "#fbfaf5");
  grad.addColorStop(0.72, "#f2eee5");
  grad.addColorStop(1, "#e8ddcc");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PANDA_CANVAS_SIZE, PANDA_CANVAS_SIZE);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#d0c2ac";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const y = 68 + i * 54;
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.bezierCurveTo(130, y - 18, 270, y + 22, 484, y - 8);
    ctx.stroke();
  }
  ctx.restore();
}

function placementForAsset(
  asset: PandaCanvasAssetLayer,
  experienceTierKey: ExperienceRigTierKey
): ReturnType<typeof resolveSublayerPlacement> {
  if (asset.attribute === "experience" || asset.attribute === "base") return null;
  const assetKey = placementKeyFromSrc(asset.src);
  return resolveSublayerPlacement(
    assetKey,
    experienceTierKey,
    SUBLAYER_PLACEMENTS,
    SUBLAYER_SOURCE_BBOXES
  );
}

function drawPlacementLayer(
  ctx: PandaCanvasContext,
  image: CanvasImageSource,
  placement: PandaSublayerPlacementRect,
  alpha: number
) {
  const opacity = placement.opacity ?? 1;
  const rotation = ((placement.rotation ?? 0) * Math.PI) / 180;
  const centerX = placement.x + placement.width / 2;
  const centerY = placement.y + placement.height / 2;

  ctx.save();
  ctx.globalAlpha = clamp(alpha * opacity, 0, 1);
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.drawImage(
    image,
    -placement.width / 2,
    -placement.height / 2,
    placement.width,
    placement.height
  );
  ctx.restore();
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

function averagePoint(a: ExperienceRigPoint, b: ExperienceRigPoint): ExperienceRigPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function rectScale(current: ExperienceRigRect, baseline: ExperienceRigRect): number {
  const widthScale = baseline.width === 0 ? 1 : current.width / baseline.width;
  const heightScale = baseline.height === 0 ? 1 : current.height / baseline.height;
  return Math.sqrt(Math.max(0.01, widthScale * heightScale));
}

function anchorForAsset(
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
    default:
      if (asset.attribute === "experience" || asset.attribute === "base") {
        return { point: rectCenter(rig.bodyRect), rect: rig.bodyRect };
      }
      return { point: rectBottomCenter(rig.bodyRect), rect: rig.bodyRect };
  }
}

function getRealRigTransform(
  asset: PandaCanvasAssetLayer,
  currentRig: ExperienceRigTierManifest,
  baselineRig: ExperienceRigTierManifest
) {
  if (asset.attribute === "experience" || asset.attribute === "base") {
    return {
      source: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
    };
  }

  const sourceAnchor = anchorForAsset(asset, baselineRig);
  const targetAnchor = anchorForAsset(asset, currentRig);
  return {
    source: asset.pivot ?? sourceAnchor.point,
    target: targetAnchor.point,
    scale: rectScale(targetAnchor.rect, sourceAnchor.rect),
    rotation: 0,
  };
}

function traitAssetOpacity(
  state: PandaCanvasLayerState,
  options: PandaCanvasRenderOptions
): number {
  const progressStrength =
    options.tierMode === "discrete" ? 1 : 0.55 + state.progress * 0.45;
  return state.alpha * progressStrength;
}

function drawAssetLayer(
  ctx: PandaCanvasContext,
  image: CanvasImageSource | undefined,
  asset: PandaCanvasAssetLayer,
  currentRig: ExperienceRigTierManifest,
  baselineRig: ExperienceRigTierManifest,
  experienceTierKey: ExperienceRigTierKey,
  alpha = 1
): boolean {
  if (!image) return false;
  const placement = placementForAsset(asset, experienceTierKey);
  if (placement) {
    drawPlacementLayer(ctx, image, placement.rect, alpha);
    return true;
  }

  const transform = getRealRigTransform(asset, currentRig, baselineRig);
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(transform.target.x, transform.target.y);
  ctx.rotate(transform.rotation);
  ctx.scale(transform.scale, transform.scale);
  ctx.translate(-transform.source.x, -transform.source.y);
  ctx.drawImage(image, 0, 0, PANDA_CANVAS_SIZE, PANDA_CANVAS_SIZE);
  ctx.restore();
  return true;
}

export interface RenderPandaCanvasOptions {
  pixelRatio?: number;
}

export function renderPandaCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  images: LoadedPandaImageMap,
  stats: PandaStats,
  showBackground: boolean,
  renderOptions: PandaCanvasRenderOptions,
  debugAssets?: PandaCanvasAssetLayer[],
  options: RenderPandaCanvasOptions = {}
) {
  const ratio = Math.min(options.pixelRatio ?? 1, 2);
  canvas.width = PANDA_CANVAS_SIZE * ratio;
  canvas.height = PANDA_CANVAS_SIZE * ratio;

  const ctx = canvas.getContext("2d") as PandaCanvasContext | null;
  if (!ctx) return;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, PANDA_CANVAS_SIZE, PANDA_CANVAS_SIZE);

  if (showBackground) {
    drawPaperBackground(ctx);
  }

  const currentRig = getExperienceRigForValue(
    stats.experience,
    renderOptions.tierMode
  );
  const experienceTierKey = experienceTierKeyFromNumber(canvasTier(stats.experience));
  const baselineRig = getBaselineExperienceRigTier();
  const states = canvasLayerStates(stats, renderOptions);
  const experienceAsset = canvasExperienceAsset(stats);
  const emotionAssets = canvasEmotionAssets(stats);

  const orderedAssets: Array<{ asset: PandaCanvasAssetLayer; alpha: number }> = [
    { asset: experienceAsset, alpha: 1 },
    ...(debugAssets
      ? debugAssets.map((asset) => ({ asset, alpha: 1 }))
      : [
          ...states.flatMap((state) =>
            canvasTraitAssetsForState(state).map((asset) => ({
              asset,
              alpha: traitAssetOpacity(state, renderOptions),
            }))
          ),
          ...emotionAssets.map((asset) => ({ asset, alpha: 1 })),
        ]),
  ].sort((a, b) => a.asset.zIndex - b.asset.zIndex);

  for (const { asset, alpha } of orderedAssets) {
    drawAssetLayer(
      ctx,
      images[asset.src],
      asset,
      currentRig,
      baselineRig,
      experienceTierKey,
      alpha
    );
  }
}

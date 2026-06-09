import { EXPERIENCE_RIG_TIERS, PANDA_RIG_CANVAS_SIZE, type ExperienceRigTierKey } from "@/lib/pandaExperienceRig";

export interface PandaSublayerPlacementRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
}

export type PandaSublayerPlacementByTier = Partial<
  Record<ExperienceRigTierKey, PandaSublayerPlacementRect>
>;

export interface PandaSublayerPlacementManifest {
  version: 1;
  coordinateSpace: {
    width: typeof PANDA_RIG_CANVAS_SIZE;
    height: typeof PANDA_RIG_CANVAS_SIZE;
    unit: "px";
  };
  placements: Record<string, PandaSublayerPlacementByTier>;
}

export function createDefaultSublayerPlacementManifest(): PandaSublayerPlacementManifest {
  return {
    version: 1,
    coordinateSpace: {
      width: PANDA_RIG_CANVAS_SIZE,
      height: PANDA_RIG_CANVAS_SIZE,
      unit: "px",
    },
    placements: {},
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidPlacementRect(value: unknown): value is PandaSublayerPlacementRect {
  const rect = value as PandaSublayerPlacementRect;
  return (
    Boolean(rect) &&
    isFiniteNumber(rect.x) &&
    isFiniteNumber(rect.y) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height) &&
    rect.width > 0 &&
    rect.height > 0 &&
    rect.x >= -PANDA_RIG_CANVAS_SIZE &&
    rect.y >= -PANDA_RIG_CANVAS_SIZE &&
    rect.x <= PANDA_RIG_CANVAS_SIZE * 2 &&
    rect.y <= PANDA_RIG_CANVAS_SIZE * 2 &&
    rect.width <= PANDA_RIG_CANVAS_SIZE * 2 &&
    rect.height <= PANDA_RIG_CANVAS_SIZE * 2 &&
    (rect.rotation === undefined || isFiniteNumber(rect.rotation)) &&
    (rect.opacity === undefined ||
      (isFiniteNumber(rect.opacity) && rect.opacity >= 0 && rect.opacity <= 1))
  );
}

export function placementKeyFromSrc(src: string): string {
  return src.replace(/^\/assets\/panda\//, "").replace(/\.png$/, "");
}

export function validateSublayerPlacementManifest(value: unknown): string[] {
  const errors: string[] = [];
  const manifest = value as PandaSublayerPlacementManifest;

  if (!manifest || manifest.version !== 1) {
    errors.push("version must be 1");
    return errors;
  }

  if (
    manifest.coordinateSpace?.width !== PANDA_RIG_CANVAS_SIZE ||
    manifest.coordinateSpace?.height !== PANDA_RIG_CANVAS_SIZE ||
    manifest.coordinateSpace?.unit !== "px"
  ) {
    errors.push("coordinateSpace must be 512x512 px");
  }

  if (!manifest.placements || typeof manifest.placements !== "object") {
    errors.push("placements must be an object");
    return errors;
  }

  for (const [assetKey, byTier] of Object.entries(manifest.placements)) {
    if (!assetKey || !byTier || typeof byTier !== "object" || Array.isArray(byTier)) {
      errors.push(`${assetKey || "<empty>"}.placements must be an object`);
      continue;
    }

    for (const [tier, rect] of Object.entries(byTier)) {
      if (!EXPERIENCE_RIG_TIERS.includes(tier as ExperienceRigTierKey)) {
        errors.push(`${assetKey}.${tier} is not a valid experience tier`);
        continue;
      }
      if (!isValidPlacementRect(rect)) {
        errors.push(`${assetKey}.${tier} must be a valid placement rect`);
      }
    }
  }

  return errors;
}

export function isValidSublayerPlacementManifest(
  value: unknown
): value is PandaSublayerPlacementManifest {
  return validateSublayerPlacementManifest(value).length === 0;
}

export function cloneSublayerPlacementManifest(
  manifest: PandaSublayerPlacementManifest
): PandaSublayerPlacementManifest {
  const placements: Record<string, PandaSublayerPlacementByTier> = {};
  for (const [assetKey, byTier] of Object.entries(manifest.placements)) {
    placements[assetKey] = {};
    for (const [tier, rect] of Object.entries(byTier)) {
      if (!rect) continue;
      placements[assetKey][tier as ExperienceRigTierKey] = { ...rect };
    }
  }

  return {
    version: manifest.version,
    coordinateSpace: { ...manifest.coordinateSpace },
    placements,
  };
}

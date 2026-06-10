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

export interface PandaSublayerSourceBboxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PandaSublayerSourceBboxEntry {
  canvasWidth: number;
  canvasHeight: number;
  alphaPixels: number;
  bbox: PandaSublayerSourceBboxRect | null;
  missing?: boolean;
}

export interface PandaSublayerSourceBboxManifest {
  version: 1;
  coordinateSpace: {
    width: typeof PANDA_RIG_CANVAS_SIZE;
    height: typeof PANDA_RIG_CANVAS_SIZE;
    unit: "px";
  };
  alphaThreshold: number;
  assets: Record<string, PandaSublayerSourceBboxEntry>;
}

export type PandaSublayerPlacementResolutionSource =
  | "exact"
  | "template-normalized"
  | "template";

export interface PandaSublayerPlacementResolution {
  rect: PandaSublayerPlacementRect;
  source: PandaSublayerPlacementResolutionSource;
  assetKey: string;
  templateAssetKey?: string;
  templateExperienceTierKey?: ExperienceRigTierKey;
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

export function createEmptySublayerSourceBboxManifest(): PandaSublayerSourceBboxManifest {
  return {
    version: 1,
    coordinateSpace: {
      width: PANDA_RIG_CANVAS_SIZE,
      height: PANDA_RIG_CANVAS_SIZE,
      unit: "px",
    },
    alphaThreshold: 8,
    assets: {},
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

function isValidSourceBboxRect(value: unknown): value is PandaSublayerSourceBboxRect {
  const rect = value as PandaSublayerSourceBboxRect;
  return (
    Boolean(rect) &&
    isFiniteNumber(rect.x) &&
    isFiniteNumber(rect.y) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function isValidSourceBboxEntry(value: unknown): value is PandaSublayerSourceBboxEntry {
  const entry = value as PandaSublayerSourceBboxEntry;
  return (
    Boolean(entry) &&
    isFiniteNumber(entry.canvasWidth) &&
    isFiniteNumber(entry.canvasHeight) &&
    entry.canvasWidth > 0 &&
    entry.canvasHeight > 0 &&
    isFiniteNumber(entry.alphaPixels) &&
    entry.alphaPixels >= 0 &&
    (entry.bbox === null || isValidSourceBboxRect(entry.bbox)) &&
    (entry.missing === undefined || typeof entry.missing === "boolean")
  );
}

export function placementKeyFromSrc(src: string): string {
  return src.replace(/^\/assets\/panda\//, "").replace(/\.png$/, "");
}

export function placementTemplateKeyForTier(
  assetKey: string,
  experienceTierKey: ExperienceRigTierKey
): string {
  return assetKey.replace(/tier-\d{2}$/, experienceTierKey);
}

export function placementGroupKey(assetKey: string): string {
  return assetKey.replace(/\/tier-\d{2}$/, "");
}

function clonePlacementRect(rect: PandaSublayerPlacementRect): PandaSublayerPlacementRect {
  return { ...rect };
}

function tierNumber(tierKey: ExperienceRigTierKey): number {
  return Number(tierKey.slice(-2));
}

function isExperienceTierKey(value: string): value is ExperienceRigTierKey {
  return EXPERIENCE_RIG_TIERS.includes(value as ExperienceRigTierKey);
}

function tierDistance(a: ExperienceRigTierKey, b: ExperienceRigTierKey): number {
  return Math.abs(tierNumber(a) - tierNumber(b));
}

function rectCenter(rect: PandaSublayerPlacementRect): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function sourceBboxCenter(entry: PandaSublayerSourceBboxEntry): { x: number; y: number } {
  if (!entry.bbox) {
    return {
      x: entry.canvasWidth / 2,
      y: entry.canvasHeight / 2,
    };
  }

  return {
    x: entry.bbox.x + entry.bbox.width / 2,
    y: entry.bbox.y + entry.bbox.height / 2,
  };
}

function rotateVector(point: { x: number; y: number }, rotationDegrees: number) {
  const radians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

function sourceAnchorLocalVector(
  entry: PandaSublayerSourceBboxEntry,
  rect: PandaSublayerPlacementRect
): { x: number; y: number } {
  const anchor = sourceBboxCenter(entry);
  return {
    x: (anchor.x / entry.canvasWidth) * rect.width - rect.width / 2,
    y: (anchor.y / entry.canvasHeight) * rect.height - rect.height / 2,
  };
}

function renderedSourceAnchor(
  rect: PandaSublayerPlacementRect,
  entry: PandaSublayerSourceBboxEntry
): { x: number; y: number } {
  const center = rectCenter(rect);
  const local = sourceAnchorLocalVector(entry, rect);
  const rotated = rotateVector(local, rect.rotation ?? 0);
  return {
    x: center.x + rotated.x,
    y: center.y + rotated.y,
  };
}

function normalizedPlacementFromTemplate(
  assetKey: string,
  templateAssetKey: string,
  templateRect: PandaSublayerPlacementRect,
  sourceBboxes: PandaSublayerSourceBboxManifest | null | undefined
): PandaSublayerPlacementRect | null {
  const currentEntry = sourceBboxes?.assets[assetKey];
  const templateEntry = sourceBboxes?.assets[templateAssetKey];

  if (
    !currentEntry ||
    !templateEntry ||
    currentEntry.missing ||
    templateEntry.missing ||
    !currentEntry.bbox ||
    !templateEntry.bbox
  ) {
    return null;
  }

  const targetAnchor = renderedSourceAnchor(templateRect, templateEntry);
  const currentLocal = sourceAnchorLocalVector(currentEntry, templateRect);
  const currentRotatedLocal = rotateVector(currentLocal, templateRect.rotation ?? 0);
  return {
    ...templateRect,
    x: targetAnchor.x - currentRotatedLocal.x - templateRect.width / 2,
    y: targetAnchor.y - currentRotatedLocal.y - templateRect.height / 2,
  };
}

interface TemplatePlacementCandidate {
  assetKey: string;
  experienceTierKey: ExperienceRigTierKey;
  rect: PandaSublayerPlacementRect;
}

function placementCandidateForKeyAndTier(
  manifest: PandaSublayerPlacementManifest,
  assetKey: string,
  tierKey: ExperienceRigTierKey
): TemplatePlacementCandidate | null {
  const rect = manifest.placements[assetKey]?.[tierKey];
  if (!rect) return null;
  return {
    assetKey,
    experienceTierKey: tierKey,
    rect,
  };
}

function nearestPlacementCandidateForKey(
  manifest: PandaSublayerPlacementManifest,
  assetKey: string,
  targetTierKey: ExperienceRigTierKey
): TemplatePlacementCandidate | null {
  const byTier = manifest.placements[assetKey];
  if (!byTier) return null;

  const candidates = Object.entries(byTier)
    .filter((entry): entry is [ExperienceRigTierKey, PandaSublayerPlacementRect] =>
      isExperienceTierKey(entry[0])
    )
    .sort(([tierA], [tierB]) => {
      const distance = tierDistance(tierA, targetTierKey) - tierDistance(tierB, targetTierKey);
      if (distance !== 0) return distance;
      return tierNumber(tierA) - tierNumber(tierB);
    });

  const nearest = candidates[0];
  if (!nearest) return null;
  return {
    assetKey,
    experienceTierKey: nearest[0],
    rect: nearest[1],
  };
}

function sameGroupPlacementCandidate(
  manifest: PandaSublayerPlacementManifest,
  assetKey: string,
  targetTierKey: ExperienceRigTierKey,
  requireTargetTier: boolean
): TemplatePlacementCandidate | null {
  const groupKey = placementGroupKey(assetKey);
  const candidates: TemplatePlacementCandidate[] = [];

  for (const [candidateAssetKey, byTier] of Object.entries(manifest.placements)) {
    if (placementGroupKey(candidateAssetKey) !== groupKey) continue;
    for (const [tierKey, rect] of Object.entries(byTier)) {
      if (!isExperienceTierKey(tierKey) || !rect) continue;
      if (requireTargetTier && tierKey !== targetTierKey) continue;
      candidates.push({
        assetKey: candidateAssetKey,
        experienceTierKey: tierKey,
        rect,
      });
    }
  }

  candidates.sort((a, b) => {
    const distance =
      tierDistance(a.experienceTierKey, targetTierKey) -
      tierDistance(b.experienceTierKey, targetTierKey);
    if (distance !== 0) return distance;
    return a.assetKey.localeCompare(b.assetKey);
  });

  return candidates[0] ?? null;
}

function resolveTemplatePlacementCandidate(
  assetKey: string,
  experienceTierKey: ExperienceRigTierKey,
  manifest: PandaSublayerPlacementManifest
): TemplatePlacementCandidate | null {
  const preferredTemplateKey = placementTemplateKeyForTier(assetKey, experienceTierKey);
  return (
    placementCandidateForKeyAndTier(manifest, preferredTemplateKey, experienceTierKey) ??
    sameGroupPlacementCandidate(manifest, assetKey, experienceTierKey, true) ??
    nearestPlacementCandidateForKey(manifest, preferredTemplateKey, experienceTierKey) ??
    sameGroupPlacementCandidate(manifest, assetKey, experienceTierKey, false)
  );
}

export function resolveSublayerPlacement(
  assetKey: string,
  experienceTierKey: ExperienceRigTierKey,
  placementManifest: PandaSublayerPlacementManifest,
  sourceBboxes?: PandaSublayerSourceBboxManifest | null
): PandaSublayerPlacementResolution | null {
  const exactPlacement = placementManifest.placements[assetKey]?.[experienceTierKey];
  if (exactPlacement) {
    return {
      rect: clonePlacementRect(exactPlacement),
      source: "exact",
      assetKey,
    };
  }

  const template = resolveTemplatePlacementCandidate(
    assetKey,
    experienceTierKey,
    placementManifest
  );
  if (!template) return null;

  const normalized = normalizedPlacementFromTemplate(
    assetKey,
    template.assetKey,
    template.rect,
    sourceBboxes
  );

  return {
    rect: clonePlacementRect(normalized ?? template.rect),
    source: normalized ? "template-normalized" : "template",
    assetKey,
    templateAssetKey: template.assetKey,
    templateExperienceTierKey: template.experienceTierKey,
  };
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

export function validateSublayerSourceBboxManifest(value: unknown): string[] {
  const errors: string[] = [];
  const manifest = value as PandaSublayerSourceBboxManifest;

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

  if (!isFiniteNumber(manifest.alphaThreshold) || manifest.alphaThreshold < 0) {
    errors.push("alphaThreshold must be a non-negative number");
  }

  if (!manifest.assets || typeof manifest.assets !== "object" || Array.isArray(manifest.assets)) {
    errors.push("assets must be an object");
    return errors;
  }

  for (const [assetKey, entry] of Object.entries(manifest.assets)) {
    if (!assetKey) {
      errors.push("asset key must not be empty");
      continue;
    }
    if (!isValidSourceBboxEntry(entry)) {
      errors.push(`${assetKey} must be a valid source bbox entry`);
    }
  }

  return errors;
}

export function isValidSublayerPlacementManifest(
  value: unknown
): value is PandaSublayerPlacementManifest {
  return validateSublayerPlacementManifest(value).length === 0;
}

export function isValidSublayerSourceBboxManifest(
  value: unknown
): value is PandaSublayerSourceBboxManifest {
  return validateSublayerSourceBboxManifest(value).length === 0;
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

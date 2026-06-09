import sublayerManifestJson from "../../public/assets/panda/sublayer-manifest.json";
import type { PandaEmotion, PandaStats } from "@/utils/pandaHelper";
import type { PandaPoint } from "@/lib/pandaRig";

export type PandaCanvasTraitKey =
  | "boldness"
  | "patience"
  | "intuition"
  | "focus"
  | "contrarian";

export type PandaCanvasAttributeKey =
  | PandaCanvasTraitKey
  | "experience"
  | "emotion";

export type PandaCanvasSublayerAttributeKey = PandaCanvasTraitKey | "emotion";
export type PandaCanvasDisplayMode = "top2" | "all";
export type PandaCanvasTierMode = "discrete" | "progressive";
export type PandaCanvasOpacityRule =
  | "base"
  | "trait"
  | "experience"
  | "emotion"
  | "aura";

export type PandaCanvasAnchorPolicy =
  | "faceTopCenter"
  | "leftEyeCenter"
  | "rightEyeCenter"
  | "eyesMidpoint"
  | "mouthCenter"
  | "bodyCenter"
  | "upperBodyCenter"
  | "feetBase"
  | "headCenterOffset"
  | "worldAura";

export type PandaCanvasBboxPolicy =
  | "fullExperience"
  | "headband"
  | "cape"
  | "weaponSide"
  | "auraPeripheral"
  | "bodySideMark"
  | "monocle"
  | "chestCore"
  | "intuitionNoFaceFeatures"
  | "groundProp"
  | "groundSideProp"
  | "emotionEyes"
  | "emotionBrows"
  | "emotionMouth"
  | "emotionExtras";

export interface PandaCanvasRenderOptions {
  displayMode: PandaCanvasDisplayMode;
  tierMode: PandaCanvasTierMode;
}

export interface PandaCanvasLayerState {
  key: PandaCanvasTraitKey;
  value: number;
  tier: number;
  score: number;
  progress: number;
  alpha: number;
  major: boolean;
  rank: number;
}

export interface PandaCanvasAssetLayer {
  src: string;
  attribute: PandaCanvasAttributeKey | "base";
  tier?: number;
  sublayer?: string;
  anchorPolicy?: PandaCanvasAnchorPolicy;
  anchorOffset?: PandaPoint;
  pivot?: PandaPoint;
  zIndex: number;
  opacityRule: PandaCanvasOpacityRule;
  bboxPolicy?: PandaCanvasBboxPolicy;
  role: string;
}

export interface PandaSublayerManifestLayer {
  attribute: PandaCanvasSublayerAttributeKey;
  sublayer: string;
  tier: number;
  src: string;
  anchorPolicy: PandaCanvasAnchorPolicy;
  anchorOffset?: PandaPoint;
  zIndex: number;
  opacityRule: PandaCanvasOpacityRule;
  bboxPolicy: PandaCanvasBboxPolicy;
  role: string;
}

export interface PandaSublayerManifest {
  version: 1;
  coordinateSpace: {
    width: 512;
    height: 512;
    unit: "px";
  };
  sourceImageSize: {
    width: number;
    height: number;
    unit: "px";
  };
  anchorPolicies: PandaCanvasAnchorPolicy[];
  bboxPolicies: PandaCanvasBboxPolicy[];
  legacyFallbacks: {
    status: "temporary-fallback";
    compatibilityStrategy: string;
    directories: string[];
  };
  layers: PandaSublayerManifestLayer[];
}

export const PANDA_CANVAS_TRAITS: PandaCanvasTraitKey[] = [
  "boldness",
  "patience",
  "intuition",
  "focus",
  "contrarian",
];

export const PANDA_CANVAS_ANCHOR_POLICIES: PandaCanvasAnchorPolicy[] = [
  "faceTopCenter",
  "leftEyeCenter",
  "rightEyeCenter",
  "eyesMidpoint",
  "mouthCenter",
  "bodyCenter",
  "upperBodyCenter",
  "feetBase",
  "headCenterOffset",
  "worldAura",
];

export const PANDA_CANVAS_BBOX_POLICIES: PandaCanvasBboxPolicy[] = [
  "fullExperience",
  "headband",
  "cape",
  "weaponSide",
  "auraPeripheral",
  "bodySideMark",
  "monocle",
  "chestCore",
  "intuitionNoFaceFeatures",
  "groundProp",
  "groundSideProp",
  "emotionEyes",
  "emotionBrows",
  "emotionMouth",
  "emotionExtras",
];

export const PANDA_EMOTION_TIER_MAP: Record<PandaEmotion, number> = {
  numb: 1,
  calm: 3,
  cautious: 4,
  excited: 6,
  frustrated: 7,
  greedy: 8,
  panic: 10,
};

export const PANDA_EMOTION_TIER_LABELS: Record<number, string> = {
  1: "麻木空洞",
  2: "低能量平静",
  3: "平静",
  4: "谨慎",
  5: "专注",
  6: "兴奋",
  7: "烦躁",
  8: "贪婪",
  9: "紧张",
  10: "恐慌",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tierPath(base: string, tier: number): string {
  return `${base}/tier-${String(tier).padStart(2, "0")}.png`;
}

function buildTierAssetMap(
  base: string,
  options: Omit<PandaCanvasAssetLayer, "src" | "tier">
): Record<number, PandaCanvasAssetLayer> {
  const map: Record<number, PandaCanvasAssetLayer> = {};
  for (let tier = 1; tier <= 10; tier += 1) {
    map[tier] = {
      ...options,
      tier,
      src: tierPath(base, tier),
    };
  }
  return map;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTier(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10;
}

function isPoint(value: unknown): value is PandaPoint {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y)
  );
}

function isTrait(value: unknown): value is PandaCanvasTraitKey {
  return typeof value === "string" && PANDA_CANVAS_TRAITS.includes(value as PandaCanvasTraitKey);
}

function isSublayerAttribute(value: unknown): value is PandaCanvasSublayerAttributeKey {
  return value === "emotion" || isTrait(value);
}

function isAnchorPolicy(value: unknown): value is PandaCanvasAnchorPolicy {
  return (
    typeof value === "string" &&
    PANDA_CANVAS_ANCHOR_POLICIES.includes(value as PandaCanvasAnchorPolicy)
  );
}

function isBboxPolicy(value: unknown): value is PandaCanvasBboxPolicy {
  return (
    typeof value === "string" &&
    PANDA_CANVAS_BBOX_POLICIES.includes(value as PandaCanvasBboxPolicy)
  );
}

function isOpacityRule(value: unknown): value is PandaCanvasOpacityRule {
  return (
    value === "base" ||
    value === "trait" ||
    value === "experience" ||
    value === "emotion" ||
    value === "aura"
  );
}

function isManifestLayer(value: unknown): value is PandaSublayerManifestLayer {
  return (
    isRecord(value) &&
    isSublayerAttribute(value.attribute) &&
    typeof value.sublayer === "string" &&
    value.sublayer.length > 0 &&
    isTier(value.tier) &&
    typeof value.src === "string" &&
    value.src.startsWith("/assets/panda/") &&
    isAnchorPolicy(value.anchorPolicy) &&
    (value.anchorOffset === undefined || isPoint(value.anchorOffset)) &&
    typeof value.zIndex === "number" &&
    Number.isFinite(value.zIndex) &&
    isOpacityRule(value.opacityRule) &&
    isBboxPolicy(value.bboxPolicy) &&
    typeof value.role === "string" &&
    value.role.length > 0
  );
}

export function isValidSublayerManifest(
  value: unknown
): value is PandaSublayerManifest {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!isRecord(value.coordinateSpace)) return false;
  if (
    value.coordinateSpace.width !== 512 ||
    value.coordinateSpace.height !== 512 ||
    value.coordinateSpace.unit !== "px"
  ) {
    return false;
  }
  if (!isRecord(value.sourceImageSize)) return false;
  if (
    typeof value.sourceImageSize.width !== "number" ||
    typeof value.sourceImageSize.height !== "number" ||
    value.sourceImageSize.unit !== "px"
  ) {
    return false;
  }
  if (!isRecord(value.legacyFallbacks)) return false;
  if (value.legacyFallbacks.status !== "temporary-fallback") return false;
  if (!Array.isArray(value.legacyFallbacks.directories)) return false;
  if (!Array.isArray(value.layers)) return false;
  if (!value.layers.every(isManifestLayer)) return false;

  const seen = new Set<string>();
  for (const layer of value.layers) {
    const key = `${layer.attribute}/${layer.sublayer}/tier-${layer.tier}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

const EMPTY_SUBLAYER_MANIFEST: PandaSublayerManifest = {
  version: 1,
  coordinateSpace: { width: 512, height: 512, unit: "px" },
  sourceImageSize: { width: 512, height: 512, unit: "px" },
  anchorPolicies: PANDA_CANVAS_ANCHOR_POLICIES,
  bboxPolicies: PANDA_CANVAS_BBOX_POLICIES,
  legacyFallbacks: {
    status: "temporary-fallback",
    compatibilityStrategy:
      "Sublayer manifest failed validation; renderer keeps only the experience base and must not load legacy broad-layer assets.",
    directories: [
      "traits/boldness/tier-*.png",
      "traits/intuition/tier-*.png",
      "emotions/tier-*.png",
    ],
  },
  layers: [],
};

export const PANDA_SUBLAYER_MANIFEST: PandaSublayerManifest =
  isValidSublayerManifest(sublayerManifestJson)
    ? sublayerManifestJson
    : EMPTY_SUBLAYER_MANIFEST;

function emptyTraitSublayers(): Record<
  PandaCanvasTraitKey,
  Record<number, PandaCanvasAssetLayer[]>
> {
  const result = {} as Record<PandaCanvasTraitKey, Record<number, PandaCanvasAssetLayer[]>>;
  for (const trait of PANDA_CANVAS_TRAITS) {
    result[trait] = {};
    for (let tier = 1; tier <= 10; tier += 1) {
      result[trait][tier] = [];
    }
  }
  return result;
}

function emptyEmotionSublayers(): Record<number, PandaCanvasAssetLayer[]> {
  const result: Record<number, PandaCanvasAssetLayer[]> = {};
  for (let tier = 1; tier <= 10; tier += 1) {
    result[tier] = [];
  }
  return result;
}

function buildSublayerMaps() {
  const traitSublayers = emptyTraitSublayers();
  const emotionSublayers = emptyEmotionSublayers();

  for (const layer of PANDA_SUBLAYER_MANIFEST.layers) {
    const asset: PandaCanvasAssetLayer = {
      src: layer.src,
      attribute: layer.attribute,
      sublayer: layer.sublayer,
      tier: layer.tier,
      anchorPolicy: layer.anchorPolicy,
      anchorOffset: layer.anchorOffset,
      zIndex: layer.zIndex,
      opacityRule: layer.opacityRule,
      bboxPolicy: layer.bboxPolicy,
      role: layer.role,
    };

    if (layer.attribute === "emotion") {
      emotionSublayers[layer.tier].push(asset);
    } else {
      traitSublayers[layer.attribute][layer.tier].push(asset);
    }
  }

  for (let tier = 1; tier <= 10; tier += 1) {
    emotionSublayers[tier].sort((a, b) => a.zIndex - b.zIndex);
  }
  for (const trait of PANDA_CANVAS_TRAITS) {
    for (let tier = 1; tier <= 10; tier += 1) {
      traitSublayers[trait][tier].sort((a, b) => a.zIndex - b.zIndex);
    }
  }

  return { traitSublayers, emotionSublayers };
}

const sublayerMaps = buildSublayerMaps();

export const PANDA_CANVAS_ASSET_MANIFEST = {
  baseFallback: {
    src: "/assets/panda/panda_ink_base.png",
    attribute: "base",
    zIndex: 20,
    opacityRule: "base",
    role: "fallback full-body identity base when generated experience tier is unavailable",
  } satisfies PandaCanvasAssetLayer,
  experience: buildTierAssetMap("/assets/panda/experience", {
    attribute: "experience",
    zIndex: 20,
    opacityRule: "experience",
    role: "complete panda identity base: body, head, ears, silhouette, and neutral built-in face",
  }),
  sublayers: PANDA_SUBLAYER_MANIFEST,
  traitSublayers: sublayerMaps.traitSublayers,
  emotionSublayers: sublayerMaps.emotionSublayers,
} as const;

export function canvasTier(value: number): number {
  const clamped = clamp(Math.round(value), 0, 100);
  if (clamped >= 100) return 10;
  return Math.floor(clamped / 10) + 1;
}

export function canvasTierProgress(value: number, tierMode: PandaCanvasTierMode): number {
  if (tierMode === "discrete") return 1;
  const clamped = clamp(value, 0, 100);
  if (clamped >= 100) return 1;
  return clamp((clamped % 10) / 10, 0.15, 1);
}

export function canvasLayerStates(
  stats: PandaStats,
  options: PandaCanvasRenderOptions
): PandaCanvasLayerState[] {
  const values: Record<PandaCanvasTraitKey, number> = {
    boldness: stats.boldness,
    patience: stats.patience,
    intuition: stats.intuition,
    focus: stats.focus,
    contrarian: stats.contrarian,
  };

  const ranked = PANDA_CANVAS_TRAITS.slice().sort((a, b) => values[b] - values[a]);
  const majorKeys = new Set(
    options.displayMode === "top2" ? ranked.slice(0, 2) : ranked
  );

  return PANDA_CANVAS_TRAITS.map((key) => {
    const value = values[key];
    const tier = canvasTier(value);
    const rank = ranked.indexOf(key);
    const major = majorKeys.has(key);
    const score = clamp(value / 100, 0, 1);
    const progress = canvasTierProgress(value, options.tierMode);
    const top2Alpha = major ? (rank === 0 ? 1 : 0.78) : 0.18;
    const allAlpha = 0.34 + score * 0.5;

    return {
      key,
      value,
      tier,
      rank,
      major,
      score,
      progress,
      alpha: options.displayMode === "top2" ? top2Alpha : allAlpha,
    };
  });
}

function uniq(paths: string[]): string[] {
  return paths.filter((path, index) => paths.indexOf(path) === index);
}

export function canvasTraitAssetsForState(
  state: PandaCanvasLayerState
): PandaCanvasAssetLayer[] {
  return PANDA_CANVAS_ASSET_MANIFEST.traitSublayers[state.key][state.tier];
}

export function canvasEmotionAssets(stats: PandaStats): PandaCanvasAssetLayer[] {
  const tier = PANDA_EMOTION_TIER_MAP[stats.emotion];
  return PANDA_CANVAS_ASSET_MANIFEST.emotionSublayers[tier];
}

export function canvasAssetPaths(
  stats: PandaStats,
  options: PandaCanvasRenderOptions,
  debugAssets?: PandaCanvasAssetLayer[]
): string[] {
  const experienceTier = canvasTier(stats.experience);
  const states = canvasLayerStates(stats, options);
  const traitAssets = states
    .filter((state) => options.displayMode === "all" || state.major)
    .flatMap((state) => canvasTraitAssetsForState(state));
  const normalAssets = [...traitAssets, ...canvasEmotionAssets(stats)];
  const activeAssets = debugAssets ?? normalAssets;

  return uniq([
    PANDA_CANVAS_ASSET_MANIFEST.baseFallback.src,
    PANDA_CANVAS_ASSET_MANIFEST.experience[experienceTier].src,
    ...activeAssets.map((asset) => asset.src),
  ]);
}

export function canvasTraitAssetForState(
  state: PandaCanvasLayerState
): PandaCanvasAssetLayer {
  return canvasTraitAssetsForState(state)[0];
}

export function canvasExperienceAsset(stats: PandaStats): PandaCanvasAssetLayer {
  return PANDA_CANVAS_ASSET_MANIFEST.experience[canvasTier(stats.experience)];
}

export function canvasEmotionAsset(stats: PandaStats): PandaCanvasAssetLayer {
  return canvasEmotionAssets(stats)[0];
}

export function canvasSublayerAssetsFor(
  attribute: PandaCanvasSublayerAttributeKey,
  sublayer: string,
  tier: number
): PandaCanvasAssetLayer[] {
  const clampedTier = clamp(Math.round(tier), 1, 10);
  const assets =
    attribute === "emotion"
      ? PANDA_CANVAS_ASSET_MANIFEST.emotionSublayers[clampedTier]
      : PANDA_CANVAS_ASSET_MANIFEST.traitSublayers[attribute][clampedTier];

  return assets.filter((asset) => asset.sublayer === sublayer);
}

export function canvasSublayerOptions(): Array<{
  attribute: PandaCanvasSublayerAttributeKey;
  sublayer: string;
}> {
  const seen = new Set<string>();
  return PANDA_SUBLAYER_MANIFEST.layers
    .map((layer) => ({ attribute: layer.attribute, sublayer: layer.sublayer }))
    .filter((item) => {
      const key = `${item.attribute}/${item.sublayer}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export type PandaRigTierMode = "discrete" | "progressive";

export type PandaAnchorKey =
  | "headCenter"
  | "neck"
  | "shoulderLeft"
  | "shoulderRight"
  | "bodyCenter"
  | "eyeLeft"
  | "eyeRight"
  | "feetBase";

export type PandaAttachmentGroup =
  | "character"
  | "head"
  | "eyes"
  | "neck"
  | "shoulders"
  | "torso"
  | "back"
  | "hands"
  | "ground"
  | "worldAura";

export type PandaRigScaleKey = "character" | "head" | "body" | "world";

export interface PandaPoint {
  x: number;
  y: number;
}

export interface PandaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PandaRigFrame {
  tier: number;
  progress: number;
  anchors: Record<PandaAnchorKey, PandaPoint>;
  scales: Record<PandaRigScaleKey, number>;
  safeAreas: {
    face: PandaRect;
    bodyCore: PandaRect;
    avatarCrop: PandaRect;
  };
}

export interface PandaAttachmentDefinition {
  anchor: PandaAnchorKey;
  scale: PandaRigScaleKey;
}

export interface PandaAttachmentTransform {
  source: PandaPoint;
  target: PandaPoint;
  scale: number;
  rotation: number;
}

const BASELINE_TIER = 5;

const TIER_FRAMES: PandaRigFrame[] = [
  {
    tier: 1,
    progress: 1,
    anchors: {
      headCenter: { x: 256, y: 178 },
      neck: { x: 256, y: 262 },
      shoulderLeft: { x: 190, y: 300 },
      shoulderRight: { x: 322, y: 300 },
      bodyCenter: { x: 256, y: 365 },
      eyeLeft: { x: 214, y: 176 },
      eyeRight: { x: 309, y: 176 },
      feetBase: { x: 256, y: 450 },
    },
    scales: { character: 0.9, head: 0.96, body: 0.88, world: 1 },
    safeAreas: {
      face: { x: 150, y: 102, width: 212, height: 160 },
      bodyCore: { x: 172, y: 278, width: 184, height: 172 },
      avatarCrop: { x: 58, y: 50, width: 396, height: 396 },
    },
  },
  {
    tier: 2,
    progress: 1,
    anchors: {
      headCenter: { x: 256, y: 174 },
      neck: { x: 256, y: 260 },
      shoulderLeft: { x: 186, y: 300 },
      shoulderRight: { x: 326, y: 300 },
      bodyCenter: { x: 256, y: 363 },
      eyeLeft: { x: 213, y: 172 },
      eyeRight: { x: 310, y: 172 },
      feetBase: { x: 256, y: 452 },
    },
    scales: { character: 0.93, head: 0.98, body: 0.91, world: 1 },
    safeAreas: {
      face: { x: 148, y: 98, width: 216, height: 162 },
      bodyCore: { x: 168, y: 276, width: 192, height: 176 },
      avatarCrop: { x: 54, y: 48, width: 404, height: 404 },
    },
  },
  {
    tier: 3,
    progress: 1,
    anchors: {
      headCenter: { x: 256, y: 170 },
      neck: { x: 256, y: 258 },
      shoulderLeft: { x: 182, y: 299 },
      shoulderRight: { x: 330, y: 299 },
      bodyCenter: { x: 256, y: 362 },
      eyeLeft: { x: 212, y: 168 },
      eyeRight: { x: 311, y: 168 },
      feetBase: { x: 256, y: 454 },
    },
    scales: { character: 0.96, head: 0.99, body: 0.94, world: 1 },
    safeAreas: {
      face: { x: 146, y: 94, width: 220, height: 164 },
      bodyCore: { x: 164, y: 274, width: 200, height: 180 },
      avatarCrop: { x: 50, y: 46, width: 412, height: 412 },
    },
  },
  {
    tier: 4,
    progress: 1,
    anchors: {
      headCenter: { x: 256, y: 166 },
      neck: { x: 256, y: 257 },
      shoulderLeft: { x: 178, y: 299 },
      shoulderRight: { x: 334, y: 299 },
      bodyCenter: { x: 256, y: 362 },
      eyeLeft: { x: 211, y: 164 },
      eyeRight: { x: 312, y: 164 },
      feetBase: { x: 256, y: 456 },
    },
    scales: { character: 0.99, head: 1, body: 0.97, world: 1 },
    safeAreas: {
      face: { x: 144, y: 90, width: 224, height: 166 },
      bodyCore: { x: 160, y: 274, width: 208, height: 184 },
      avatarCrop: { x: 46, y: 44, width: 420, height: 420 },
    },
  },
  {
    tier: 5,
    progress: 1,
    anchors: {
      headCenter: { x: 256, y: 162 },
      neck: { x: 256, y: 256 },
      shoulderLeft: { x: 174, y: 300 },
      shoulderRight: { x: 338, y: 300 },
      bodyCenter: { x: 256, y: 362 },
      eyeLeft: { x: 211, y: 160 },
      eyeRight: { x: 312, y: 160 },
      feetBase: { x: 256, y: 458 },
    },
    scales: { character: 1, head: 1, body: 1, world: 1 },
    safeAreas: {
      face: { x: 142, y: 86, width: 228, height: 170 },
      bodyCore: { x: 156, y: 274, width: 216, height: 188 },
      avatarCrop: { x: 44, y: 42, width: 424, height: 424 },
    },
  },
  {
    tier: 6,
    progress: 1,
    anchors: {
      headCenter: { x: 256, y: 158 },
      neck: { x: 256, y: 255 },
      shoulderLeft: { x: 170, y: 300 },
      shoulderRight: { x: 342, y: 300 },
      bodyCenter: { x: 256, y: 363 },
      eyeLeft: { x: 210, y: 156 },
      eyeRight: { x: 313, y: 156 },
      feetBase: { x: 256, y: 461 },
    },
    scales: { character: 1.01, head: 1.01, body: 1.02, world: 1 },
    safeAreas: {
      face: { x: 140, y: 82, width: 232, height: 172 },
      bodyCore: { x: 152, y: 274, width: 224, height: 192 },
      avatarCrop: { x: 42, y: 40, width: 428, height: 428 },
    },
  },
  {
    tier: 7,
    progress: 1,
    anchors: {
      headCenter: { x: 256, y: 154 },
      neck: { x: 256, y: 254 },
      shoulderLeft: { x: 166, y: 300 },
      shoulderRight: { x: 346, y: 300 },
      bodyCenter: { x: 256, y: 364 },
      eyeLeft: { x: 210, y: 152 },
      eyeRight: { x: 313, y: 152 },
      feetBase: { x: 256, y: 464 },
    },
    scales: { character: 1.02, head: 1.02, body: 1.04, world: 1 },
    safeAreas: {
      face: { x: 138, y: 78, width: 236, height: 174 },
      bodyCore: { x: 148, y: 274, width: 232, height: 196 },
      avatarCrop: { x: 40, y: 38, width: 432, height: 432 },
    },
  },
  {
    tier: 8,
    progress: 1,
    anchors: {
      headCenter: { x: 256, y: 150 },
      neck: { x: 256, y: 253 },
      shoulderLeft: { x: 162, y: 300 },
      shoulderRight: { x: 350, y: 300 },
      bodyCenter: { x: 256, y: 365 },
      eyeLeft: { x: 210, y: 148 },
      eyeRight: { x: 313, y: 148 },
      feetBase: { x: 256, y: 468 },
    },
    scales: { character: 1.03, head: 1.04, body: 1.06, world: 1 },
    safeAreas: {
      face: { x: 136, y: 74, width: 240, height: 176 },
      bodyCore: { x: 144, y: 274, width: 240, height: 202 },
      avatarCrop: { x: 38, y: 36, width: 436, height: 436 },
    },
  },
  {
    tier: 9,
    progress: 1,
    anchors: {
      headCenter: { x: 256, y: 146 },
      neck: { x: 256, y: 252 },
      shoulderLeft: { x: 160, y: 301 },
      shoulderRight: { x: 352, y: 301 },
      bodyCenter: { x: 256, y: 366 },
      eyeLeft: { x: 209, y: 144 },
      eyeRight: { x: 314, y: 144 },
      feetBase: { x: 256, y: 472 },
    },
    scales: { character: 1.04, head: 1.05, body: 1.08, world: 1 },
    safeAreas: {
      face: { x: 134, y: 70, width: 244, height: 178 },
      bodyCore: { x: 142, y: 274, width: 244, height: 208 },
      avatarCrop: { x: 36, y: 34, width: 440, height: 440 },
    },
  },
  {
    tier: 10,
    progress: 1,
    anchors: {
      headCenter: { x: 256, y: 142 },
      neck: { x: 256, y: 252 },
      shoulderLeft: { x: 158, y: 302 },
      shoulderRight: { x: 354, y: 302 },
      bodyCenter: { x: 256, y: 367 },
      eyeLeft: { x: 209, y: 140 },
      eyeRight: { x: 314, y: 140 },
      feetBase: { x: 256, y: 476 },
    },
    scales: { character: 1.05, head: 1.06, body: 1.1, world: 1 },
    safeAreas: {
      face: { x: 132, y: 66, width: 248, height: 180 },
      bodyCore: { x: 140, y: 274, width: 248, height: 214 },
      avatarCrop: { x: 34, y: 32, width: 444, height: 444 },
    },
  },
];

export const PANDA_ATTACHMENT_DEFINITIONS: Record<
  PandaAttachmentGroup,
  PandaAttachmentDefinition
> = {
  character: { anchor: "bodyCenter", scale: "character" },
  head: { anchor: "headCenter", scale: "head" },
  eyes: { anchor: "headCenter", scale: "head" },
  neck: { anchor: "neck", scale: "head" },
  shoulders: { anchor: "neck", scale: "body" },
  torso: { anchor: "bodyCenter", scale: "body" },
  back: { anchor: "bodyCenter", scale: "body" },
  hands: { anchor: "bodyCenter", scale: "body" },
  ground: { anchor: "feetBase", scale: "world" },
  worldAura: { anchor: "bodyCenter", scale: "world" },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tierForValue(value: number): number {
  const clamped = clamp(Math.round(value), 0, 100);
  if (clamped >= 100) return 10;
  return Math.floor(clamped / 10) + 1;
}

function progressForValue(value: number, tierMode: PandaRigTierMode): number {
  if (tierMode === "discrete") return 1;
  const clamped = clamp(value, 0, 100);
  if (clamped >= 100) return 1;
  return clamp((clamped % 10) / 10, 0.15, 1);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixPoint(a: PandaPoint, b: PandaPoint, t: number): PandaPoint {
  return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) };
}

function mixRect(a: PandaRect, b: PandaRect, t: number): PandaRect {
  return {
    x: mix(a.x, b.x, t),
    y: mix(a.y, b.y, t),
    width: mix(a.width, b.width, t),
    height: mix(a.height, b.height, t),
  };
}

function mixFrame(a: PandaRigFrame, b: PandaRigFrame, t: number): PandaRigFrame {
  const anchors = Object.keys(a.anchors).reduce((acc, key) => {
    const anchorKey = key as PandaAnchorKey;
    acc[anchorKey] = mixPoint(a.anchors[anchorKey], b.anchors[anchorKey], t);
    return acc;
  }, {} as Record<PandaAnchorKey, PandaPoint>);

  return {
    tier: a.tier,
    progress: t,
    anchors,
    scales: {
      character: mix(a.scales.character, b.scales.character, t),
      head: mix(a.scales.head, b.scales.head, t),
      body: mix(a.scales.body, b.scales.body, t),
      world: 1,
    },
    safeAreas: {
      face: mixRect(a.safeAreas.face, b.safeAreas.face, t),
      bodyCore: mixRect(a.safeAreas.bodyCore, b.safeAreas.bodyCore, t),
      avatarCrop: mixRect(a.safeAreas.avatarCrop, b.safeAreas.avatarCrop, t),
    },
  };
}

export function getPandaRigFrame(
  experience: number,
  tierMode: PandaRigTierMode
): PandaRigFrame {
  const tier = tierForValue(experience);
  const current = TIER_FRAMES[tier - 1]!;
  if (tierMode === "discrete" || tier >= 10) return current;

  const next = TIER_FRAMES[tier] ?? current;
  return mixFrame(current, next, progressForValue(experience, tierMode));
}

export function getBaselineRigFrame(): PandaRigFrame {
  return TIER_FRAMES[BASELINE_TIER - 1]!;
}

export function getAttachmentTransform(
  attachment: PandaAttachmentGroup,
  frame: PandaRigFrame,
  pivot?: PandaPoint
): PandaAttachmentTransform {
  const baseline = getBaselineRigFrame();
  const definition = PANDA_ATTACHMENT_DEFINITIONS[attachment];
  const source = pivot ?? baseline.anchors[definition.anchor];
  const target = frame.anchors[definition.anchor];
  const baselineScale = baseline.scales[definition.scale] || 1;
  const currentScale = frame.scales[definition.scale] || 1;

  return {
    source,
    target,
    scale: baselineScale === 0 ? 1 : currentScale / baselineScale,
    rotation: 0,
  };
}

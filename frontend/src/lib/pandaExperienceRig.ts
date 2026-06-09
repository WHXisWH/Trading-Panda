export const PANDA_RIG_CANVAS_SIZE = 512;

export type ExperienceRigTierKey =
  | "tier-01"
  | "tier-02"
  | "tier-03"
  | "tier-04"
  | "tier-05"
  | "tier-06"
  | "tier-07"
  | "tier-08"
  | "tier-09"
  | "tier-10";

export type ExperienceRigRectKey =
  | "faceRect"
  | "leftEye"
  | "rightEye"
  | "nose"
  | "mouth"
  | "bodyRect";

export type ExperienceRigPointKey = "headCenter" | "feetBase";

export type ExperienceRigHandleKey =
  | ExperienceRigRectKey
  | ExperienceRigPointKey;

export interface ExperienceRigPoint {
  x: number;
  y: number;
}

export interface ExperienceRigRect extends ExperienceRigPoint {
  width: number;
  height: number;
}

export interface ExperienceRigLandmarks {
  faceRect: ExperienceRigRect;
  leftEye: ExperienceRigRect;
  rightEye: ExperienceRigRect;
  nose: ExperienceRigRect;
  mouth: ExperienceRigRect;
  bodyRect: ExperienceRigRect;
  headCenter: ExperienceRigPoint;
  feetBase: ExperienceRigPoint;
}

export interface ExperienceRigTierManifest extends ExperienceRigLandmarks {
  image: string;
}

export interface ExperienceRigTierSchema extends ExperienceRigTierManifest {
  tier: ExperienceRigTierKey;
  canvasSize: typeof PANDA_RIG_CANVAS_SIZE;
}

export interface ExperienceRigManifest {
  version: 1;
  coordinateSpace: {
    width: typeof PANDA_RIG_CANVAS_SIZE;
    height: typeof PANDA_RIG_CANVAS_SIZE;
    unit: "px";
  };
  tiers: Record<ExperienceRigTierKey, ExperienceRigTierManifest>;
}

export const EXPERIENCE_RIG_TIERS: ExperienceRigTierKey[] = [
  "tier-01",
  "tier-02",
  "tier-03",
  "tier-04",
  "tier-05",
  "tier-06",
  "tier-07",
  "tier-08",
  "tier-09",
  "tier-10",
];

export const EXPERIENCE_RIG_RECT_KEYS: ExperienceRigRectKey[] = [
  "faceRect",
  "leftEye",
  "rightEye",
  "nose",
  "mouth",
  "bodyRect",
];

export const EXPERIENCE_RIG_POINT_KEYS: ExperienceRigPointKey[] = [
  "headCenter",
  "feetBase",
];

export const EXPERIENCE_RIG_HANDLE_KEYS: ExperienceRigHandleKey[] = [
  ...EXPERIENCE_RIG_RECT_KEYS,
  ...EXPERIENCE_RIG_POINT_KEYS,
];

export const EXPERIENCE_RIG_LABELS: Record<ExperienceRigHandleKey, string> = {
  faceRect: "脸部",
  leftEye: "左眼",
  rightEye: "右眼",
  nose: "鼻子",
  mouth: "嘴巴",
  bodyRect: "身体",
  headCenter: "头心",
  feetBase: "脚底",
};

export const EXPERIENCE_RIG_SCHEMA_FIELDS = [
  "tier",
  "image",
  "canvasSize",
  "headCenter",
  "faceRect",
  "leftEye",
  "rightEye",
  "nose",
  "mouth",
  "bodyRect",
  "feetBase",
] as const;

const DEFAULT_LANDMARKS: ExperienceRigLandmarks[] = [
  {
    faceRect: { x: 154, y: 98, width: 204, height: 162 },
    leftEye: { x: 189, y: 153, width: 52, height: 38 },
    rightEye: { x: 273, y: 153, width: 52, height: 38 },
    nose: { x: 238, y: 199, width: 38, height: 30 },
    mouth: { x: 224, y: 229, width: 66, height: 30 },
    bodyRect: { x: 154, y: 274, width: 204, height: 180 },
    headCenter: { x: 256, y: 178 },
    feetBase: { x: 256, y: 450 },
  },
  {
    faceRect: { x: 151, y: 94, width: 210, height: 164 },
    leftEye: { x: 188, y: 150, width: 54, height: 39 },
    rightEye: { x: 273, y: 150, width: 54, height: 39 },
    nose: { x: 238, y: 197, width: 38, height: 30 },
    mouth: { x: 223, y: 227, width: 68, height: 30 },
    bodyRect: { x: 150, y: 272, width: 212, height: 184 },
    headCenter: { x: 256, y: 174 },
    feetBase: { x: 256, y: 452 },
  },
  {
    faceRect: { x: 148, y: 90, width: 216, height: 166 },
    leftEye: { x: 187, y: 147, width: 55, height: 40 },
    rightEye: { x: 274, y: 147, width: 55, height: 40 },
    nose: { x: 237, y: 195, width: 40, height: 31 },
    mouth: { x: 222, y: 225, width: 70, height: 31 },
    bodyRect: { x: 146, y: 270, width: 220, height: 188 },
    headCenter: { x: 256, y: 170 },
    feetBase: { x: 256, y: 454 },
  },
  {
    faceRect: { x: 145, y: 86, width: 222, height: 168 },
    leftEye: { x: 186, y: 144, width: 56, height: 40 },
    rightEye: { x: 274, y: 144, width: 56, height: 40 },
    nose: { x: 237, y: 193, width: 40, height: 31 },
    mouth: { x: 221, y: 223, width: 72, height: 32 },
    bodyRect: { x: 142, y: 268, width: 228, height: 194 },
    headCenter: { x: 256, y: 166 },
    feetBase: { x: 256, y: 456 },
  },
  {
    faceRect: { x: 142, y: 82, width: 228, height: 170 },
    leftEye: { x: 185, y: 141, width: 58, height: 41 },
    rightEye: { x: 274, y: 141, width: 58, height: 41 },
    nose: { x: 236, y: 191, width: 42, height: 32 },
    mouth: { x: 220, y: 221, width: 74, height: 32 },
    bodyRect: { x: 138, y: 266, width: 236, height: 198 },
    headCenter: { x: 256, y: 162 },
    feetBase: { x: 256, y: 458 },
  },
  {
    faceRect: { x: 139, y: 78, width: 234, height: 172 },
    leftEye: { x: 184, y: 138, width: 59, height: 42 },
    rightEye: { x: 275, y: 138, width: 59, height: 42 },
    nose: { x: 236, y: 189, width: 42, height: 32 },
    mouth: { x: 219, y: 219, width: 76, height: 33 },
    bodyRect: { x: 134, y: 264, width: 244, height: 204 },
    headCenter: { x: 256, y: 158 },
    feetBase: { x: 256, y: 461 },
  },
  {
    faceRect: { x: 136, y: 74, width: 240, height: 174 },
    leftEye: { x: 183, y: 135, width: 60, height: 42 },
    rightEye: { x: 275, y: 135, width: 60, height: 42 },
    nose: { x: 235, y: 187, width: 44, height: 33 },
    mouth: { x: 218, y: 217, width: 78, height: 33 },
    bodyRect: { x: 130, y: 262, width: 252, height: 210 },
    headCenter: { x: 256, y: 154 },
    feetBase: { x: 256, y: 464 },
  },
  {
    faceRect: { x: 133, y: 70, width: 246, height: 176 },
    leftEye: { x: 182, y: 132, width: 61, height: 43 },
    rightEye: { x: 276, y: 132, width: 61, height: 43 },
    nose: { x: 235, y: 185, width: 44, height: 33 },
    mouth: { x: 217, y: 215, width: 80, height: 34 },
    bodyRect: { x: 126, y: 260, width: 260, height: 218 },
    headCenter: { x: 256, y: 150 },
    feetBase: { x: 256, y: 468 },
  },
  {
    faceRect: { x: 130, y: 66, width: 252, height: 178 },
    leftEye: { x: 181, y: 129, width: 62, height: 44 },
    rightEye: { x: 276, y: 129, width: 62, height: 44 },
    nose: { x: 234, y: 183, width: 46, height: 34 },
    mouth: { x: 216, y: 213, width: 82, height: 34 },
    bodyRect: { x: 122, y: 258, width: 268, height: 226 },
    headCenter: { x: 256, y: 146 },
    feetBase: { x: 256, y: 472 },
  },
  {
    faceRect: { x: 127, y: 62, width: 258, height: 180 },
    leftEye: { x: 180, y: 126, width: 63, height: 44 },
    rightEye: { x: 277, y: 126, width: 63, height: 44 },
    nose: { x: 234, y: 181, width: 46, height: 34 },
    mouth: { x: 215, y: 211, width: 84, height: 35 },
    bodyRect: { x: 118, y: 256, width: 276, height: 234 },
    headCenter: { x: 256, y: 142 },
    feetBase: { x: 256, y: 476 },
  },
];

export function experienceTierImagePath(tier: ExperienceRigTierKey): string {
  return `/assets/panda/experience/${tier}.png`;
}

function cloneLandmarks(landmarks: ExperienceRigLandmarks): ExperienceRigLandmarks {
  return {
    faceRect: { ...landmarks.faceRect },
    leftEye: { ...landmarks.leftEye },
    rightEye: { ...landmarks.rightEye },
    nose: { ...landmarks.nose },
    mouth: { ...landmarks.mouth },
    bodyRect: { ...landmarks.bodyRect },
    headCenter: { ...landmarks.headCenter },
    feetBase: { ...landmarks.feetBase },
  };
}

export function createDefaultExperienceRigManifest(): ExperienceRigManifest {
  const tiers = EXPERIENCE_RIG_TIERS.reduce((acc, tier, index) => {
    acc[tier] = {
      image: experienceTierImagePath(tier),
      ...cloneLandmarks(DEFAULT_LANDMARKS[index]!),
    };
    return acc;
  }, {} as Record<ExperienceRigTierKey, ExperienceRigTierManifest>);

  return {
    version: 1,
    coordinateSpace: {
      width: PANDA_RIG_CANVAS_SIZE,
      height: PANDA_RIG_CANVAS_SIZE,
      unit: "px",
    },
    tiers,
  };
}

export function experienceTierKeyFromNumber(tier: number): ExperienceRigTierKey {
  const clamped = Math.min(10, Math.max(1, Math.round(tier)));
  return `tier-${String(clamped).padStart(2, "0")}` as ExperienceRigTierKey;
}

export function experienceRigTierSchema(
  tier: ExperienceRigTierKey,
  landmarks: ExperienceRigTierManifest
): ExperienceRigTierSchema {
  return {
    tier,
    image: landmarks.image,
    canvasSize: PANDA_RIG_CANVAS_SIZE,
    faceRect: { ...landmarks.faceRect },
    leftEye: { ...landmarks.leftEye },
    rightEye: { ...landmarks.rightEye },
    nose: { ...landmarks.nose },
    mouth: { ...landmarks.mouth },
    bodyRect: { ...landmarks.bodyRect },
    headCenter: { ...landmarks.headCenter },
    feetBase: { ...landmarks.feetBase },
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function rectContainsPoint(rect: ExperienceRigRect, point: ExperienceRigPoint): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function rectCenter(rect: ExperienceRigRect): ExperienceRigPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function rectWithinCanvas(rect: ExperienceRigRect): boolean {
  return (
    isFiniteNumber(rect.x) &&
    isFiniteNumber(rect.y) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height) &&
    rect.width > 0 &&
    rect.height > 0 &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= PANDA_RIG_CANVAS_SIZE &&
    rect.y + rect.height <= PANDA_RIG_CANVAS_SIZE
  );
}

function pointWithinCanvas(point: ExperienceRigPoint): boolean {
  return (
    isFiniteNumber(point.x) &&
    isFiniteNumber(point.y) &&
    point.x >= 0 &&
    point.x <= PANDA_RIG_CANVAS_SIZE &&
    point.y >= 0 &&
    point.y <= PANDA_RIG_CANVAS_SIZE
  );
}

export function validateExperienceRigManifest(value: unknown): string[] {
  const errors: string[] = [];
  const manifest = value as ExperienceRigManifest;

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

  if (!manifest.tiers || typeof manifest.tiers !== "object") {
    errors.push("tiers must be an object");
    return errors;
  }

  for (const tier of EXPERIENCE_RIG_TIERS) {
    const item = manifest.tiers[tier];
    if (!item) {
      errors.push(`${tier} is missing`);
      continue;
    }

    if (item.image !== experienceTierImagePath(tier)) {
      errors.push(`${tier}.image must be ${experienceTierImagePath(tier)}`);
    }

    for (const key of EXPERIENCE_RIG_RECT_KEYS) {
      const rect = item[key];
      if (!rectWithinCanvas(rect)) {
        errors.push(`${tier}.${key} must be a positive rect inside 512x512 canvas`);
      }
    }

    for (const key of EXPERIENCE_RIG_POINT_KEYS) {
      const point = item[key];
      if (!pointWithinCanvas(point)) {
        errors.push(`${tier}.${key} must be inside 512x512 canvas`);
      }
    }

    if (rectWithinCanvas(item.faceRect)) {
      for (const key of ["leftEye", "rightEye", "mouth"] as const) {
        if (rectWithinCanvas(item[key]) && !rectContainsPoint(item.faceRect, rectCenter(item[key]))) {
          errors.push(`${tier}.${key} center must be inside faceRect`);
        }
      }
    }
  }

  return errors;
}

export function isValidExperienceRigManifest(
  value: unknown
): value is ExperienceRigManifest {
  return validateExperienceRigManifest(value).length === 0;
}

export function cloneExperienceRigManifest(
  manifest: ExperienceRigManifest
): ExperienceRigManifest {
  const tiers = EXPERIENCE_RIG_TIERS.reduce((acc, tier) => {
    acc[tier] = {
      image: manifest.tiers[tier].image,
      ...cloneLandmarks(manifest.tiers[tier]),
    };
    return acc;
  }, {} as Record<ExperienceRigTierKey, ExperienceRigTierManifest>);

  return {
    version: manifest.version,
    coordinateSpace: { ...manifest.coordinateSpace },
    tiers,
  };
}

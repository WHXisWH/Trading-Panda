import rigManifestJson from "../../public/assets/panda/experience-rig.json";
import {
  createDefaultExperienceRigManifest,
  EXPERIENCE_RIG_RECT_KEYS,
  EXPERIENCE_RIG_POINT_KEYS,
  experienceTierKeyFromNumber,
  isValidExperienceRigManifest,
  type ExperienceRigManifest,
  type ExperienceRigPoint,
  type ExperienceRigRect,
  type ExperienceRigTierManifest,
} from "@/lib/pandaExperienceRig";
import type { PandaRigTierMode } from "@/lib/pandaRig";

export const PANDA_EXPERIENCE_RIG_MANIFEST: ExperienceRigManifest =
  isValidExperienceRigManifest(rigManifestJson)
    ? rigManifestJson
    : createDefaultExperienceRigManifest();

export function getExperienceRigTier(
  tier: number
): ExperienceRigTierManifest {
  return PANDA_EXPERIENCE_RIG_MANIFEST.tiers[experienceTierKeyFromNumber(tier)];
}

export function getBaselineExperienceRigTier(): ExperienceRigTierManifest {
  return getExperienceRigTier(5);
}

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

function mixPoint(
  a: ExperienceRigPoint,
  b: ExperienceRigPoint,
  t: number
): ExperienceRigPoint {
  return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) };
}

function mixRect(
  a: ExperienceRigRect,
  b: ExperienceRigRect,
  t: number
): ExperienceRigRect {
  return {
    x: mix(a.x, b.x, t),
    y: mix(a.y, b.y, t),
    width: mix(a.width, b.width, t),
    height: mix(a.height, b.height, t),
  };
}

export function getExperienceRigForValue(
  experience: number,
  tierMode: PandaRigTierMode
): ExperienceRigTierManifest {
  const tier = tierForValue(experience);
  const current = getExperienceRigTier(tier);
  if (tierMode === "discrete" || tier >= 10) return current;

  const next = getExperienceRigTier(tier + 1);
  const progress = progressForValue(experience, tierMode);
  const mixed: ExperienceRigTierManifest = {
    image: current.image,
    faceRect: { ...current.faceRect },
    leftEye: { ...current.leftEye },
    rightEye: { ...current.rightEye },
    nose: { ...current.nose },
    mouth: { ...current.mouth },
    bodyRect: { ...current.bodyRect },
    headCenter: { ...current.headCenter },
    feetBase: { ...current.feetBase },
  };

  for (const key of EXPERIENCE_RIG_RECT_KEYS) {
    mixed[key] = mixRect(current[key], next[key], progress);
  }

  for (const key of EXPERIENCE_RIG_POINT_KEYS) {
    mixed[key] = mixPoint(current[key], next[key], progress);
  }

  return mixed;
}

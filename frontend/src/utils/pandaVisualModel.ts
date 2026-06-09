import {
  getGrowthStage,
  type GrowthStage,
  type PandaEmotion,
  type PandaStats,
} from "@/utils/pandaHelper";

export type PandaTraitKey =
  | "boldness"
  | "patience"
  | "intuition"
  | "focus"
  | "contrarian";

export type TraitIntensity = "quiet" | "present" | "strong";

export interface PandaTraitVisual {
  key: PandaTraitKey;
  score: number;
  intensity: TraitIntensity;
}

export interface PandaVisualModel {
  stage: GrowthStage;
  emotion: PandaEmotion;
  traits: Record<PandaTraitKey, PandaTraitVisual>;
  primaryTrait: PandaTraitKey;
  activeTraits: PandaTraitKey[];
  pose: {
    headScale: number;
    bodyScale: number;
    stance: number;
    armSpread: number;
    earTilt: number;
    gazeShift: number;
  };
  expression: {
    eyeOpen: number;
    smile: number;
    blush: number;
    browTilt: number;
  };
}

const TRAIT_ORDER: PandaTraitKey[] = [
  "boldness",
  "patience",
  "intuition",
  "focus",
  "contrarian",
];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function score(value: number): number {
  return clamp01(value / 100);
}

function intensity(value: number): TraitIntensity {
  if (value >= 0.78) return "strong";
  if (value >= 0.58) return "present";
  return "quiet";
}

function lerp(min: number, max: number, value: number): number {
  return min + (max - min) * clamp01(value);
}

function emotionExpression(emotion: PandaEmotion): PandaVisualModel["expression"] {
  switch (emotion) {
    case "excited":
      return { eyeOpen: 1, smile: 0.95, blush: 0.9, browTilt: -0.1 };
    case "greedy":
      return { eyeOpen: 0.9, smile: 0.65, blush: 0.7, browTilt: 0 };
    case "cautious":
      return { eyeOpen: 0.68, smile: 0.15, blush: 0.35, browTilt: 0.35 };
    case "panic":
      return { eyeOpen: 1, smile: -0.45, blush: 0.15, browTilt: 0.65 };
    case "numb":
      return { eyeOpen: 0.28, smile: 0, blush: 0.05, browTilt: 0 };
    case "frustrated":
      return { eyeOpen: 0.58, smile: -0.65, blush: 0.25, browTilt: 0.85 };
    case "calm":
    default:
      return { eyeOpen: 0.72, smile: 0.5, blush: 0.55, browTilt: 0 };
  }
}

export function buildPandaVisualModel(stats: PandaStats): PandaVisualModel {
  const traitScores = {
    boldness: score(stats.boldness),
    patience: score(stats.patience),
    intuition: score(stats.intuition),
    focus: score(stats.focus),
    contrarian: score(stats.contrarian),
  } satisfies Record<PandaTraitKey, number>;

  const ranked = TRAIT_ORDER.slice().sort(
    (a, b) => traitScores[b] - traitScores[a]
  );
  const primaryTrait = ranked[0] ?? "focus";
  const activeTraits = ranked
    .filter((key) => traitScores[key] >= 0.58)
    .slice(0, 2);

  const stage = getGrowthStage(stats.experience);
  const stageBodyScale = stage === "infant" ? 0.86 : stage === "mature" ? 1.05 : 1;
  const stageHeadScale = stage === "infant" ? 1.08 : stage === "mature" ? 0.98 : 1;
  const expression = emotionExpression(stats.emotion);

  return {
    stage,
    emotion: stats.emotion,
    primaryTrait,
    activeTraits,
    traits: {
      boldness: {
        key: "boldness",
        score: traitScores.boldness,
        intensity: intensity(traitScores.boldness),
      },
      patience: {
        key: "patience",
        score: traitScores.patience,
        intensity: intensity(traitScores.patience),
      },
      intuition: {
        key: "intuition",
        score: traitScores.intuition,
        intensity: intensity(traitScores.intuition),
      },
      focus: {
        key: "focus",
        score: traitScores.focus,
        intensity: intensity(traitScores.focus),
      },
      contrarian: {
        key: "contrarian",
        score: traitScores.contrarian,
        intensity: intensity(traitScores.contrarian),
      },
    },
    pose: {
      headScale: stageHeadScale,
      bodyScale: stageBodyScale,
      stance: lerp(-1.5, 1.5, traitScores.patience),
      armSpread: lerp(-8, 12, traitScores.boldness),
      earTilt: lerp(-4, 5, traitScores.intuition),
      gazeShift: lerp(-1.8, 1.8, traitScores.contrarian),
    },
    expression,
  };
}

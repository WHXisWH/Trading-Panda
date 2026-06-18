/** Panda SVG stats — maps API/backend fields to visual layers */

export type PandaEmotion =
  | "calm"
  | "excited"
  | "greedy"
  | "cautious"
  | "panic"
  | "numb"
  | "frustrated";

export type GrowthStage = "infant" | "apprentice" | "mature";

export type VisualTier = "low" | "mid" | "high";

export interface PandaStats {
  patience: number;
  boldness: number;
  intuition: number;
  focus: number;
  contrarian: number;
  emotion: PandaEmotion;
  experience: number;
}

/** Map backend emotion_state to SVG emotion layer key */
export function mapApiEmotion(state: string): PandaEmotion {
  const map: Record<string, PandaEmotion> = {
    neutral: "calm",
    calm: "calm",
    focused: "calm",
    excited: "excited",
    greedy: "greedy",
    cautious: "cautious",
    panicking: "panic",
    panic: "panic",
    numb: "numb",
    frustrated: "frustrated",
  };
  return map[state] ?? "calm";
}

/** 1-100 → Tier 1-10 */
export function getTraitTier(value: number): number {
  if (value <= 0) return 1;
  if (value >= 100) return 10;
  return Math.floor((value - 1) / 10) + 1;
}

/** Tier 1-10 → visual asset bucket (low / mid / high) */
export function getVisualTier(tier: number): VisualTier {
  if (tier <= 3) return "low";
  if (tier <= 7) return "mid";
  return "high";
}

export const PANDA_EMOTIONS: PandaEmotion[] = [
  "calm",
  "excited",
  "greedy",
  "cautious",
  "panic",
  "numb",
  "frustrated",
];

export const EMOTION_LABELS: Record<PandaEmotion, string> = {
  calm: "平静",
  excited: "兴奋",
  greedy: "贪婪",
  cautious: "谨慎",
  panic: "恐慌",
  numb: "麻木",
  frustrated: "烦躁",
};

export const DEFAULT_PANDA_STATS: PandaStats = {
  boldness: 50,
  patience: 50,
  intuition: 50,
  focus: 50,
  contrarian: 50,
  emotion: "calm",
  experience: 35,
};

/** experience 0-100 → growth stage */
export function getGrowthStage(experience: number): GrowthStage {
  if (experience <= 30) return "infant";
  if (experience <= 70) return "apprentice";
  return "mature";
}

export function statsFromPanda(panda: {
  boldness: number;
  patience: number;
  intuition: number;
  focus: number;
  contrarian: number;
  emotion_state?: string;
  experience_level?: number;
}): PandaStats {
  return {
    boldness: panda.boldness,
    patience: panda.patience,
    intuition: panda.intuition,
    focus: panda.focus,
    contrarian: panda.contrarian,
    emotion: mapApiEmotion(panda.emotion_state ?? "neutral"),
    experience: panda.experience_level ?? 0,
  };
}

export function statsFromPandaSummary(panda: {
  personality: {
    boldness: number;
    patience: number;
    intuition: number;
    focus: number;
    contrarian: number;
  };
  emotion_state?: string;
  experience_level?: number;
}): PandaStats {
  return statsFromPanda({
    ...panda.personality,
    emotion_state: panda.emotion_state,
    experience_level: panda.experience_level,
  });
}

export const emotionFilterParams: Record<
  PandaEmotion,
  { inkBlur: number; saturation: number; opacity: number }
> = {
  calm: { inkBlur: 1.5, saturation: 1.0, opacity: 1.0 },
  excited: { inkBlur: 2.5, saturation: 1.2, opacity: 1.0 },
  greedy: { inkBlur: 2.0, saturation: 0.9, opacity: 1.0 },
  cautious: { inkBlur: 1.0, saturation: 0.8, opacity: 0.95 },
  panic: { inkBlur: 4.0, saturation: 0.5, opacity: 0.8 },
  numb: { inkBlur: 1.0, saturation: 0.3, opacity: 0.6 },
  frustrated: { inkBlur: 3.0, saturation: 1.1, opacity: 1.0 },
};

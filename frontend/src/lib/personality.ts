export const PERSONALITY_AXES = [
  { key: "boldness", label: "大胆", en: "Boldness", color: "#e05500" },
  { key: "patience", label: "耐心", en: "Patience", color: "#4a7c59" },
  { key: "intuition", label: "直觉", en: "Intuition", color: "#7c7c4a" },
  { key: "focus", label: "专注", en: "Focus", color: "#5c7a8c" },
  { key: "contrarian", label: "逆向", en: "Contrarian", color: "#8c5c7a" },
] as const;

export type PersonalityKey = (typeof PERSONALITY_AXES)[number]["key"];

export function personalityLabel(key: PersonalityKey): string {
  return PERSONALITY_AXES.find((a) => a.key === key)?.label ?? key;
}

export function dominantTrait(scores: Record<PersonalityKey, number>): string {
  const top = PERSONALITY_AXES.slice().sort(
    (a, b) => scores[b.key] - scores[a.key]
  )[0];
  const score = scores[top.key];
  if (score > 75) return `极度${top.label}`;
  if (score > 50) return `偏${top.label}`;
  return `均衡型`;
}

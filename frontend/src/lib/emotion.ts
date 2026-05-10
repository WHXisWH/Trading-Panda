export type EmotionState =
  | "focused"
  | "excited"
  | "greedy"
  | "cautious"
  | "panicking"
  | "numb"
  | "neutral";

export const EMOTION_META: Record<
  EmotionState,
  { label: string; emoji: string; color: string; desc: string }
> = {
  focused: {
    label: "专注",
    emoji: "🎯",
    color: "#4a7c59",
    desc: "冷静分析，执行力强",
  },
  excited: {
    label: "兴奋",
    emoji: "✨",
    color: "#f0a500",
    desc: "积极捕捉机会，略微冒进",
  },
  greedy: {
    label: "贪婪",
    emoji: "🔥",
    color: "#e05500",
    desc: "追涨明显，风险敞口扩大",
  },
  cautious: {
    label: "谨慎",
    emoji: "🌿",
    color: "#7c7c4a",
    desc: "偏保守，等待确认信号",
  },
  panicking: {
    label: "恐慌",
    emoji: "⚡",
    color: "#c0392b",
    desc: "连续止损，易错失反弹",
  },
  numb: {
    label: "麻木",
    emoji: "🌫️",
    color: "#8c8c8c",
    desc: "连续亏损后信号迟钝",
  },
  neutral: {
    label: "平静",
    emoji: "🐼",
    color: "#5c5248",
    desc: "常态运作",
  },
};

export function emotionMeta(state: string) {
  return EMOTION_META[state as EmotionState] ?? EMOTION_META.neutral;
}

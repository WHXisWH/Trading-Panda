import { clsx } from "clsx";
import { emotionMeta } from "@/lib/emotion";

interface Props {
  emotionState?: string;
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
}

const SIZE_CLASS = {
  sm: "h-16 w-16 text-4xl",
  md: "h-24 w-24 text-5xl",
  lg: "h-36 w-36 text-7xl",
  xl: "h-48 w-48 text-8xl",
};

export function PandaAvatar({ emotionState = "neutral", size = "md", animate = true }: Props) {
  const meta = emotionMeta(emotionState);
  return (
    <div
      className={clsx(
        "relative flex items-center justify-center rounded-full",
        animate && "animate-panda-breathe",
        SIZE_CLASS[size]
      )}
      style={{ backgroundColor: meta.color + "18" }}
    >
      <span role="img" aria-label={`熊猫 ${meta.label}`}>
        🐼
      </span>
      {/* emotion overlay badge */}
      <span
        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-sm shadow"
        style={{ backgroundColor: meta.color + "33" }}
      >
        {meta.emoji}
      </span>
    </div>
  );
}

import { emotionMeta, type EmotionState } from "@/lib/emotion";

interface Props {
  state: string;
  showDesc?: boolean;
}

export function EmotionIndicator({ state, showDesc = false }: Props) {
  const meta = emotionMeta(state as EmotionState);
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: meta.color + "22" }}
        title={meta.desc}
      >
        {meta.emoji}
      </span>
      <div>
        <p className="text-sm font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </p>
        {showDesc && <p className="text-xs text-ink-500">{meta.desc}</p>}
      </div>
    </div>
  );
}

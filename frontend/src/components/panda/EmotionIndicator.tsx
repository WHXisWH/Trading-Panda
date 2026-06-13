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
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color }}
        title={meta.desc}
      />
      <div>
        <p className="text-sm font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </p>
        {showDesc && <p className="text-xs text-neutral-500">{meta.desc}</p>}
      </div>
    </div>
  );
}

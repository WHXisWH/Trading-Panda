interface Props {
  level: number;
  /** 0–100 progress within current level */
  progress?: number;
}

const LEVEL_NAMES = ["新手", "见习", "进阶", "资深", "专家", "大师", "传奇"];

export function ExperienceBar({ level, progress = 0 }: Props) {
  const name = LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)];
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-neutral-500">
        <span>
          Lv.{level} {name}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

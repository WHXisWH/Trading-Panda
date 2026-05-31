"use client";

import { clsx } from "clsx";

const SPEEDS = ["1×", "10×", "100×", "跳到结果"] as const;

interface Props {
  active?: string;
  onChange?: (speed: string) => void;
}

export function SimulationControls({ active = "1×", onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-ink-500">⏱ 训练速度</span>
      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          className={clsx(
            "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
            active === s
              ? "bg-bamboo-500 text-white"
              : "border border-[var(--color-border)] bg-white text-ink-500 hover:bg-bamboo-50"
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

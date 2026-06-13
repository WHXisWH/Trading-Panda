"use client";

import { clsx } from "clsx";
import { PERSONALITY_AXES } from "@/lib/personality";
import { PANDA_LAB_PRESETS } from "@/lib/pandaLabPresets";
import {
  EMOTION_LABELS,
  PANDA_EMOTIONS,
  type PandaEmotion,
  type PandaStats,
} from "@/utils/pandaHelper";

interface PandaLabControlsProps {
  stats: PandaStats;
  onAxisChange: (
    key: "boldness" | "patience" | "intuition" | "focus" | "contrarian",
    value: number
  ) => void;
  onExperienceChange: (value: number) => void;
  onEmotionChange: (emotion: PandaEmotion) => void;
  onPreset: (id: string) => void;
  onRandom: () => void;
  onReset: () => void;
}

function StatSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-[12px]">
        <span className="text-neutral-700">{label}</span>
        <span className="font-mono text-neutral-500">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary-600"
      />
    </label>
  );
}

export function PandaLabControls({
  stats,
  onAxisChange,
  onExperienceChange,
  onEmotionChange,
  onPreset,
  onRandom,
  onReset,
}: PandaLabControlsProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-3 text-[13px] font-semibold text-neutral-900">性格五维</h2>
        <div className="flex flex-col gap-3">
          {PERSONALITY_AXES.map((axis) => (
            <StatSlider
              key={axis.key}
              label={axis.label}
              value={stats[axis.key]}
              onChange={(v) => onAxisChange(axis.key, v)}
            />
          ))}
        </div>
      </div>

      <StatSlider
        label="经验值（成长阶段）"
        value={stats.experience}
        onChange={onExperienceChange}
      />

      <div>
        <label className="mb-1 block text-[12px] text-neutral-700">情绪（眼嘴层）</label>
        <select
          value={stats.emotion}
          onChange={(e) => onEmotionChange(e.target.value as PandaEmotion)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[13px]"
        >
          {PANDA_EMOTIONS.map((e) => (
            <option key={e} value={e}>
              {EMOTION_LABELS[e]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="mb-2 text-[13px] font-semibold text-neutral-900">预设</h2>
        <div className="flex flex-wrap gap-2">
          {PANDA_LAB_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.description}
              onClick={() => onPreset(preset.id)}
              className={clsx(
                "rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px]",
                "hover:border-primary-500 hover:bg-primary-50"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRandom}
          className="rounded-lg border border-primary-500 px-3 py-1.5 text-[12px] text-primary-600 hover:bg-primary-50"
        >
          随机
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-neutral-600 hover:bg-primary-50"
        >
          重置
        </button>
      </div>
    </div>
  );
}

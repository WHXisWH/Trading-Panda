"use client";

import { Slider } from "@/components/ui/Slider";
import { Select } from "@/components/ui/Select";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
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
      <Slider aria-label={label} min={0} max={100} value={value} onValueChange={onChange} />
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
        <Select
          aria-label="情绪"
          value={stats.emotion}
          onValueChange={(v) => onEmotionChange(v as PandaEmotion)}
          options={PANDA_EMOTIONS.map((e) => ({ value: e, label: EMOTION_LABELS[e] }))}
        />
      </div>

      <div>
        <h2 className="mb-2 text-[13px] font-semibold text-neutral-900">预设</h2>
        <div className="flex flex-wrap gap-2">
          {PANDA_LAB_PRESETS.map((preset) => (
            <Tooltip key={preset.id} content={preset.description}>
              <button
                type="button"
                onClick={() => onPreset(preset.id)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] hover:border-primary-500 hover:bg-primary-50"
              >
                {preset.label}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onRandom}>
          随机
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset}>
          重置
        </Button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { PandaAvatar } from "./PandaAvatar";
import { PersonalityRadar } from "./PersonalityRadar";
import { TalentBadge } from "./TalentBadge";
import { ExperienceBar } from "./ExperienceBar";
import { EmotionIndicator } from "./EmotionIndicator";
import { PERSONALITY_AXES, type PersonalityKey } from "@/lib/personality";
import { getGrowthStage } from "@/utils/pandaHelper";

interface Props {
  variant?: "default" | "dashboard-left";
  pandaId: string;
  name?: string;
  boldness: number;
  patience: number;
  intuition: number;
  focus: number;
  contrarian: number;
  talent: number;
  experienceLevel: number;
  emotionState: string;
  calmBambooRemaining?: number;
  pandas?: { id: string; name?: string }[];
}

const STAGE_LABEL: Record<string, string> = {
  infant: "幼年",
  apprentice: "成长",
  mature: "成熟",
};

export function PandaSidebar({
  variant = "default",
  pandaId,
  name = "我的熊猫",
  boldness,
  patience,
  intuition,
  focus,
  contrarian,
  talent,
  experienceLevel,
  emotionState,
  calmBambooRemaining = 3,
  pandas = [],
}: Props) {
  const scores: Record<PersonalityKey, number> = {
    boldness,
    patience,
    intuition,
    focus,
    contrarian,
  };
  const stage = STAGE_LABEL[getGrowthStage(experienceLevel)] ?? "幼年";
  const prof = experienceLevel % 100;
  const isDashboardLeft = variant === "dashboard-left";
  const radarSize = isDashboardLeft ? 120 : 160;

  return (
    <aside
      className={
        isDashboardLeft
          ? "flex w-full min-w-0 max-w-full shrink-0 flex-col gap-3 rounded-xl bg-paper-card p-3"
          : "flex w-full shrink-0 flex-col gap-4 rounded-xl bg-paper-card p-4 lg:w-sidebar"
      }
    >
      <div className="flex flex-col items-center gap-3">
        <PandaAvatar
          panda={{
            boldness,
            patience,
            intuition,
            focus,
            contrarian,
            emotion_state: emotionState,
            experience_level: experienceLevel,
          }}
          emotionState={emotionState}
          size="lg"
        />
        <div className="text-center">
          <h2 className="font-serif text-[15px] font-semibold">{name}</h2>
          <p className="text-[11px] text-ink-500">
            {stage} · 熟练度 {prof}%
          </p>
        </div>
        <EmotionIndicator state={emotionState} />
        <div className="w-full max-w-[140px]">
          <ExperienceBar level={Math.floor(experienceLevel / 10)} progress={prof} />
        </div>
        <TalentBadge talentId={talent} />
      </div>

      <PersonalityRadar scores={scores} size={radarSize} className="mx-auto" />

      {!isDashboardLeft && (
        <div className="grid grid-cols-1 gap-1 text-[11px] text-ink-500">
          {PERSONALITY_AXES.map((axis) => (
            <div key={axis.key} className="flex justify-between">
              <span>{axis.label}</span>
              <span className="font-mono font-medium text-bamboo-500">
                {scores[axis.key]}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] transition-colors hover:bg-bamboo-50"
      >
        🎋 冷静竹 · 今日剩余 {calmBambooRemaining} 次
      </button>

      {pandas.length > 1 && (
        <div className="border-t border-[var(--color-border)] pt-3">
          <label className="mb-1 block text-[10px] text-ink-500">🐾 我的熊猫</label>
          <select
            className="w-full rounded-lg border border-[var(--color-border)] bg-white px-2 py-1.5 text-[13px]"
            defaultValue={pandaId}
            onChange={(e) => {
              window.location.href = `/dashboard/${e.target.value}`;
            }}
          >
            {pandas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name ?? `熊猫 ${p.id.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <Link
        href={`/pools?panda=${pandaId}&focus=${focus}`}
        className="text-center text-[11px] text-bamboo-500 hover:underline"
      >
        配置交易池 →
      </Link>
    </aside>
  );
}

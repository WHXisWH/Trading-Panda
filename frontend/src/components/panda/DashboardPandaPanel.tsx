"use client";

import { PandaAvatar } from "./PandaAvatar";
import { PersonalityRadar } from "./PersonalityRadar";
import { TalentBadge } from "./TalentBadge";
import { ExperienceBar } from "./ExperienceBar";
import { EmotionIndicator } from "./EmotionIndicator";
import { PandaAccountLedger } from "./PandaAccountLedger";
import type { PersonalityKey } from "@/lib/personality";
import { getGrowthStage } from "@/utils/pandaHelper";
import { Select } from "@/components/ui/Select";
import type { AccountPanelSnapshot } from "@/components/trading/AccountPanel";

interface Props {
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
  account: AccountPanelSnapshot;
}

const STAGE_LABEL: Record<string, string> = {
  infant: "幼年",
  apprentice: "成长",
  mature: "成熟",
};

export function DashboardPandaPanel({
  pandaId,
  name = "My Panda",
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
  account,
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

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3 rounded-xl bg-neutral-50 p-3">
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
          <h2 className="font-sans text-[15px] font-semibold">{name}</h2>
          <p className="text-[11px] text-neutral-500">
            {stage} · 熟练度 {prof}%
          </p>
        </div>
        <EmotionIndicator state={emotionState} />
        <div className="w-full max-w-[140px]">
          <ExperienceBar level={Math.floor(experienceLevel / 10)} progress={prof} />
        </div>
        <TalentBadge talentId={talent} />
      </div>

      <PersonalityRadar scores={scores} size={120} className="mx-auto" />

      <PandaAccountLedger snapshot={account} />

      <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
        <button
          type="button"
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] transition-colors hover:bg-primary-50"
        >
          冷静竹 · 今日剩余 {calmBambooRemaining} 次
        </button>

        {pandas.length > 1 && (
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500">My Pandas</label>
            <Select
              size="sm"
              aria-label="My Pandas"
              value={pandaId}
              onValueChange={(v) => {
                window.location.href = `/dashboard/${v}`;
              }}
              options={pandas.map((p) => ({
                value: p.id,
                label: p.name ?? `熊猫 ${p.id.slice(0, 6)}`,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

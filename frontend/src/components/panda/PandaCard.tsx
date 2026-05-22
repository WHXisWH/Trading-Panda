"use client";

import { clsx } from "clsx";
import { PandaAvatar } from "./PandaAvatar";
import { TalentBadge } from "./TalentBadge";
import type { PersonalityKey } from "@/lib/personality";
import { hasTalent } from "@/lib/talent";
import { Button } from "@/components/ui/Button";

interface Props {
  id: string;
  name: string;
  priceSui: number;
  talent: number;
  experienceLevel: number;
  winRate?: number;
  listedAt?: string;
  personality: Record<PersonalityKey, number>;
  emotionState?: string;
  isRare?: boolean;
  isMine?: boolean;
  isSold?: boolean;
  isLocked?: boolean;
  onSelect?: () => void;
  onBuy?: () => void;
}

function topTwoTraits(scores: Record<PersonalityKey, number>): string {
  const entries = Object.entries(scores) as [PersonalityKey, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 2);
  const labels: Record<PersonalityKey, string> = {
    boldness: "胆识",
    patience: "耐性",
    intuition: "直觉",
    focus: "专注",
    contrarian: "逆向",
  };
  return sorted.map(([k, v]) => `${labels[k]}${v}`).join(" · ");
}

export function PandaCard({
  name,
  priceSui,
  talent,
  experienceLevel,
  winRate,
  listedAt,
  personality,
  emotionState = "neutral",
  isRare,
  isMine,
  isSold,
  isLocked,
  onSelect,
  onBuy,
}: Props) {
  const rare = isRare ?? hasTalent(talent);

  return (
    <article
      className={clsx(
        "relative flex w-full flex-col overflow-hidden rounded-xl bg-white transition-shadow hover:shadow-md",
        rare ? "glow-rare animate-glow-pulse" : "border border-[var(--color-border)]",
        (isSold || isLocked) && "opacity-70"
      )}
      style={{ minHeight: 210 }}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
    >
      {isMine && (
        <span className="absolute left-2 top-2 z-10 rounded bg-bamboo-500 px-2 py-0.5 text-[10px] text-white">
          🏷️ 我的
        </span>
      )}
      {(isSold || isLocked) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 text-sm font-medium text-white">
          {isSold ? "已售出" : "🔒 交易中"}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 px-4 pt-5">
        <PandaAvatar
          panda={{
            ...personality,
            emotion_state: emotionState,
            experience_level: experienceLevel,
          }}
          emotionState={emotionState}
          size="md"
        />
        <h3 className="font-serif text-[15px] font-semibold text-ink-900">{name}</h3>
        <p className="text-[11px] text-ink-500">{topTwoTraits(personality)}</p>
        <TalentBadge talentId={talent} />
        <p className="text-[10px] text-ink-500">
          Lv.{experienceLevel}
          {winRate != null && ` · 胜率 ${Math.round(winRate * 100)}%`}
        </p>
        <p className="font-mono text-xl font-bold text-bamboo-500">{priceSui.toFixed(1)} SUI</p>
        {listedAt && <p className="text-[10px] text-ink-500">⏰ {listedAt}</p>}
      </div>

      <div className="mt-auto p-3">
        <Button
          size="sm"
          className="w-full"
          variant={rare ? "primary" : "primary"}
          style={rare ? { backgroundColor: "var(--color-warning)", color: "#1a1a1a" } : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onBuy?.();
          }}
          disabled={isSold || isLocked}
        >
          购买
        </Button>
      </div>
    </article>
  );
}

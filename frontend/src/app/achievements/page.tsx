"use client";

import { Trophy, Star, Zap, Crown } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";

const ACHIEVEMENTS = [
  { icon: Trophy, title: "First Trade", desc: "Your panda executes its first trade", tier: "Common" },
  { icon: Star, title: "10 Wins", desc: "Achieve a 10-trade win streak", tier: "Rare" },
  { icon: Zap, title: "Level 10", desc: "Reach experience level 10", tier: "Common" },
  { icon: Crown, title: "Legendary Panda", desc: "Own a panda with a legendary talent", tier: "Legendary" },
];

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  Common: { bg: "bg-neutral-100", text: "text-neutral-600" },
  Rare: { bg: "bg-blue-50", text: "text-blue-600" },
  Epic: { bg: "bg-purple-50", text: "text-purple-600" },
  Legendary: { bg: "bg-amber-50", text: "text-amber-600" },
};

export default function AchievementsPage() {
  return (
    <PageContainer className="py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Achievements</h1>
          <p className="mt-1 text-sm text-neutral-500">Track your panda&apos;s milestones</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {ACHIEVEMENTS.map(({ icon: Icon, title, desc, tier }) => (
            <Card key={title} variant="default" className="flex items-start gap-4 opacity-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                <Icon className="h-5 w-5 text-neutral-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-neutral-900">{title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TIER_COLORS[tier]?.bg} ${TIER_COLORS[tier]?.text}`}>
                    {tier}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-neutral-500">{desc}</p>
              </div>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-neutral-400">
          Connect your wallet and start trading to unlock achievements
        </p>
      </div>
    </PageContainer>
  );
}

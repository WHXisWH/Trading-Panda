"use client";

import { useState } from "react";
import { Trophy, TrendingUp, Star, Flame } from "lucide-react";
import { clsx } from "clsx";
import { PageContainer } from "@/components/layout/PageContainer";

const TABS = [
  { key: "pnl", label: "P&L", icon: TrendingUp },
  { key: "winrate", label: "Win Rate", icon: Star },
  { key: "xp", label: "Experience", icon: Flame },
] as const;

export default function LeaderboardPage() {
  const [tab, setTab] = useState<string>("pnl");

  return (
    <PageContainer className="py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Leaderboard</h1>
          <p className="mt-1 text-sm text-neutral-500">Top pandas on Sui Testnet</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-neutral-100 p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === key
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Placeholder */}
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 py-16 text-center">
          <Trophy className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm font-medium text-neutral-500">
            Leaderboard data will appear here
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Rankings are calculated from on-chain trade history
          </p>
        </div>
      </div>
    </PageContainer>
  );
}

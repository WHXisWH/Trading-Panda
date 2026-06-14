"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Star, Flame, Trophy } from "lucide-react";
import { clsx } from "clsx";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

const TABS = [
  { key: "pnl", label: "P&L", icon: TrendingUp },
  { key: "winrate", label: "Win Rate", icon: Star },
  { key: "level", label: "Experience", icon: Flame },
] as const;

interface Entry {
  rank: number;
  panda_id: string;
  owner_name: string | null;
  level: number;
  trade_count: number;
  win_rate: number;
  total_pnl_pct: number;
}

function metric(entry: Entry, dim: string): string {
  if (dim === "pnl")
    return `${entry.total_pnl_pct >= 0 ? "+" : ""}${entry.total_pnl_pct.toFixed(2)}%`;
  if (dim === "winrate") return `${(entry.win_rate * 100).toFixed(0)}%`;
  return `Lv.${entry.level}`;
}

function rankBadge(rank: number): string {
  if (rank === 1) return "bg-amber-100 text-amber-700";
  if (rank === 2) return "bg-neutral-200 text-neutral-700";
  if (rank === 3) return "bg-orange-100 text-orange-700";
  return "bg-neutral-100 text-neutral-500";
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<string>("pnl");

  const { data, isLoading } = useQuery<Entry[]>({
    queryKey: ["leaderboard", tab],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?dimension=${tab}&limit=50`);
      const json = await res.json();
      return json?.data?.entries ?? [];
    },
  });

  return (
    <PageContainer className="py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Leaderboard</h1>
          <p className="mt-1 text-sm text-neutral-500">Top pandas on Sui Testnet</p>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg bg-neutral-100 p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-fast ease-smooth",
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

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center">
            <Trophy className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-3 text-sm text-neutral-500">
              No ranked pandas yet — start training to climb.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((entry) => (
              <div
                key={entry.panda_id}
                className="lift flex items-center gap-4 rounded-xl border border-neutral-200 bg-brand-soft px-4 py-3"
              >
                <span
                  className={clsx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    rankBadge(entry.rank),
                  )}
                >
                  {entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {entry.owner_name || `Panda ${entry.panda_id.slice(0, 6)}`}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {entry.trade_count} trades · Lv.{entry.level}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold text-primary-600">
                  {metric(entry, tab)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

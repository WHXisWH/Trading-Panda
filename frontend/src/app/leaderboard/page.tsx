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
  if (rank === 1) return "bg-product-gold/20 text-product-gold";
  if (rank === 2) return "bg-white/10 text-product-text";
  if (rank === 3) return "bg-product-amber/15 text-product-amber";
  return "bg-white/[0.06] text-product-muted";
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
          <div className="product-eyebrow">Community</div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-product-text">Leaderboard</h1>
          <p className="mt-1 text-sm text-product-muted">Top pandas on Sui Testnet</p>
        </div>

        <div className="product-panel mb-6 flex gap-1 p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2 font-mono text-[11px] font-extrabold transition-colors duration-fast ease-smooth",
                tab === key
                  ? "bg-gradient-to-br from-product-green to-[#bfff87] text-[#071108] shadow-[var(--glow-green)]"
                  : "text-product-muted hover:text-product-text",
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
          <div className="product-panel border-dashed py-16 text-center">
            <Trophy className="mx-auto h-8 w-8 text-product-muted/50" />
            <p className="mt-3 text-sm text-product-muted">
              No ranked pandas yet — start training to climb.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((entry) => (
              <div
                key={entry.panda_id}
                className="product-panel flex items-center gap-4 px-4 py-3"
              >
                <span
                  className={clsx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold",
                    rankBadge(entry.rank),
                  )}
                >
                  {entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-product-text">
                    {entry.owner_name || `Panda ${entry.panda_id.slice(0, 6)}`}
                  </p>
                  <p className="font-mono text-xs text-product-muted">
                    {entry.trade_count} trades · Lv.{entry.level}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold text-product-green">
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

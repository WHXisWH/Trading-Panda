"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Trophy,
  Star,
  Zap,
  Crown,
  Target,
  Flame,
  Medal,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";

interface AchievementItem {
  code: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlocked_at: string | null;
}

const ICONS: Record<string, LucideIcon> = {
  first_panda: Star,
  collector: Crown,
  first_trade: Zap,
  ten_trades: Target,
  hundred_trades: Flame,
  in_the_green: TrendingUp,
  sharp_shooter: Medal,
  veteran: Award,
  grandmaster: Crown,
};

export default function AchievementsPage() {
  const { jwt, isAuthed } = useAuth();

  const { data, isLoading } = useQuery<{ unlocked: number; total: number; achievements: AchievementItem[] }>({
    queryKey: ["achievements", jwt],
    enabled: !!jwt,
    queryFn: async () => {
      const res = await fetch("/api/achievements", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = await res.json();
      return json?.data ?? { unlocked: 0, total: 0, achievements: [] };
    },
  });

  const items = data?.achievements ?? [];

  return (
    <PageContainer className="py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="product-eyebrow">Milestones</div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-product-text">Achievements</h1>
            <p className="mt-1 text-sm text-product-muted">Track your panda&apos;s milestones</p>
          </div>
          {data ? (
            <span className="product-chip rounded-full px-3 py-1.5 text-[11px]">
              {data.unlocked} / {data.total}
            </span>
          ) : null}
        </div>

        {!isAuthed ? (
          <div className="product-panel border-dashed py-16 text-center">
            <Award className="mx-auto h-8 w-8 text-product-muted/50" />
            <p className="mt-3 text-sm text-product-muted">
              Connect your wallet to track achievements.
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((a) => {
              const Icon = ICONS[a.code] ?? Trophy;
              return (
                <Card
                  key={a.code}
                  className={clsx("flex items-start gap-4", !a.unlocked && "opacity-50")}
                >
                  <div
                    className={clsx(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      a.unlocked
                        ? "bg-product-green/15 text-product-green"
                        : "bg-white/[0.06] text-product-muted",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-product-text">{a.title}</h3>
                      {a.unlocked ? (
                        <span className="rounded-full bg-product-green/15 px-2 py-0.5 font-mono text-[10px] font-bold text-product-green">
                          Unlocked
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-product-muted">{a.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { User, Wallet, Flame, Check } from "lucide-react";

interface CheckinStatus {
  checked_in_today: boolean;
  streak: number;
  history: string[];
}

export default function ProfilePage() {
  const { user, isAuthed, jwt } = useAuth();
  const qc = useQueryClient();

  const { data: checkin } = useQuery<CheckinStatus>({
    queryKey: ["checkin", jwt],
    enabled: !!jwt,
    queryFn: async () => {
      const res = await fetch("/api/checkin", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = await res.json();
      return json?.data ?? { checked_in_today: false, streak: 0, history: [] };
    },
  });

  const claim = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error("checkin failed");
      return (await res.json())?.data;
    },
    onSuccess: (data) => {
      toast.success(
        data?.already_checked_in
          ? "Already checked in today"
          : `Checked in! Streak ${data?.streak} · +${data?.reward_amount} bamboo`,
      );
      qc.invalidateQueries({ queryKey: ["checkin"] });
    },
    onError: () => toast.error("Check-in failed. Try again."),
  });

  if (!isAuthed) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <User className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm font-medium text-neutral-500">
            Connect your wallet to view your profile
          </p>
        </div>
      </PageContainer>
    );
  }

  const last7 = buildLast7(checkin?.history ?? []);

  return (
    <PageContainer className="py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Profile</h1>
          <p className="mt-1 text-sm text-neutral-500">Your TradingPanda account</p>
        </div>

        <Card variant="default" className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
              <Wallet className="h-5 w-5 text-primary-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-neutral-500">Wallet</p>
              <p className="font-mono text-sm text-neutral-900 break-all">
                {user?.walletAddress ?? "—"}
              </p>
            </div>
          </div>
        </Card>

        {/* ── Daily check-in ── */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                <Flame className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Daily Check-in</p>
                <p className="text-sm font-semibold text-neutral-900">
                  {checkin?.streak ?? 0}-day streak
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={checkin?.checked_in_today ? "outline" : "primary"}
              disabled={checkin?.checked_in_today || claim.isPending}
              loading={claim.isPending}
              onClick={() => claim.mutate()}
            >
              {checkin?.checked_in_today ? "Checked in" : "Check in"}
            </Button>
          </div>

          <div className="flex gap-1.5">
            {last7.map((d) => (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center gap-1"
                title={d.date}
              >
                <div
                  className={
                    d.done
                      ? "flex h-8 w-full items-center justify-center rounded-md bg-primary-500 text-white"
                      : "flex h-8 w-full items-center justify-center rounded-md bg-neutral-100 text-neutral-300"
                  }
                >
                  {d.done && <Check className="h-4 w-4" />}
                </div>
                <span className="text-[10px] text-neutral-400">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

function buildLast7(history: string[]): { date: string; label: string; done: boolean }[] {
  const set = new Set(history);
  const days: { date: string; label: string; done: boolean }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      date: iso,
      label: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()],
      done: set.has(iso),
    });
  }
  return days;
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PandaSidebar } from "@/components/panda/PandaSidebar";
import { CandlestickChart } from "@/components/trading/CandlestickChart";
import { AccountPanel } from "@/components/trading/AccountPanel";
import { StrategyInput } from "@/components/trading/StrategyInput";
import { DecisionPanel } from "@/components/trading/DecisionPanel";
import { SimulationControls } from "@/components/trading/SimulationControls";
import { Skeleton } from "@/components/ui/Skeleton";
import { MOCK_DECISIONS } from "@/lib/mockData";
import { fetchMyPandas, fetchPandaDetail } from "@/services/panda.service";
import type { PandaDetailApi } from "@/types/panda";
import Link from "next/link";

interface StrategyAPI {
  id: string;
  raw_text: string;
  philosophy: string;
  proficiency: number;
}

export default function DashboardPage({ params }: { params: { id: string } }) {
  const { jwt } = useAuth();
  const qc = useQueryClient();
  const [strategyText, setStrategyText] = useState("");
  const [simRunning, setSimRunning] = useState(false);
  const [simSpeed, setSimSpeed] = useState("1×");

  const { data: panda, isLoading } = useQuery<PandaDetailApi>({
    queryKey: ["panda", params.id, jwt],
    enabled: !!jwt,
    queryFn: () => fetchPandaDetail(jwt!, params.id),
    refetchInterval: simRunning ? 3000 : false,
  });

  const { data: allPandas } = useQuery({
    queryKey: ["panda", "my", jwt],
    enabled: !!jwt,
    queryFn: () => fetchMyPandas(jwt!),
  });

  const { data: strategy } = useQuery<StrategyAPI | null>({
    queryKey: ["strategy", params.id, jwt],
    enabled: !!jwt,
    queryFn: () =>
      fetch(`/api/pandas/${params.id}/strategy`, {
        headers: { Authorization: `Bearer ${jwt}` },
      }).then((r) => r.json()),
  });

  const submitStrategy = useMutation({
    mutationFn: (text: string) =>
      fetch(`/api/pandas/${params.id}/strategy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ rawText: text }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("策略已喂给熊猫");
      qc.invalidateQueries({ queryKey: ["strategy", params.id] });
      setStrategyText("");
    },
    onError: () => toast.error("策略提交失败"),
  });

  const toggleSim = async () => {
    const action = simRunning ? "stop" : "start";
    const res = await fetch(`/api/pandas/${params.id}/simulation/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: action === "start" ? JSON.stringify({ speed: simSpeed }) : "{}",
    });
    if (res.ok) {
      setSimRunning(!simRunning);
      toast.success(simRunning ? "模拟已暂停" : "模拟已启动");
    }
  };

  if (!jwt) {
    return (
      <PageContainer className="flex min-h-[calc(100dvh-var(--navbar-height))] items-center justify-center">
        <p className="text-ink-500">请先连接钱包</p>
      </PageContainer>
    );
  }

  if (isLoading || !panda) {
    return (
      <PageContainer className="py-6">
        <div className="flex gap-4">
          <Skeleton className="h-96 w-sidebar" />
          <Skeleton className="h-96 flex-1" />
          <Skeleton className="h-96 w-decision" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-4">
      <div className="dashboard-layout">
        <PandaSidebar
          pandaId={panda.id}
          name={panda.name ?? undefined}
          boldness={panda.personality.boldness}
          patience={panda.personality.patience}
          intuition={panda.personality.intuition}
          focus={panda.personality.focus}
          contrarian={panda.personality.contrarian}
          talent={panda.talent?.id ?? 0}
          experienceLevel={panda.experience_level}
          emotionState={panda.emotion_state}
          pandas={(allPandas ?? []).map((p) => ({
            id: p.id,
            name: p.name ?? undefined,
          }))}
        />

        <main className="min-w-0 flex-1 space-y-4">
          <CandlestickChart />

          <div className="grid gap-4 md:grid-cols-2">
            <AccountPanel isProfit />
            <StrategyInput
              value={strategyText}
              onChange={setStrategyText}
              onSubmit={() => submitStrategy.mutate(strategyText)}
              loading={submitStrategy.isPending}
              hasStrategy={!!strategy}
              matchScore={strategy ? Math.round(strategy.proficiency * 100) : undefined}
            />
          </div>

          {strategy && (
            <p className="rounded-lg bg-paper-card px-3 py-2 text-[12px] italic text-ink-500">
              当前策略：{strategy.raw_text.slice(0, 80)}
              {strategy.raw_text.length > 80 ? "…" : ""}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-paper-card px-4 py-3">
            <SimulationControls active={simSpeed} onChange={setSimSpeed} />
            <button
              type="button"
              onClick={toggleSim}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                simRunning ? "bg-vermillion" : "bg-bamboo-500"
              }`}
            >
              {simRunning ? "⏸ 停止模拟" : "▶ 启动模拟"}
            </button>
            <span className="text-[11px] text-ink-500">
              交易池: Cetus BTC/SUI ·{" "}
              <Link href={`/pools?panda=${panda.id}`} className="text-bamboo-500 hover:underline">
                更改
              </Link>
              {" · "}
              <Link href={`/trading/${panda.id}`} className="text-bamboo-500 hover:underline">
                交易界面
              </Link>
            </span>
          </div>
        </main>

        <DecisionPanel decisions={MOCK_DECISIONS} />
      </div>
    </PageContainer>
  );
}

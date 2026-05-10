"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PersonalityRadar } from "@/components/panda/PersonalityRadar";
import { EmotionIndicator } from "@/components/panda/EmotionIndicator";
import { TalentBadge } from "@/components/panda/TalentBadge";
import { ExperienceBar } from "@/components/panda/ExperienceBar";
import { PandaAvatar } from "@/components/panda/PandaAvatar";
import { type PersonalityKey } from "@/lib/personality";

interface PandaAPI {
  id: string;
  sui_object_id: string;
  boldness: number;
  patience: number;
  intuition: number;
  focus: number;
  contrarian: number;
  talent: number;
  generation: number;
  experience_level: number;
  is_trading: boolean;
  emotion_state: string;
  emotion_stability: number;
  active_strategy_id: string | null;
}

interface StrategyAPI {
  id: string;
  raw_text: string;
  philosophy: string;
  proficiency: number;
  created_at: string;
}

export default function DashboardPage({ params }: { params: { id: string } }) {
  const { jwt } = useAuth();
  const qc = useQueryClient();
  const [strategyText, setStrategyText] = useState("");
  const [simRunning, setSimRunning] = useState(false);

  const { data: panda, isLoading } = useQuery<PandaAPI>({
    queryKey: ["panda", params.id, jwt],
    enabled: !!jwt,
    queryFn: () =>
      fetch(`/api/pandas/${params.id}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      }).then((r) => {
        if (!r.ok) throw new Error("加载失败");
        return r.json();
      }),
    refetchInterval: simRunning ? 3000 : false,
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
      toast.success("策略已解析并保存");
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
      body: action === "start" ? JSON.stringify({ speed: "1x" }) : "{}",
    });
    if (res.ok) {
      setSimRunning(!simRunning);
      toast.success(simRunning ? "模拟已暂停" : "模拟已启动");
    }
  };

  if (!jwt) {
    return (
      <PageContainer className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <p className="text-ink-500">请先连接钱包</p>
      </PageContainer>
    );
  }

  if (isLoading || !panda) {
    return (
      <PageContainer className="py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </PageContainer>
    );
  }

  const personalityScores: Record<PersonalityKey, number> = {
    boldness: panda.boldness,
    patience: panda.patience,
    intuition: panda.intuition,
    focus: panda.focus,
    contrarian: panda.contrarian,
  };

  return (
    <PageContainer className="space-y-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="font-serif text-2xl font-bold text-bamboo-900">
            模拟盘
          </h1>
          <p className="font-mono text-xs text-ink-500">
            {panda.sui_object_id?.slice(0, 20)}…
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>Gen {panda.generation}</Badge>
          <TalentBadge talentId={panda.talent} />
          {simRunning && (
            <Badge color="#4a7c59">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              模拟中
            </Badge>
          )}
        </div>
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Column 1: Panda avatar + emotion + experience */}
        <Card variant="ink" className="flex flex-col items-center gap-5 py-8">
          <PandaAvatar emotionState={panda.emotion_state} size="xl" />
          <EmotionIndicator state={panda.emotion_state} showDesc />
          <div className="w-full px-2">
            <ExperienceBar
              level={panda.experience_level}
              progress={(panda.experience_level % 10) * 10}
            />
          </div>
          <Button
            size="sm"
            variant={simRunning ? "danger" : "primary"}
            className="w-full"
            onClick={toggleSim}
          >
            {simRunning ? "⏸ 停止模拟" : "▶ 启动模拟"}
          </Button>
        </Card>

        {/* Column 2: Personality radar */}
        <Card variant="bordered" className="flex flex-col gap-4">
          <h2 className="font-semibold text-bamboo-900">性格五轴</h2>
          <PersonalityRadar scores={personalityScores} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-500">
            {Object.entries(personalityScores).map(([key, val]) => (
              <div key={key} className="flex justify-between">
                <span>
                  {key === "boldness" && "大胆"}
                  {key === "patience" && "耐心"}
                  {key === "intuition" && "直觉"}
                  {key === "focus" && "专注"}
                  {key === "contrarian" && "逆向"}
                </span>
                <span className="font-mono font-medium text-bamboo-900">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Column 3: Strategy */}
        <Card variant="bordered" className="flex flex-col gap-4">
          <h2 className="font-semibold text-bamboo-900">策略</h2>

          {strategy ? (
            <div className="space-y-2">
              <Badge color="#4a7c59">{strategy.philosophy}</Badge>
              <p className="text-sm italic leading-relaxed text-ink-500">
                &ldquo;{strategy.raw_text}&rdquo;
              </p>
              <p className="text-xs text-ink-500">
                熟练度 {Math.round(strategy.proficiency * 100)}%
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-500">尚未喂策略</p>
          )}

          <div className="mt-auto space-y-2">
            <p className="text-xs text-ink-500">用自然语言描述新策略</p>
            <textarea
              className="w-full resize-none rounded-lg border border-ink-100 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-bamboo-500"
              rows={4}
              placeholder={"例如：RSI < 30 时买入，设 5% 止损，仓位不超过 10%"}
              value={strategyText}
              onChange={(e) => setStrategyText(e.target.value)}
            />
            <Button
              size="sm"
              className="w-full"
              loading={submitStrategy.isPending}
              disabled={!strategyText.trim()}
              onClick={() => submitStrategy.mutate(strategyText)}
            >
              提交策略
            </Button>
          </div>
        </Card>
      </div>

      {/* K-line placeholder */}
      <Card variant="bordered" className="space-y-3">
        <h2 className="font-semibold text-bamboo-900">交易记录 / K 线图</h2>
        <div className="flex h-48 items-center justify-center rounded-lg bg-ink-100 text-sm text-ink-500">
          模拟运行中数据将在此处展示（WebSocket 接入后显示实时 K 线）
        </div>
      </Card>
    </PageContainer>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMarketWs } from "@/hooks/useMarketWs";
import { useSimulationWs, type SimulationWsEvent } from "@/hooks/useSimulationWs";
import { PageContainer } from "@/components/layout/PageContainer";
import { CandlestickChart } from "@/components/trading/CandlestickChart";
import { DashboardTrainingBar } from "@/components/trading/DashboardTrainingBar";
import { DashboardLeftColumn } from "@/components/trading/DashboardLeftColumn";
import { DashboardMainFooter } from "@/components/trading/DashboardMainFooter";
import { DashboardRightColumn } from "@/components/trading/DashboardRightColumn";
import { DashboardStrategySection } from "@/components/trading/DashboardStrategySection";
import { StrategyMobileDrawer } from "@/components/trading/StrategyMobileDrawer";
import { tradeToDecisionLog } from "@/components/trading/TradeHistory";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  isDeepbookPool,
  resolveSubscribedPools,
  type DeepbookPool,
} from "@/lib/constants/deepbookPools";
import { POOLS_PRIMARY_KEY, POOLS_STORAGE_KEY } from "@/lib/pools/catalog";
import { fetchMyPandas, fetchPandaDetail } from "@/services/panda.service";
import {
  feedStrategy,
  getStrategy,
  parseStrategyWithLlm,
  strategyErrorMessage,
  validateStrategy,
} from "@/services/strategy.service";
import {
  fetchSimulationStatus,
  startTraining,
  stopTraining,
} from "@/services/simulation.service";
import { updatePandaPools } from "@/services/pools.service";
import { fetchTrades } from "@/services/trades.service";
import type { AccountPanelSnapshot } from "@/components/trading/AccountPanel";
import type { PandaDetailApi } from "@/types/panda";
import type { ParsedStrategyLayers, StrategyFeedData, StrategyRecord } from "@/types/strategy";
import type { DecisionLog } from "@/types/trading";
import type { TradeRecordApi } from "@/types/trading";

export default function DashboardPage({ params }: { params: { id: string } }) {
  const { jwt } = useAuth();
  const qc = useQueryClient();
  const [pool, setPool] = useState<DeepbookPool>("DEEP/SUI");
  const [simRunning, setSimRunning] = useState(false);
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [simSpeed, setSimSpeed] = useState("1×");
  const [liveDecision, setLiveDecision] = useState<DecisionLog | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<DecisionLog | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [invalidRuleIndexes, setInvalidRuleIndexes] = useState<number[]>([]);
  const [builderSeed, setBuilderSeed] = useState<ParsedStrategyLayers | null>(null);
  const [pandaReaction, setPandaReaction] = useState<string | null>(null);
  const [strategyDrawerOpen, setStrategyDrawerOpen] = useState(false);

  const { data: panda, isLoading } = useQuery<PandaDetailApi>({
    queryKey: ["panda", params.id, jwt],
    enabled: !!jwt,
    queryFn: () => fetchPandaDetail(jwt!, params.id),
  });

  const { data: simStatus, refetch: refetchSimStatus } = useQuery({
    queryKey: ["simulation-status", params.id, jwt],
    enabled: !!jwt,
    queryFn: () => fetchSimulationStatus(jwt!, params.id),
    refetchOnWindowFocus: true,
    refetchInterval: simRunning ? 2000 : false,
  });

  useEffect(() => {
    if (simStatus?.actor_active || simStatus?.status === "running") {
      setSimRunning(true);
      if (simStatus.simulation_id) {
        setSimulationId(simStatus.simulation_id);
      }
    }
  }, [simStatus]);

  const { data: allPandas } = useQuery({
    queryKey: ["panda", "my", jwt],
    enabled: !!jwt,
    queryFn: () => fetchMyPandas(jwt!),
  });

  const { data: strategy } = useQuery<StrategyRecord | null>({
    queryKey: ["strategy", params.id, jwt],
    enabled: !!jwt,
    queryFn: () => getStrategy(jwt!, params.id),
  });

  const subscribedPools = useMemo(
    () => resolveSubscribedPools(panda?.subscribed_pools),
    [panda?.subscribed_pools],
  );

  useEffect(() => {
    if (!panda) {
      return;
    }
    const primary =
      panda.primary_pool && subscribedPools.includes(panda.primary_pool)
        ? panda.primary_pool
        : subscribedPools[0];
    setPool(primary);
  }, [panda, subscribedPools]);

  const {
    data: trades = [],
    isLoading: tradesLoading,
    refetch: refetchTrades,
  } = useQuery<TradeRecordApi[]>({
    queryKey: ["trades", params.id, simulationId, jwt],
    enabled: !!jwt,
    queryFn: () =>
      fetchTrades(jwt!, params.id, {
        simulationId: simulationId ?? undefined,
        limit: 50,
      }),
    refetchInterval: simRunning ? 5000 : false,
  });

  const market = useMarketWs({
    pool,
    pairs: [pool],
    enabled: !!jwt,
    interval: "1m",
  });

  const onSimulationEvent = useCallback(
    (evt: SimulationWsEvent) => {
      if (evt.type === "decision") {
        setLiveDecision(evt.payload);
        setSelectedTradeId(null);
        setReviewDecision(null);
      }
      if (evt.type === "trade_executed") {
        const trade = evt.payload;
        qc.setQueryData<TradeRecordApi[]>(
          ["trades", params.id, simulationId, jwt],
          (old) => {
            if (old?.some((t) => t.id === trade.id)) {
              return old;
            }
            return [trade, ...(old ?? [])];
          },
        );
        void refetchTrades();
        void refetchSimStatus();
      }
    },
    [jwt, params.id, qc, refetchSimStatus, refetchTrades, simulationId],
  );

  useSimulationWs({
    pandaId: params.id,
    simulationId,
    enabled: simRunning && !!simulationId,
    onEvent: onSimulationEvent,
  });

  const feedMutation = useMutation({
    mutationFn: (parsed: ParsedStrategyLayers) =>
      feedStrategy(jwt!, params.id, { parsed }),
    onSuccess: (data: StrategyFeedData) => {
      toast.success("策略已教给熊猫");
      setMatchScore(data.personality_match);
      setPandaReaction(data.panda_reaction);
      setWarnings([]);
      setInvalidRuleIndexes([]);
      qc.invalidateQueries({ queryKey: ["strategy", params.id] });
      setStrategyDrawerOpen(false);
    },
    onError: (err) => toast.error(strategyErrorMessage(err)),
  });

  const validateMutation = useMutation({
    mutationFn: (parsed: ParsedStrategyLayers) =>
      validateStrategy(jwt!, params.id, { parsed }),
    onSuccess: (data) => {
      setWarnings(data.warnings);
      setInvalidRuleIndexes(data.invalid_rules.map((r) => r.index));
      if (data.valid) {
        toast.success(
          `试编译通过：${data.compiled_count} 条规则` +
            (data.preview_signal
              ? ` · 预览 ${data.preview_signal.buy_hits}买/${data.preview_signal.sell_hits}卖`
              : ""),
        );
      } else {
        toast.error("部分规则无法编译");
      }
    },
    onError: (err) => toast.error(strategyErrorMessage(err)),
  });

  const parseMutation = useMutation({
    mutationFn: (text: string) => parseStrategyWithLlm(jwt!, params.id, text),
    onSuccess: (data) => {
      setBuilderSeed(data.parsed);
      setMatchScore(data.personality_match);
      setPandaReaction(data.panda_reaction);
      toast.success("已解析并灌入积木，可编辑后提交");
      qc.invalidateQueries({ queryKey: ["strategy", params.id] });
    },
    onError: (err) => toast.error(strategyErrorMessage(err)),
  });

  const handleSelectTrade = (trade: TradeRecordApi) => {
    setSelectedTradeId(trade.id);
    setReviewDecision(tradeToDecisionLog(trade));
  };

  const handleClearReview = () => {
    setSelectedTradeId(null);
    setReviewDecision(null);
  };

  const handlePoolChange = async (next: DeepbookPool) => {
    if (!subscribedPools.includes(next)) {
      return;
    }
    setPool(next);
    if (!jwt) {
      return;
    }
    const subs = [
      next,
      ...subscribedPools.filter((p) => p !== next),
    ] as DeepbookPool[];
    localStorage.setItem(POOLS_STORAGE_KEY, JSON.stringify(subs));
    localStorage.setItem(POOLS_PRIMARY_KEY, next);
    try {
      await updatePandaPools(jwt, params.id, {
        subscribed_pools: subs,
        primary_pool: next,
      });
      await qc.invalidateQueries({ queryKey: ["panda", params.id] });
    } catch {
      /* non-blocking — chart still switches */
    }
  };

  const toggleTraining = async () => {
    if (!jwt) {
      return;
    }
    if (!strategy && !simRunning) {
      toast.error("请先教给熊猫策略");
      return;
    }
    try {
      if (simRunning) {
        await stopTraining(jwt, params.id);
        setSimRunning(false);
        setSimulationId(null);
        toast.success("训练已暂停");
      } else {
        const data = await startTraining(jwt, params.id, {
          speed: simSpeed,
          subscribedPools,
        });
        setSimulationId(data.simulation_id);
        setSimRunning(true);
        setLiveDecision(null);
        toast.success("开始训练");
        void refetchTrades();
        void refetchSimStatus();
      }
      qc.invalidateQueries({ queryKey: ["simulation-status", params.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "训练操作失败");
    }
  };

  if (!jwt) {
    return (
      <PageContainer
        variant="dashboard"
        className="flex min-h-[calc(100dvh-var(--navbar-height))] items-center justify-center"
      >
        <p className="text-ink-500">请先连接钱包</p>
      </PageContainer>
    );
  }

  if (isLoading || !panda) {
    return (
      <PageContainer variant="dashboard">
        <div className="dashboard-layout-v2">
          <Skeleton className="hidden h-[520px] lg:block lg:w-[260px]" />
          <div className="flex flex-1 flex-col gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="hidden h-64 lg:block lg:w-[200px]" />
        </div>
      </PageContainer>
    );
  }

  const displayMatch = matchScore ?? strategy?.personality_match ?? null;
  const builderKey = builderSeed
    ? JSON.stringify(builderSeed)
    : strategy?.strategy_id ?? "default";

  const strategySectionProps = {
    builderKey,
    loading: feedMutation.isPending,
    parseLoading: parseMutation.isPending,
    matchScore: displayMatch,
    warnings,
    invalidRuleIndexes,
    initialParsed: builderSeed ?? strategy?.parsed ?? null,
    strategy,
    pandaReaction,
    onValidate: (parsed: ParsedStrategyLayers) => validateMutation.mutate(parsed),
    onSubmit: (parsed: ParsedStrategyLayers) => feedMutation.mutate(parsed),
    onParseText: (text: string) => parseMutation.mutate(text),
  };

  const lastPrice =
    market.lastTick?.price ??
    (market.history?.candles?.length
      ? market.history.candles[market.history.candles.length - 1].c
      : undefined);

  const accountSnapshot: AccountPanelSnapshot = {
    equity: simStatus?.equity ?? simStatus?.initial_capital ?? 10_000,
    initialCapital: simStatus?.initial_capital ?? 10_000,
    positions: simStatus?.positions ?? {},
    tradeCount: simStatus?.trade_count ?? trades.length,
    pool,
    lastPrice,
    training: simRunning,
  };

  const pandaList = (allPandas ?? []).map((p) => ({
    id: p.id,
    name: p.name ?? undefined,
  }));

  return (
    <PageContainer variant="dashboard" className="pb-20 lg:pb-4">
      <div className="dashboard-layout-v2">
        <DashboardLeftColumn
          className="order-2 lg:order-none"
          account={accountSnapshot}
          panda={{
            pandaId: panda.id,
            name: panda.name ?? undefined,
            boldness: panda.personality.boldness,
            patience: panda.personality.patience,
            intuition: panda.personality.intuition,
            focus: panda.personality.focus,
            contrarian: panda.personality.contrarian,
            talent: panda.talent?.id ?? 0,
            experienceLevel: panda.experience_level,
            emotionState: panda.emotion_state,
            pandas: pandaList,
          }}
        />

        <div className="dashboard-col-main order-1 min-w-0">
          <DashboardTrainingBar
            pandaId={panda.id}
            focus={panda.personality.focus}
            subscribedPools={subscribedPools}
            simSpeed={simSpeed}
            simRunning={simRunning}
            canTrain={!!strategy || simRunning}
            onSpeedChange={setSimSpeed}
            onToggleTraining={toggleTraining}
          />

          <CandlestickChart
            pool={pool}
            availablePools={subscribedPools}
            onPoolChange={handlePoolChange}
            history={market.history}
            lastTick={market.lastTick}
            historyError={market.historyError}
            trades={trades}
          />

          <DashboardMainFooter
            liveDecision={liveDecision}
            reviewDecision={reviewDecision}
            trades={trades}
            selectedTradeId={selectedTradeId}
            onSelectTrade={handleSelectTrade}
            onClearReview={handleClearReview}
            training={simRunning}
            tradesLoading={tradesLoading}
          />
        </div>

        <DashboardRightColumn
          strategy={strategySectionProps}
          className="order-3 hidden xl:flex"
        />
      </div>

      <StrategyMobileDrawer open={strategyDrawerOpen} onOpenChange={setStrategyDrawerOpen}>
        <DashboardStrategySection {...strategySectionProps} />
      </StrategyMobileDrawer>
    </PageContainer>
  );
}

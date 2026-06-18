"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMarketWs } from "@/hooks/useMarketWs";
import { useSimulationSession } from "@/hooks/useSimulationSession";
import { PageContainer } from "@/components/layout/PageContainer";
import { CandlestickChart } from "@/components/trading/CandlestickChart";
import { DashboardTradingWorkspace } from "@/components/trading/DashboardTradingWorkspace";
import { SimulationStatusBar } from "@/components/trading/SimulationStatusBar";
import { DashboardLeftColumn } from "@/components/trading/DashboardLeftColumn";
import { DashboardMainFooter } from "@/components/trading/DashboardMainFooter";
import { DashboardRightColumn } from "@/components/trading/DashboardRightColumn";
import { DashboardStrategySection } from "@/components/trading/DashboardStrategySection";
import { StrategyMobileDrawer } from "@/components/trading/StrategyMobileDrawer";
import { Skeleton } from "@/components/ui/Skeleton";
import {
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
import { updatePandaPools } from "@/services/pools.service";
import type { AccountPanelSnapshot } from "@/components/trading/AccountPanel";
import type { PandaDetailApi } from "@/types/panda";
import type { ParsedStrategyLayers, StrategyRecord } from "@/types/strategy";
import type { MarketInterval } from "@/types/ws";

export default function DashboardPage({ params }: { params: { id: string } }) {
  const { jwt } = useAuth();
  const qc = useQueryClient();

  // ── Pool & Market ──
  const [pool, setPool] = useState<DeepbookPool>("DEEP/SUI");
  const [marketInterval, setMarketInterval] = useState<MarketInterval>("1m");

  // ── Strategy UI ──
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [invalidRuleIndexes, setInvalidRuleIndexes] = useState<number[]>([]);
  const [builderSeed, setBuilderSeed] = useState<ParsedStrategyLayers | null>(null);
  const [pandaReaction, setPandaReaction] = useState<string | null>(null);
  const [strategyDrawerOpen, setStrategyDrawerOpen] = useState(false);

  // ── Data Queries ──
  const { data: panda, isLoading } = useQuery<PandaDetailApi>({
    queryKey: ["panda", params.id, jwt],
    enabled: !!jwt,
    queryFn: () => fetchPandaDetail(jwt!, params.id),
  });

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
    if (!panda) return;
    const primary =
      panda.primary_pool && subscribedPools.includes(panda.primary_pool)
        ? panda.primary_pool
        : subscribedPools[0];
    setPool(primary);
  }, [panda, subscribedPools]);

  // ── Simulation Session (unified) ──
  const session = useSimulationSession(params.id, !!strategy);

  // ── Market WebSocket ──
  const market = useMarketWs({
    pool,
    pairs: [pool],
    enabled: !!jwt,
    interval: marketInterval,
  });

  // ── Strategy Mutations ──
  const feedMutation = useMutation({
    mutationFn: (parsed: ParsedStrategyLayers) =>
      feedStrategy(jwt!, params.id, { parsed }),
    onSuccess: (data) => {
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

  // ── Pool change handler ──
  const handlePoolChange = async (next: string) => {
    if (!subscribedPools.includes(next as DeepbookPool)) return;
    setPool(next as DeepbookPool);
    if (!jwt) return;
    const subs = [next, ...subscribedPools.filter((p) => p !== next)] as DeepbookPool[];
    localStorage.setItem(POOLS_STORAGE_KEY, JSON.stringify(subs));
    localStorage.setItem(POOLS_PRIMARY_KEY, next);
    try {
      await updatePandaPools(jwt, params.id, {
        subscribed_pools: subs,
        primary_pool: next as DeepbookPool,
      });
      await qc.invalidateQueries({ queryKey: ["panda", params.id] });
    } catch {
      /* non-blocking */
    }
  };

  // ── Auth guard ──
  if (!jwt) {
    return (
      <PageContainer
        variant="dashboard"
        className="flex min-h-[calc(100dvh-var(--navbar-height))] items-center justify-center"
      >
        <p className="text-neutral-500">请先连接钱包</p>
      </PageContainer>
    );
  }

  // ── Loading skeleton ──
  if (isLoading || !panda) {
    return (
      <PageContainer variant="dashboard">
        <div className="dashboard-layout-v2">
          <Skeleton className="hidden h-[520px] lg:block lg:w-[260px]" />
          <div className="flex flex-1 flex-col gap-4">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="hidden h-64 lg:block lg:w-[200px]" />
        </div>
      </PageContainer>
    );
  }

  // ── Derived values ──
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

  const lastTickAgeSec =
    market.lastTick?.timestamp != null
      ? Math.max(
          0,
          Math.floor(
            Date.now() / 1000 -
              (market.lastTick.timestamp > 1e12
                ? market.lastTick.timestamp / 1000
                : market.lastTick.timestamp),
          ),
        )
      : null;

  const accountSnapshot: AccountPanelSnapshot = {
    equity: session.equity,
    initialCapital: session.initialCapital,
    positions: session.positions,
    tradeCount: session.tradeCount,
    pool,
    lastPrice,
    training: session.isRunning,
  };

  const pandaList = (allPandas ?? []).map((p) => ({
    id: p.id,
    name: p.name ?? undefined,
  }));

  return (
    <PageContainer variant="dashboard" className="pb-20 lg:pb-4">
      <div className="dashboard-layout-v2">
        {/* ── Left: Panda Panel ── */}
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

        {/* ── Main: Status + Chart + Workspace ── */}
        <div className="dashboard-col-main order-1 min-w-0 space-y-3">
          <SimulationStatusBar
            pandaId={panda.id}
            pandaName={panda.name ?? undefined}
            phase={session.phase}
            speed={session.speed}
            subscribedPools={subscribedPools}
            hasStrategy={!!strategy}
            actorActive={session.actorActive}
            tradeCount={session.tradeCount}
            wsStatus={market.status}
            emotion={session.emotion}
            lastTickAgeSec={lastTickAgeSec}
            onSpeedChange={session.setSpeed}
            onToggleTraining={() => session.toggleTraining(subscribedPools)}
            onOpenStrategy={() => setStrategyDrawerOpen(true)}
          />

          <CandlestickChart
            pool={pool}
            interval={marketInterval}
            onIntervalChange={setMarketInterval}
            availablePools={subscribedPools}
            onPoolChange={handlePoolChange}
            history={market.history}
            lastTick={market.lastTick}
            marketStatus={market.status}
            historyLoading={market.historyLoading}
            historyError={market.historyError}
            onRefresh={() => { void market.reloadHistory(); }}
            trades={session.trades}
          />

          <DashboardTradingWorkspace
            equity={session.equity}
            initialCapital={session.initialCapital}
            positions={session.positions}
            tradeCount={session.tradeCount}
            lastPrice={lastPrice}
            isRunning={session.isRunning}
            trades={session.trades}
            selectedTradeId={session.selectedTradeId}
            onSelectTrade={session.selectTrade}
            tradesLoading={session.tradesLoading}
            liveDecision={session.liveDecision}
            pool={pool}
            interval={marketInterval}
            marketStatus={market.status}
            historyLoading={market.historyLoading}
            historyError={market.historyError}
            candleCount={market.history?.candles?.length ?? 0}
            lastTickAgeSec={lastTickAgeSec}
            actorActive={session.actorActive}
            strategyReady={!!strategy}
            simulationId={session.simulationId}
          />

          <DashboardMainFooter
            className="xl:hidden"
            liveDecision={session.liveDecision}
            reviewDecision={session.reviewDecision}
            trades={session.trades}
            selectedTradeId={session.selectedTradeId}
            onSelectTrade={session.selectTrade}
            onClearReview={session.clearReview}
            training={session.isRunning}
            tradesLoading={session.tradesLoading}
          />
        </div>

        {/* ── Right: Decision + Trades ── */}
        <DashboardRightColumn
          className="order-3 hidden xl:flex"
          liveDecision={session.liveDecision}
          reviewDecision={session.reviewDecision}
          trades={session.trades}
          selectedTradeId={session.selectedTradeId}
          onSelectTrade={session.selectTrade}
          onClearReview={session.clearReview}
          training={session.isRunning}
          tradesLoading={session.tradesLoading}
        />
      </div>

      {/* ── Strategy Drawer ── */}
      <StrategyMobileDrawer
        open={strategyDrawerOpen}
        onOpenChange={setStrategyDrawerOpen}
        showFloatingButton={false}
      >
        <DashboardStrategySection {...strategySectionProps} />
      </StrategyMobileDrawer>
    </PageContainer>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import { DisclosureL0 } from "@/lib/ui/disclosure";
import { chainProofPath, reviewPath, safetyPath } from "@/lib/ui/routeJump";
import { DecisionTimeline } from "@/components/training/DecisionTimeline";
import { LedgerSummaryStrip } from "@/components/training/LedgerSummaryStrip";
import { LatestDecisionCard } from "@/components/training/LatestDecisionCard";
import { MarketChartPanel } from "@/components/training/MarketChartPanel";
import { PandaAgentStatus } from "@/components/training/PandaAgentStatus";
import { PolicyGateBanner } from "@/components/training/PolicyGateBanner";
import { TradeFactDrawer } from "@/components/training/TradeFactDrawer";
import { TrainingControlBar } from "@/components/training/TrainingControlBar";
import { TrainingPhaseHero } from "@/components/training/TrainingPhaseHero";
import { FeedStrategyDrawer } from "@/components/training/FeedStrategyDrawer";
import {
  buildTrainingPreflightItems,
  summarizeLatestDecision,
} from "@/components/training/trainingLedgerView";
import { useAuth } from "@/hooks/useAuth";
import { useMarketWs } from "@/hooks/useMarketWs";
import { useSimulationSession } from "@/hooks/useSimulationSession";
import { resolveSubscribedPools, type DeepbookPool } from "@/lib/constants/deepbookPools";
import { fetchAgentWalletStatus } from "@/services/agentWallet.service";
import { fetchPandaDetail } from "@/services/panda.service";
import {
  fetchOrderIntents,
  fetchTradeFacts,
  fetchTrainingLedger,
} from "@/services/training.service";
import { fetchLatestMerkleStatus } from "@/services/trust.service";
import type { OrderIntentApi, TradeFactApi } from "@/types/autonomous-wallet";
import type { MarketInterval } from "@/types/ws";
import { sameMarketPair } from "@/lib/market/canonicalMarketPair";

const FRESH_TICK_MAX_AGE_SEC = 120;

export default function TrainingLedgerPage({ params }: { params: { id: string } }) {
  const pandaId = params.id;
  const searchParams = useSearchParams();
  const { jwt } = useAuth();
  const [pool, setPool] = useState<DeepbookPool>("DEEP/SUI");
  const [interval, setInterval] = useState<MarketInterval>("1m");
  const [selectedIntent, setSelectedIntent] = useState<OrderIntentApi | null>(null);
  const [selectedTradeFactId, setSelectedTradeFactId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [strategyDrawerOpen, setStrategyDrawerOpen] = useState(false);
  const [didAutoPromptStrategy, setDidAutoPromptStrategy] = useState(false);

  const { data: panda, refetch: refetchPanda } = useQuery({
    queryKey: ["panda-detail", pandaId, jwt],
    enabled: !!jwt,
    queryFn: () => fetchPandaDetail(jwt!, pandaId),
  });

  const { data: walletStatus } = useQuery({
    queryKey: ["agent-wallet-status", pandaId, jwt],
    enabled: !!jwt,
    queryFn: () => fetchAgentWalletStatus(jwt!, pandaId),
  });

  const hasStrategy = Boolean(panda?.active_strategy_id);
  const subscribedPools = useMemo(
    () => resolveSubscribedPools(panda?.subscribed_pools),
    [panda?.subscribed_pools],
  );
  const currentPairAllowed = useMemo(
    () => subscribedPools.some((item) => sameMarketPair(item, pool)),
    [pool, subscribedPools],
  );
  const currentPairSubscribed = currentPairAllowed;
  const walletReady = Boolean(walletStatus?.can_start_training);
  const policyPaused = Boolean(walletStatus?.policy?.paused);

  useEffect(() => {
    if (subscribedPools.length === 0) return;
    const preferred = subscribedPools.includes(pool) ? pool : subscribedPools[0];
    if (preferred !== pool) {
      setPool(preferred);
    }
  }, [pool, subscribedPools]);

  const session = useSimulationSession(pandaId, hasStrategy);
  const market = useMarketWs({
    pool,
    pairs: [pool],
    interval,
    enabled: !!jwt,
  });

  const { data: ledger, refetch: refetchLedger } = useQuery({
    queryKey: ["training-ledger", pandaId, jwt],
    enabled: !!jwt,
    queryFn: () => fetchTrainingLedger(jwt!, pandaId),
    refetchInterval: session.isRunning ? 5000 : false,
  });

  const { data: intents = [], refetch: refetchIntents } = useQuery({
    queryKey: ["order-intents", pandaId, jwt],
    enabled: !!jwt,
    queryFn: () => fetchOrderIntents(jwt!, pandaId),
    refetchInterval: session.isRunning ? 5000 : false,
  });

  const { data: tradeFacts = [] } = useQuery({
    queryKey: ["trade-facts", pandaId, jwt],
    enabled: !!jwt,
    queryFn: () => fetchTradeFacts(jwt!, pandaId),
    refetchInterval: session.isRunning ? 8000 : false,
  });

  const { data: merkleStatus } = useQuery({
    queryKey: ["merkle-status", pandaId, jwt],
    enabled: !!jwt,
    queryFn: () => fetchLatestMerkleStatus(jwt!, pandaId),
    refetchInterval: session.isRunning ? 15000 : 60000,
  });

  const lastTickAgeSec = market.lastTick?.timestamp
    ? Math.max(0, Math.floor(Date.now() / 1000 - market.lastTick.timestamp))
    : null;
  const marketFresh =
    lastTickAgeSec == null ? market.status === "open" : lastTickAgeSec <= FRESH_TICK_MAX_AGE_SEC;

  const latestSummary = useMemo(
    () =>
      summarizeLatestDecision({
        intent: ledger?.last_order_intent ?? intents[0] ?? null,
        tradeFact: ledger?.last_trade_fact ?? tradeFacts[0] ?? null,
      }),
    [intents, ledger?.last_order_intent, ledger?.last_trade_fact, tradeFacts],
  );

  const policyBanner = useMemo(() => {
    if (!walletReady) {
      return { status: "paused" as const, message: "Agent Wallet setup is required before training." };
    }
    if (!hasStrategy) {
      return { status: "paused" as const, message: "Feed strategy first." };
    }
    if (!currentPairAllowed) {
      return { status: "reject" as const, message: `${pool} is not authorized or subscribed.` };
    }
    if (!marketFresh) {
      return { status: "stale" as const, message: "DeepBook tick is stale — Panda holds." };
    }
    const latest = intents[0];
    if (latest?.status === "REJECTED") {
      return { status: "reject" as const, message: latest.rejection_reason };
    }
    if (latest?.status === "EXECUTED") {
      return { status: "pass" as const, message: null };
    }
    return { status: "neutral" as const, message: null };
  }, [currentPairAllowed, hasStrategy, intents, marketFresh, pool, walletReady]);

  const selectedTradeFact: TradeFactApi | null = useMemo(() => {
    if (!selectedTradeFactId) {
      return null;
    }
    return tradeFacts.find((f) => f.id === selectedTradeFactId) ?? null;
  }, [selectedTradeFactId, tradeFacts]);

  const handleSelectIntent = useCallback((intent: OrderIntentApi) => {
    setSelectedIntent(intent);
    setDrawerOpen(true);
  }, []);

  const handleToggleTraining = useCallback(async () => {
    await session.toggleTraining(subscribedPools);
    void refetchLedger();
    void refetchIntents();
  }, [session, subscribedPools, refetchLedger, refetchIntents]);

  const lastIntent = ledger?.last_order_intent ?? intents[0] ?? null;

  useEffect(() => {
    if (!panda || didAutoPromptStrategy) return;
    const shouldOpenFromRoute = searchParams.get("feed") === "strategy";
    if (shouldOpenFromRoute || !hasStrategy) {
      setStrategyDrawerOpen(true);
      setDidAutoPromptStrategy(true);
    }
  }, [didAutoPromptStrategy, hasStrategy, panda, searchParams]);

  const preflightItems = useMemo(
    () =>
      buildTrainingPreflightItems({
        walletReady,
        hasStrategy,
        policyPaused,
        currentPair: pool,
        currentPairAllowed,
        currentPairSubscribed,
        wsStatus: market.status,
        lastTickAgeSec,
      }),
    [currentPairAllowed, currentPairSubscribed, hasStrategy, lastTickAgeSec, market.status, pool, policyPaused, walletReady],
  );

  return (
    <ProductPageShell density="high" className="space-y-8">
      <DisclosureL0
        eyebrow="Training Ledger"
        title="Live training cockpit"
        description="Watch DeepBook mainnet ticks, policy gates, and paper ledger mutations. Evidence stays in drawers."
      />

      <TrainingPhaseHero
        phase={session.phase}
        pair={pool}
        actorActive={session.actorActive}
        policyVersion={ledger?.policy_version ?? session.simStatus?.policy_version}
        marketFresh={marketFresh}
        wsStatus={market.status}
        policyPaused={policyPaused}
        merkleStatus={merkleStatus}
      />

      <TrainingControlBar
        pandaId={pandaId}
        phase={session.phase}
        speed={session.speed}
        subscribedPools={subscribedPools}
        hasStrategy={hasStrategy}
        walletReady={walletReady}
        policyPaused={policyPaused}
        currentPairAllowed={currentPairAllowed}
        actorActive={session.actorActive}
        tradeCount={session.tradeCount}
        wsStatus={market.status}
        emotion={session.emotion}
        lastTickAgeSec={lastTickAgeSec}
        onSpeedChange={session.setSpeed}
        onToggleTraining={handleToggleTraining}
        onFeedStrategy={() => setStrategyDrawerOpen(true)}
        onManagePair={() => setStrategyDrawerOpen(true)}
        preflightItems={preflightItems}
      />

      <LatestDecisionCard
        pandaId={pandaId}
        summary={latestSummary}
        onInspect={(summary) => {
          if (summary.intent) {
            setSelectedIntent(summary.intent);
            setSelectedTradeFactId(summary.tradeFactId);
          } else if (summary.tradeFact) {
            setSelectedIntent(summary.intent);
            setSelectedTradeFactId(summary.tradeFact.id);
          }
          setDrawerOpen(true);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr_280px]">
        <PandaAgentStatus emotion={session.emotion} lastIntent={lastIntent} skillVersion={0} />
        <MarketChartPanel
          pool={pool}
          interval={interval}
          onIntervalChange={setInterval}
          availablePools={subscribedPools}
          onPoolChange={setPool}
          history={market.history}
          lastTick={market.lastTick}
          marketStatus={market.status}
          historyLoading={market.historyLoading}
          historyError={market.historyError}
          onRefresh={() => {
            void market.reloadHistory();
          }}
          trades={session.trades}
        />
        <div className="space-y-3">
          <LedgerSummaryStrip ledger={ledger} equity={session.equity} initialCapital={session.initialCapital} />
          <PolicyGateBanner status={policyBanner.status} message={policyBanner.message} />
          <div className="ledger-nav-rail">
            <Link href={chainProofPath(pandaId)} className="text-[12px] font-medium text-product-green underline-offset-2 hover:underline">
              Chain Proof
            </Link>
            <Link href={reviewPath(pandaId)}>
              <span className="text-[12px] font-medium text-product-gold underline-offset-2 hover:underline">
                Review Journal
              </span>
            </Link>
            <Link href={safetyPath(pandaId)}>
              <span className="text-[12px] font-medium text-product-red underline-offset-2 hover:underline">
                Emergency controls
              </span>
            </Link>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="ledger-step-label">Evidence trail</p>
            <h2 className="mt-1 font-sans text-base font-bold text-product-text">Decision timeline</h2>
          </div>
          {intents.length > 0 ? <span className="text-[11px] text-product-muted">{intents.length} events</span> : null}
        </div>
        <DecisionTimeline intents={intents} selectedId={selectedIntent?.id} onSelect={handleSelectIntent} />
      </section>

      <TradeFactDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        intent={selectedIntent}
        tradeFact={selectedTradeFact}
      />

      <FeedStrategyDrawer
        open={strategyDrawerOpen}
        onOpenChange={setStrategyDrawerOpen}
        jwt={jwt}
        pandaId={pandaId}
        panda={panda}
        onSaved={() => {
          setStrategyDrawerOpen(false);
          void refetchPanda();
        }}
      />
    </ProductPageShell>
  );
}

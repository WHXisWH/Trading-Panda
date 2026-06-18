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
import { MarketChartPanel } from "@/components/training/MarketChartPanel";
import { PandaAgentStatus } from "@/components/training/PandaAgentStatus";
import { PolicyGateBanner } from "@/components/training/PolicyGateBanner";
import { TradeFactDrawer } from "@/components/training/TradeFactDrawer";
import { TrainingControlBar } from "@/components/training/TrainingControlBar";
import { TrainingStatusStrip } from "@/components/training/TrainingStatusStrip";
import { FeedStrategyDrawer } from "@/components/training/FeedStrategyDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useMarketWs } from "@/hooks/useMarketWs";
import { useSimulationSession } from "@/hooks/useSimulationSession";
import { resolveSubscribedPools, type DeepbookPool } from "@/lib/constants/deepbookPools";
import { fetchPandaDetail } from "@/services/panda.service";
import {
  fetchOrderIntents,
  fetchTradeFacts,
  fetchTrainingLedger,
} from "@/services/training.service";
import { fetchLatestMerkleStatus } from "@/services/trust.service";
import type { OrderIntentApi, TradeFactApi } from "@/types/autonomous-wallet";
import type { MarketInterval } from "@/types/ws";

const FRESH_TICK_MAX_AGE_SEC = 120;

export default function TrainingLedgerPage({ params }: { params: { id: string } }) {
  const pandaId = params.id;
  const searchParams = useSearchParams();
  const { jwt } = useAuth();
  const [pool, setPool] = useState<DeepbookPool>("DEEP/SUI");
  const [interval, setInterval] = useState<MarketInterval>("1m");
  const [selectedIntent, setSelectedIntent] = useState<OrderIntentApi | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [strategyDrawerOpen, setStrategyDrawerOpen] = useState(false);
  const [didAutoPromptStrategy, setDidAutoPromptStrategy] = useState(false);

  const { data: panda, refetch: refetchPanda } = useQuery({
    queryKey: ["panda-detail", pandaId, jwt],
    enabled: !!jwt,
    queryFn: () => fetchPandaDetail(jwt!, pandaId),
  });

  const hasStrategy = Boolean(panda?.active_strategy_id);
  const subscribedPools = useMemo(
    () => resolveSubscribedPools(panda?.subscribed_pools),
    [panda?.subscribed_pools],
  );

  const session = useSimulationSession(pandaId, hasStrategy);
  const market = useMarketWs({ pool, interval });

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

  const policyBanner = useMemo(() => {
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
    return null;
  }, [intents, marketFresh]);

  const selectedTradeFact: TradeFactApi | null = useMemo(() => {
    if (!selectedIntent) {
      return null;
    }
    return tradeFacts.find((f) => f.order_intent_id === selectedIntent.id) ?? null;
  }, [selectedIntent, tradeFacts]);

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

  return (
    <ProductPageShell density="high" className="space-y-4">
      <DisclosureL0
        eyebrow="Training Ledger"
        title="Live training cockpit"
        description="Watch DeepBook mainnet ticks, policy gates, and paper ledger mutations. Evidence stays in drawers."
      />

      <TrainingStatusStrip
        phase={session.phase}
        pair={pool}
        actorActive={session.actorActive}
        policyVersion={ledger?.policy_version ?? session.simStatus?.policy_version}
        marketFresh={marketFresh}
        wsStatus={market.status}
        merkleStatus={merkleStatus}
      />

      <TrainingControlBar
        pandaId={pandaId}
        phase={session.phase}
        speed={session.speed}
        subscribedPools={subscribedPools}
        hasStrategy={hasStrategy}
        actorActive={session.actorActive}
        tradeCount={session.tradeCount}
        wsStatus={market.status}
        emotion={session.emotion}
        lastTickAgeSec={lastTickAgeSec}
        onSpeedChange={session.setSpeed}
        onToggleTraining={handleToggleTraining}
        onFeedStrategy={() => setStrategyDrawerOpen(true)}
      />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr_280px]">
        <PandaAgentStatus
          emotion={session.emotion}
          lastIntent={lastIntent}
          skillVersion={0}
        />
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
          <LedgerSummaryStrip
            ledger={ledger}
            equity={session.equity}
            initialCapital={session.initialCapital}
          />
          <PolicyGateBanner status={policyBanner?.status ?? null} message={policyBanner?.message} />
          <div className="product-panel flex flex-wrap gap-3 px-4 py-3">
            <Link
              href={chainProofPath(pandaId)}
              className="text-[12px] font-medium text-product-green underline-offset-2 hover:underline"
            >
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
          <h2 className="product-field-label">Decision timeline</h2>
          {intents.length > 0 ? (
            <span className="text-[11px] text-product-muted">{intents.length} events</span>
          ) : null}
        </div>
        <DecisionTimeline
          intents={intents}
          selectedId={selectedIntent?.id}
          onSelect={handleSelectIntent}
        />
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

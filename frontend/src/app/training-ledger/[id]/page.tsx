"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import { DisclosureL0 } from "@/lib/ui/disclosure";
import { chainProofPath, reviewPath, safetyPath } from "@/lib/ui/routeJump";
import { SimulationStatusBar } from "@/components/trading/SimulationStatusBar";
import { DecisionTimeline } from "@/components/training/DecisionTimeline";
import { LedgerSummaryStrip } from "@/components/training/LedgerSummaryStrip";
import { MarketChartPanel } from "@/components/training/MarketChartPanel";
import { PandaAgentStatus } from "@/components/training/PandaAgentStatus";
import { PolicyGateBanner } from "@/components/training/PolicyGateBanner";
import { TradeFactDrawer } from "@/components/training/TradeFactDrawer";
import { TrainingStatusStrip } from "@/components/training/TrainingStatusStrip";
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
  const { jwt } = useAuth();
  const [pool, setPool] = useState<DeepbookPool>("DEEP/SUI");
  const [interval, setInterval] = useState<MarketInterval>("1m");
  const [selectedIntent, setSelectedIntent] = useState<OrderIntentApi | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: panda } = useQuery({
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

      <SimulationStatusBar
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
        onOpenStrategy={() => {}}
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
          <div className="flex flex-wrap gap-2 text-[12px]">
            <Link
              href={chainProofPath(pandaId)}
              className="text-product-green underline-offset-2 hover:underline"
            >
              Chain Proof
            </Link>
            <Link
              href={reviewPath(pandaId)}
              className="text-product-gold underline-offset-2 hover:underline"
            >
              Review Journal
            </Link>
            <Link
              href={safetyPath(pandaId)}
              className="text-product-red underline-offset-2 hover:underline"
            >
              Safety
            </Link>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold text-neutral-900">Decision timeline</h2>
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
    </ProductPageShell>
  );
}

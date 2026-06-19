"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import { DecisionTimeline } from "@/components/training/DecisionTimeline";
import { MarketChartPanel } from "@/components/training/MarketChartPanel";
import { TradeFactDrawer } from "@/components/training/TradeFactDrawer";
import { TrainingLedgerPageHeader } from "@/components/training/TrainingLedgerPageHeader";
import { TrainingLedgerRail } from "@/components/training/TrainingLedgerRail";
import { FeedStrategyDrawer } from "@/components/training/FeedStrategyDrawer";
import { summarizeLatestDecision } from "@/components/training/trainingLedgerView";
import { useAuth } from "@/hooks/useAuth";
import { useMarketCandles } from "@/hooks/useMarketCandles";
import { useToolbarMarketMetrics } from "@/hooks/useToolbarMarketMetrics";
import { useSimulationSession } from "@/hooks/useSimulationSession";
import { resolveAuthorizedPools, sameMarketPair } from "@/lib/market/canonicalMarketPair";
import { fetchAgentWalletStatus } from "@/services/agentWallet.service";
import { fetchPandaDetail } from "@/services/panda.service";
import {
  fetchOrderIntents,
  fetchTradeFacts,
  fetchTrainingLedger,
} from "@/services/training.service";
import type { OrderIntentApi, TradeFactApi } from "@/types/autonomous-wallet";
import type { MarketInterval } from "@/types/ws";

export default function TrainingLedgerPage({ params }: { params: { id: string } }) {
  const pandaId = params.id;
  const searchParams = useSearchParams();
  const { jwt } = useAuth();
  const [pool, setPool] = useState("");
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
  const authorizedPools = useMemo(
    () => resolveAuthorizedPools(walletStatus?.policy?.allowed_pairs),
    [walletStatus?.policy?.allowed_pairs],
  );
  const currentPairAllowed = useMemo(
    () => authorizedPools.some((item) => sameMarketPair(item, pool)),
    [pool, authorizedPools],
  );
  const walletReady = Boolean(walletStatus?.can_start_training);
  const policyPaused = Boolean(walletStatus?.policy?.paused);

  useEffect(() => {
    if (authorizedPools.length === 0) return;
    const preferred = authorizedPools.find((item) => sameMarketPair(item, pool))
      ? pool
      : authorizedPools[0];
    if (preferred !== pool) {
      setPool(preferred);
    }
  }, [pool, authorizedPools]);

  const session = useSimulationSession(pandaId, hasStrategy);
  const market = useMarketCandles({
    pool,
    pairs: [pool],
    interval,
    enabled: !!panda && !!pool,
  });

  const toolbarMetrics = useToolbarMarketMetrics(pool, market.lastTick, !!pool);
  const { lastPrice: livePrice, change24hPct, poolStats, poolStatsLoading } = toolbarMetrics;

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

  const latestSummary = useMemo(
    () =>
      summarizeLatestDecision({
        intent: ledger?.last_order_intent ?? intents[0] ?? null,
        tradeFact: ledger?.last_trade_fact ?? tradeFacts[0] ?? null,
      }),
    [intents, ledger?.last_order_intent, ledger?.last_trade_fact, tradeFacts],
  );

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
    if (!session.isRunning) {
      if (!hasStrategy) {
        toast.error("Feed strategy first");
        setStrategyDrawerOpen(true);
        return;
      }
      if (!walletReady) {
        toast.error("Complete Agent Wallet setup before training.");
        return;
      }
      if (policyPaused) {
        toast.error("Policy is paused. Resume in Emergency controls.");
        return;
      }
      if (authorizedPools.length === 0) {
        toast.error("Configure allowed pairs in Agent Wallet.");
        return;
      }
      if (!currentPairAllowed) {
        toast.error(`${pool || "Pool"} is not authorized.`);
        return;
      }
    }

    await session.toggleTraining(authorizedPools);
    void refetchLedger();
    void refetchIntents();
  }, [
    authorizedPools,
    currentPairAllowed,
    hasStrategy,
    policyPaused,
    pool,
    refetchIntents,
    refetchLedger,
    session,
    walletReady,
  ]);

  useEffect(() => {
    if (!panda || didAutoPromptStrategy) return;
    if (searchParams.get("feed") === "strategy") {
      setStrategyDrawerOpen(true);
      setDidAutoPromptStrategy(true);
    }
  }, [didAutoPromptStrategy, panda, searchParams]);

  return (
    <ProductPageShell density="high" className="space-y-8">
      <TrainingLedgerPageHeader
        ledger={ledger}
        equity={session.equity}
        initialCapital={session.initialCapital}
      />

      {panda ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <MarketChartPanel
            pandaId={pandaId}
            pool={pool}
            interval={interval}
            onIntervalChange={setInterval}
            authorizedPools={authorizedPools}
            onPoolChange={setPool}
            history={market.history}
            lastTick={market.lastTick}
            marketStatus={market.status}
            historyLoading={market.historyLoading}
            historyError={market.historyError}
            hasMore={market.hasMore}
            loadingMore={market.loadingMore}
            change24hPct={change24hPct}
            poolStats={poolStats ?? null}
            poolStatsLoading={poolStatsLoading}
            toolbarLastPrice={livePrice}
            onLoadMore={() => {
              void market.loadMoreOlder();
            }}
            onRefresh={() => {
              void market.reloadHistory();
            }}
            trades={session.trades}
          />

          <TrainingLedgerRail
            panda={panda}
            pandaId={pandaId}
            phase={session.phase}
            actorActive={session.actorActive}
            speed={session.speed}
            tradeCount={session.tradeCount}
            latestSummary={latestSummary}
            onSpeedChange={session.setSpeed}
            onToggleTraining={handleToggleTraining}
            onFeedStrategy={() => setStrategyDrawerOpen(true)}
            onInspectAction={(summary) => {
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
        </div>
      ) : null}

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

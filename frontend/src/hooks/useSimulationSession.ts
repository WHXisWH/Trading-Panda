"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSimulationWs, type SimulationWsEvent } from "@/hooks/useSimulationWs";
import {
  fetchSimulationStatus,
  startTraining,
  stopTraining,
  type SimulationStatusResult,
} from "@/services/simulation.service";
import { fetchTrades } from "@/services/trades.service";
import type { DecisionLog, TradeRecordApi } from "@/types/trading";
import type { DeepbookPool } from "@/lib/constants/deepbookPools";
import { tradeToDecisionLog } from "@/components/trading/TradeHistory";

/**
 * Training session lifecycle phases.
 * idle → starting → running → stopping → idle
 *                  ↗ error (can retry → starting)
 */
export type SessionPhase =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export interface SimulationSession {
  phase: SessionPhase;
  isRunning: boolean;
  simulationId: string | null;
  speed: string;

  simStatus: SimulationStatusResult | undefined;
  trades: TradeRecordApi[];
  tradesLoading: boolean;

  liveDecision: DecisionLog | null;
  selectedTradeId: string | null;
  reviewDecision: DecisionLog | null;

  equity: number;
  initialCapital: number;
  positions: Record<string, number>;
  tradeCount: number;
  actorActive: boolean;
  emotion: string | null;

  setSpeed: (speed: string) => void;
  toggleTraining: (subscribedPools: DeepbookPool[]) => Promise<void>;
  selectTrade: (trade: TradeRecordApi) => void;
  clearReview: () => void;
  refetchStatus: () => void;
  refetchTrades: () => void;
}

export function useSimulationSession(
  pandaId: string,
  hasStrategy: boolean,
): SimulationSession {
  const { jwt } = useAuth();
  const qc = useQueryClient();

  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [speed, setSpeed] = useState("1×");
  const [liveDecision, setLiveDecision] = useState<DecisionLog | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<DecisionLog | null>(null);

  const isRunning = phase === "running";

  const { data: simStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["simulation-status", pandaId, jwt],
    enabled: !!jwt,
    queryFn: () => fetchSimulationStatus(jwt!, pandaId),
    refetchOnWindowFocus: true,
    refetchInterval: isRunning ? 2000 : false,
  });

  // Sync phase from backend status on mount / refetch
  useEffect(() => {
    if (!simStatus) return;
    if (simStatus.actor_active || simStatus.status === "running") {
      setPhase("running");
      if (simStatus.simulation_id) {
        setSimulationId(simStatus.simulation_id);
      }
    } else if (phase === "running" && !simStatus.actor_active) {
      setPhase("idle");
    }
  }, [simStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    data: trades = [],
    isLoading: tradesLoading,
    refetch: refetchTrades,
  } = useQuery<TradeRecordApi[]>({
    queryKey: ["trades", pandaId, simulationId, jwt],
    enabled: !!jwt,
    queryFn: () =>
      fetchTrades(jwt!, pandaId, {
        simulationId: simulationId ?? undefined,
        limit: 50,
      }),
    refetchInterval: isRunning ? 5000 : false,
  });

  // WS event handler
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
          ["trades", pandaId, simulationId, jwt],
          (old) => {
            if (old?.some((t) => t.id === trade.id)) return old;
            return [trade, ...(old ?? [])];
          },
        );
        void refetchTrades();
        void refetchStatus();
      }
    },
    [jwt, pandaId, qc, refetchStatus, refetchTrades, simulationId],
  );

  useSimulationWs({
    pandaId,
    simulationId,
    enabled: isRunning && !!simulationId,
    onEvent: onSimulationEvent,
  });

  const toggleTraining = useCallback(
    async (subscribedPools: DeepbookPool[]) => {
      if (!jwt) return;
      if (!hasStrategy && !isRunning) {
        toast.error("请先教给熊猫策略");
        return;
      }
      try {
        if (isRunning) {
          setPhase("stopping");
          await stopTraining(jwt, pandaId);
          setPhase("idle");
          setSimulationId(null);
          toast.success("训练已暂停");
        } else {
          setPhase("starting");
          const data = await startTraining(jwt, pandaId, {
            speed,
            subscribedPools,
          });
          setSimulationId(data.simulation_id);
          setPhase("running");
          setLiveDecision(null);
          toast.success("训练已启动");
          void refetchTrades();
          void refetchStatus();
        }
        qc.invalidateQueries({ queryKey: ["simulation-status", pandaId] });
      } catch (err) {
        setPhase("error");
        toast.error(err instanceof Error ? err.message : "训练操作失败");
      }
    },
    [jwt, hasStrategy, isRunning, pandaId, speed, qc, refetchTrades, refetchStatus],
  );

  const selectTrade = useCallback((trade: TradeRecordApi) => {
    setSelectedTradeId(trade.id);
    setReviewDecision(tradeToDecisionLog(trade));
  }, []);

  const clearReview = useCallback(() => {
    setSelectedTradeId(null);
    setReviewDecision(null);
  }, []);

  const equity = simStatus?.equity ?? simStatus?.initial_capital ?? 10_000;
  const initialCapital = simStatus?.initial_capital ?? 10_000;
  const positions = simStatus?.positions ?? {};
  const tradeCount = simStatus?.trade_count ?? trades.length;
  const actorActive = Boolean(simStatus?.actor_active);
  const emotion = simStatus?.emotion ?? null;

  return {
    phase,
    isRunning,
    simulationId,
    speed,

    simStatus,
    trades,
    tradesLoading,

    liveDecision,
    selectedTradeId,
    reviewDecision,

    equity,
    initialCapital,
    positions,
    tradeCount,
    actorActive,
    emotion,

    setSpeed,
    toggleTraining,
    selectTrade,
    clearReview,
    refetchStatus: () => { void refetchStatus(); },
    refetchTrades: () => { void refetchTrades(); },
  };
}

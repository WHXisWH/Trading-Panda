"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHubWebSocket } from "@/providers/WebSocketProvider";
import type { DecisionLog, TradeRecordApi } from "@/types/trading";
import type { SubscribeSimulationPayload, WsServerEvent } from "@/types/ws";

export type SimulationWsEvent =
  | { type: "decision"; payload: DecisionLog }
  | { type: "emotion"; payload: Record<string, unknown> }
  | { type: "trade_executed"; payload: TradeRecordApi }
  | { type: "order_intent"; payload: Record<string, unknown> }
  | { type: "execution"; payload: Record<string, unknown> }
  | { type: "policy_rejected"; payload: Record<string, unknown> }
  | { type: "market_stale"; payload: Record<string, unknown> }
  | { type: "other"; event: string; payload: Record<string, unknown> };

export type UseSimulationWsOptions = {
  pandaId: string | null;
  simulationId?: string | null;
  enabled?: boolean;
  onEvent?: (evt: SimulationWsEvent) => void;
};

function mapDecisionPayload(raw: Record<string, unknown>): DecisionLog {
  return {
    timestamp: (raw.timestamp as number) ?? Date.now(),
    action: (raw.action as DecisionLog["action"]) ?? "HOLD",
    final_score: Number(raw.final_score ?? 0),
    zone: (raw.zone as DecisionLog["zone"]) ?? "OBSERVE",
    asset: raw.asset as string | undefined,
    price: raw.price as number | undefined,
    steps: (raw.steps as DecisionLog["steps"]) ?? [],
    entry_threshold:
      raw.entry_threshold != null ? Number(raw.entry_threshold) : undefined,
  };
}

function mapServerEvent(event: WsServerEvent): SimulationWsEvent {
  const payload = event.payload ?? {};
  if (event.event === "decision" || event.event === "decision.chain") {
    return { type: "decision", payload: mapDecisionPayload(payload) };
  }
  if (event.event === "emotion" || event.event === "emotion.changed") {
    return { type: "emotion", payload };
  }
  if (event.event === "trade_executed") {
    return { type: "trade_executed", payload: payload as unknown as TradeRecordApi };
  }
  if (event.event === "order_intent") {
    return { type: "order_intent", payload };
  }
  if (event.event === "execution") {
    return { type: "execution", payload };
  }
  if (event.event === "policy_rejected") {
    return { type: "policy_rejected", payload };
  }
  if (event.event === "market_stale") {
    return { type: "market_stale", payload };
  }
  return { type: "other", event: event.event, payload };
}

export function useSimulationWs(options: UseSimulationWsOptions) {
  const { pandaId, simulationId, enabled = true, onEvent } = options;

  const { sendCommand, isConnected, status, subscribeEvents } = useHubWebSocket();
  const [lastEvent, setLastEvent] = useState<SimulationWsEvent | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const handleEvent = useCallback((event: WsServerEvent) => {
    const skip = new Set(["ping", "connected", "subscribed", "market.tick"]);
    if (skip.has(event.event)) {
      return;
    }
    const mapped = mapServerEvent(event);
    if (mapped.type === "other") {
      return;
    }
    setLastEvent(mapped);
    onEventRef.current?.(mapped);
  }, []);

  useEffect(() => subscribeEvents(handleEvent), [handleEvent, subscribeEvents]);

  const subscribe = useCallback(
    (override?: Partial<SubscribeSimulationPayload>) => {
      const id = override?.panda_id ?? pandaId;
      const sim = override?.simulation_id ?? simulationId ?? "";
      if (!id) {
        return false;
      }
      return sendCommand("subscribe.simulation", {
        panda_id: id,
        simulation_id: sim,
      });
    },
    [pandaId, simulationId, sendCommand],
  );

  const unsubscribe = useCallback(
    (targetPandaId?: string) => {
      const id = targetPandaId ?? pandaId;
      if (!id) {
        return false;
      }
      return sendCommand("unsubscribe.simulation", { panda_id: id });
    },
    [pandaId, sendCommand],
  );

  useEffect(() => {
    if (!enabled || !isConnected || !pandaId || !simulationId) {
      return;
    }
    subscribe();
    return () => {
      unsubscribe();
    };
  }, [enabled, isConnected, pandaId, simulationId, subscribe, unsubscribe]);

  return {
    status,
    isConnected,
    lastEvent,
    subscribe,
    unsubscribe,
    sendCommand,
    disconnect: () => false,
    reconnect: () => false,
  };
}

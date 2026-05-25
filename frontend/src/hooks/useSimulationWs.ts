"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { SubscribeSimulationPayload, WsServerEvent } from "@/types/ws";

export type SimulationWsEvent =
  | { type: "decision"; payload: Record<string, unknown> }
  | { type: "emotion"; payload: Record<string, unknown> }
  | { type: "other"; event: string; payload: Record<string, unknown> };

export type UseSimulationWsOptions = {
  pandaId: string | null;
  simulationId?: string | null;
  enabled?: boolean;
  onEvent?: (evt: SimulationWsEvent) => void;
};

function mapServerEvent(event: WsServerEvent): SimulationWsEvent {
  const payload = event.payload ?? {};
  if (event.event === "decision" || event.event === "decision.chain") {
    return { type: "decision", payload };
  }
  if (event.event === "emotion" || event.event === "emotion.changed") {
    return { type: "emotion", payload };
  }
  return { type: "other", event: event.event, payload };
}

export function useSimulationWs(options: UseSimulationWsOptions) {
  const {
    pandaId,
    simulationId,
    enabled = true,
    onEvent,
  } = options;

  const { accessToken } = useAuth();
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

  const ws = useWebSocket({
    token: accessToken,
    enabled: enabled && !!accessToken && !!pandaId,
    onEvent: handleEvent,
  });

  const subscribe = useCallback(
    (override?: Partial<SubscribeSimulationPayload>) => {
      const id = override?.panda_id ?? pandaId;
      const sim = override?.simulation_id ?? simulationId ?? "";
      if (!id) {
        return false;
      }
      return ws.sendCommand("subscribe.simulation", {
        panda_id: id,
        simulation_id: sim,
      });
    },
    [pandaId, simulationId, ws],
  );

  const unsubscribe = useCallback(
    (targetPandaId?: string) => {
      const id = targetPandaId ?? pandaId;
      if (!id) {
        return false;
      }
      return ws.sendCommand("unsubscribe.simulation", { panda_id: id });
    },
    [pandaId, ws],
  );

  useEffect(() => {
    if (!ws.isConnected || !pandaId) {
      return;
    }
    subscribe();
    return () => {
      unsubscribe();
    };
  }, [pandaId, simulationId, subscribe, unsubscribe, ws.isConnected]);

  return {
    ...ws,
    lastEvent,
    subscribe,
    unsubscribe,
  };
}

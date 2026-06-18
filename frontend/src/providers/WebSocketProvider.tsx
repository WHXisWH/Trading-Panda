"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { WsConnectionStatus, WsServerEvent } from "@/types/ws";

export type HubWebSocketContextValue = {
  status: WsConnectionStatus;
  isConnected: boolean;
  sendCommand: (
    command: string,
    payload: Record<string, unknown>,
    requestId?: string,
  ) => boolean;
  subscribeEvents: (listener: (event: WsServerEvent) => void) => () => void;
};

const HubWebSocketContext = createContext<HubWebSocketContextValue | null>(null);

/** One Hub WebSocket per authenticated user (market + simulation multiplexed). */
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { accessToken, isAuthed } = useAuth();
  const listenersRef = useRef(new Set<(event: WsServerEvent) => void>());

  const onEvent = useCallback((event: WsServerEvent) => {
    listenersRef.current.forEach((listener) => {
      listener(event);
    });
  }, []);

  const ws = useWebSocket({
    token: accessToken,
    enabled: isAuthed,
    onEvent,
  });

  const subscribeEvents = useCallback((listener: (event: WsServerEvent) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    (): HubWebSocketContextValue => ({
      status: ws.status,
      isConnected: ws.isConnected,
      sendCommand: ws.sendCommand,
      subscribeEvents,
    }),
    [ws.status, ws.isConnected, ws.sendCommand, subscribeEvents],
  );

  return (
    <HubWebSocketContext.Provider value={value}>{children}</HubWebSocketContext.Provider>
  );
}

export function useHubWebSocket(): HubWebSocketContextValue {
  const ctx = useContext(HubWebSocketContext);
  if (!ctx) {
    throw new Error("useHubWebSocket must be used within WebSocketProvider");
  }
  return ctx;
}

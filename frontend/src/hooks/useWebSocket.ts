"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WsClientMessage, WsConnectionStatus, WsServerEvent } from "@/types/ws";
import { buildWsUrl, getWsBaseUrl } from "@/lib/ws/url";

/** Hub close codes — keep in sync with websocket/src/types.ts */
const WS_CLOSE_RATE_LIMITED = 4008;
const WS_CLOSE_TOO_MANY_CONNECTIONS = 4009;

const MAX_RECONNECT_DELAY_MS = 60_000;
const CONNECT_DEBOUNCE_MS = 300;
const CAPACITY_LIMIT_RECONNECT_MS = 5_000;

export type UseWebSocketOptions = {
  /** JWT for Hub `?token=`; when null/undefined the socket stays idle */
  token: string | null | undefined;
  enabled?: boolean;
  onEvent?: (event: WsServerEvent) => void;
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  reconnect?: boolean;
  reconnectDelayMs?: number;
};

function reconnectDelayMsForAttempt(
  attempt: number,
  baseMs: number,
  closeCode: number,
): number {
  const capacityLimited =
    closeCode === WS_CLOSE_TOO_MANY_CONNECTIONS || closeCode === WS_CLOSE_RATE_LIMITED;
  const base = capacityLimited ? Math.max(baseMs, CAPACITY_LIMIT_RECONNECT_MS) : baseMs;
  return Math.min(base * 1.5 ** attempt, MAX_RECONNECT_DELAY_MS);
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    token,
    enabled = true,
    onEvent,
    onOpen,
    onClose,
    reconnect = true,
    reconnectDelayMs = 3000,
  } = options;

  const [status, setStatus] = useState<WsConnectionStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const handlersRef = useRef({ onEvent, onOpen, onClose });

  handlersRef.current = { onEvent, onOpen, onClose };

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const clearConnectDebounce = useCallback(() => {
    if (connectDebounceRef.current) {
      clearTimeout(connectDebounceRef.current);
      connectDebounceRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearConnectDebounce();
    clearReconnectTimer();
    reconnectAttemptRef.current = 0;
    shouldReconnectRef.current = false;
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close(1000, "client disconnect");
    }
    setStatus("closed");
  }, [clearConnectDebounce, clearReconnectTimer]);

  const sendCommand = useCallback(
    (command: string, payload: Record<string, unknown>, requestId?: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return false;
      }
      const msg: WsClientMessage = {
        command,
        payload,
        ...(requestId ? { request_id: requestId } : {}),
      };
      ws.send(JSON.stringify(msg));
      return true;
    },
    [],
  );

  const scheduleReconnect = useCallback(
    (closeCode: number) => {
      if (!reconnect || !enabled || !token) {
        return;
      }
      clearReconnectTimer();
      const attempt = reconnectAttemptRef.current;
      const delay = reconnectDelayMsForAttempt(attempt, reconnectDelayMs, closeCode);
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimer.current = setTimeout(() => {
        connectRef.current?.();
      }, delay);
    },
    [clearReconnectTimer, enabled, reconnect, reconnectDelayMs, token],
  );

  const connectRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !token) {
      return;
    }
    const base = getWsBaseUrl();
    if (!base) {
      setStatus("error");
      return;
    }

    clearReconnectTimer();
    shouldReconnectRef.current = true;
    const existing = wsRef.current;
    if (existing) {
      existing.close(1000, "reconnect");
      wsRef.current = null;
    }

    setStatus("connecting");
    let url: string;
    try {
      url = buildWsUrl(base, token);
    } catch {
      setStatus("error");
      return;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setStatus("open");
      handlersRef.current.onOpen?.();
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as WsServerEvent;
        if (data?.event) {
          handlersRef.current.onEvent?.(data);
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onclose = (ev) => {
      wsRef.current = null;
      setStatus("closed");
      handlersRef.current.onClose?.(ev.code, ev.reason);
      if (shouldReconnectRef.current) {
        scheduleReconnect(ev.code);
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [clearReconnectTimer, enabled, scheduleReconnect, token]);

  connectRef.current = connect;

  useEffect(() => {
    if (!enabled || !token) {
      clearConnectDebounce();
      disconnect();
      setStatus("idle");
      return;
    }
    clearConnectDebounce();
    connectDebounceRef.current = setTimeout(() => {
      connectDebounceRef.current = null;
      connect();
    }, CONNECT_DEBOUNCE_MS);
    return () => {
      clearConnectDebounce();
      disconnect();
    };
  }, [clearConnectDebounce, connect, disconnect, enabled, token]);

  return {
    status,
    isConnected: status === "open",
    sendCommand,
    disconnect,
    reconnect: connect,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WsClientMessage, WsConnectionStatus, WsServerEvent } from "@/types/ws";
import { buildWsUrl, getWsBaseUrl } from "@/lib/ws/url";

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
  const handlersRef = useRef({ onEvent, onOpen, onClose });

  handlersRef.current = { onEvent, onOpen, onClose };

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close(1000, "client disconnect");
    }
    setStatus("closed");
  }, [clearReconnectTimer]);

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
    if (wsRef.current) {
      wsRef.current.close();
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
      if (reconnect && enabled && token) {
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, reconnectDelayMs);
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [
    clearReconnectTimer,
    enabled,
    reconnect,
    reconnectDelayMs,
    token,
  ]);

  useEffect(() => {
    if (!enabled || !token) {
      disconnect();
      setStatus("idle");
      return;
    }
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled, token]);

  return {
    status,
    isConnected: status === "open",
    sendCommand,
    disconnect,
    reconnect: connect,
  };
}

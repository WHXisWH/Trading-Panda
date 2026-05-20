import type { WsClientMessage, WsServerEvent } from "./types.js";

export function nowIso(): string {
  return new Date().toISOString();
}

export function serverEvent<T>(
  event: string,
  payload: T,
  requestId?: string,
): WsServerEvent<T> {
  return {
    event,
    payload,
    timestamp: nowIso(),
    ...(requestId ? { request_id: requestId } : {}),
  };
}

export function parseClientMessage(raw: string): WsClientMessage | null {
  try {
    const data = JSON.parse(raw) as WsClientMessage;
    if (typeof data.command !== "string" || typeof data.payload !== "object") {
      return null;
    }
    if (data.payload === null || Array.isArray(data.payload)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function normalizeRedisPayload(
  channel: string,
  raw: string,
): WsServerEvent | null {
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  if (typeof body.event === "string") {
    return {
      event: body.event,
      payload: (body.payload ?? {}) as Record<string, unknown>,
      timestamp:
        typeof body.timestamp === "string" ? body.timestamp : nowIso(),
    };
  }

  if (channel.startsWith("market:")) {
    return serverEvent("market.tick", body);
  }

  return null;
}

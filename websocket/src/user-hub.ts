import { Redis } from "@upstash/redis/cloudflare";
import {
  collectRedisChannels,
  emptySubscriptions,
  shouldForwardChannel,
} from "./channels.js";
import type { Env, StoredHubState, WsClientMessage } from "./types.js";
import { WS_CLOSE } from "./types.js";
import {
  normalizeRedisPayload,
  nowIso,
  parseClientMessage,
  serverEvent,
} from "./ws-messages.js";

const STATE_KEY = "hub";

interface ConnAttachment {
  connId: string;
  connectedAt: string;
}

type RedisSubscriber = {
  stop: () => Promise<void>;
};

function intEnv(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export class UserHub implements DurableObject {
  private state: StoredHubState | null = null;
  private redisSubscriber: RedisSubscriber | null = null;
  private redisSubscriberChannels: string[] = [];
  private messageBuckets = new Map<string, number[]>();

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const userId = request.headers.get("X-User-Id");
    if (!userId) {
      return new Response("Missing user", { status: 401 });
    }

    await this.loadState(userId);
    const maxConn = intEnv(this.env.MAX_CONNECTIONS_PER_USER, 3);
    if (this.ctx.getWebSockets().length >= maxConn) {
      return new Response("Too many connections", {
        status: 429,
        headers: { "X-Close-Code": String(WS_CLOSE.TOO_MANY_CONNECTIONS) },
      });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const connId = crypto.randomUUID();
    const connectedAt = nowIso();

    this.ctx.acceptWebSocket(server, [connId]);
    server.serializeAttachment({
      connId,
      connectedAt,
    } satisfies ConnAttachment);

    this.sendJson(server, serverEvent("connected", {
      user_id: userId,
      session_id: connId,
      connected_at: connectedAt,
    }));

    await this.scheduleHeartbeat();
    await this.refreshRedisSubscriber();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const raw =
      typeof message === "string" ? message : new TextDecoder().decode(message);
    const attachment = ws.deserializeAttachment() as ConnAttachment | null;
    const connId = attachment?.connId ?? "unknown";

    if (!this.allowClientMessage(connId)) {
      ws.close(WS_CLOSE.RATE_LIMITED, "rate limited");
      return;
    }

    const parsed = parseClientMessage(raw);
    if (!parsed) {
      this.sendJson(
        ws,
        serverEvent("error", {
          code: "INVALID_MESSAGE",
          message: "Invalid JSON or missing command/payload",
        }),
      );
      return;
    }

    await this.handleCommand(ws, parsed);
  }

  async webSocketClose(): Promise<void> {
    if (this.ctx.getWebSockets().length === 0) {
      await this.stopRedisSubscriber();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    ws.close(1011, "WebSocket error");
  }

  async alarm(): Promise<void> {
    const heartbeatSec = intEnv(this.env.HEARTBEAT_ALARM_SEC, 30);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendJson(ws, serverEvent("ping", { server_time: nowIso() }));
      }
    }
    await this.ctx.storage.setAlarm(Date.now() + heartbeatSec * 1000);
  }

  private async loadState(userId: string): Promise<void> {
    if (this.state) {
      return;
    }
    const stored = await this.ctx.storage.get<StoredHubState>(STATE_KEY);
    if (stored) {
      this.state = stored;
      return;
    }
    this.state = {
      userId,
      subscriptions: emptySubscriptions(),
      redisChannels: [],
    };
    await this.persistState();
  }

  private async persistState(): Promise<void> {
    if (!this.state) {
      return;
    }
    await this.ctx.storage.put(STATE_KEY, this.state);
  }

  private async handleCommand(ws: WebSocket, msg: WsClientMessage): Promise<void> {
    if (!this.state) {
      return;
    }

    try {
      switch (msg.command) {
        case "subscribe.simulation":
          await this.subscribeSimulation(msg);
          break;
        case "unsubscribe.simulation":
          await this.unsubscribeSimulation(msg);
          break;
        case "subscribe.market":
          await this.subscribeMarket(msg);
          break;
        case "unsubscribe.market":
          await this.unsubscribeMarket();
          break;
        case "pong":
          return;
        default:
          this.sendJson(
            ws,
            serverEvent(
              "error",
              { code: "UNKNOWN_COMMAND", message: `Unknown command: ${msg.command}` },
              msg.request_id,
            ),
          );
          return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Command failed";
      this.sendJson(
        ws,
        serverEvent("error", { code: "COMMAND_FAILED", message }, msg.request_id),
      );
      return;
    }

    this.sendJson(
      ws,
      serverEvent(
        "subscribed",
        {
          command: msg.command,
          subscriptions: this.state.subscriptions,
          channels: this.state.redisChannels,
        },
        msg.request_id,
      ),
    );
  }

  private async subscribeSimulation(msg: WsClientMessage): Promise<void> {
    if (!this.state) {
      return;
    }
    const pandaId = String(msg.payload.panda_id ?? "");
    const simulationId = String(msg.payload.simulation_id ?? "");
    if (!pandaId) {
      throw new Error("panda_id required");
    }
    this.state.subscriptions.pandas[pandaId] = { simulationId: simulationId || undefined };
    await this.syncChannels();
  }

  private async unsubscribeSimulation(msg: WsClientMessage): Promise<void> {
    if (!this.state) {
      return;
    }
    const pandaId = String(msg.payload.panda_id ?? "");
    if (pandaId) {
      delete this.state.subscriptions.pandas[pandaId];
    }
    await this.syncChannels();
  }

  private async subscribeMarket(msg: WsClientMessage): Promise<void> {
    if (!this.state) {
      return;
    }
    const assetsRaw = msg.payload.assets;
    const assets = Array.isArray(assetsRaw)
      ? assetsRaw.map((a) => String(a))
      : [];
    const interval = String(msg.payload.interval ?? "1m");
    this.state.subscriptions.market = { assets, interval };
    await this.syncChannels();
  }

  private async unsubscribeMarket(): Promise<void> {
    if (!this.state) {
      return;
    }
    this.state.subscriptions.market = null;
    await this.syncChannels();
  }

  private async syncChannels(): Promise<void> {
    if (!this.state) {
      return;
    }
    this.state.redisChannels = collectRedisChannels(this.state.subscriptions);
    await this.persistState();
    await this.refreshRedisSubscriber();
  }

  private async refreshRedisSubscriber(): Promise<void> {
    if (!this.state) {
      return;
    }
    const channels = this.state.redisChannels;
    if (
      channels.length === 0 ||
      (this.redisSubscriber &&
        channels.join() === this.redisSubscriberChannels.join())
    ) {
      if (channels.length === 0) {
        await this.stopRedisSubscriber();
      }
      return;
    }

    await this.stopRedisSubscriber();

    const redis = Redis.fromEnv(this.env);
    const sub = redis.subscribe(channels);
    sub.on("message", (data: unknown) => {
      void this.onRedisMessage(data);
    });

    this.redisSubscriber = {
      stop: async () => {
        await sub.unsubscribe();
      },
    };
    this.redisSubscriberChannels = [...channels];
  }

  private async stopRedisSubscriber(): Promise<void> {
    if (this.redisSubscriber) {
      await this.redisSubscriber.stop();
      this.redisSubscriber = null;
      this.redisSubscriberChannels = [];
    }
  }

  private async onRedisMessage(data: unknown): Promise<void> {
    if (!this.state) {
      return;
    }

    const { channel, message } = this.parseRedisEnvelope(data);
    if (!channel || message === null) {
      return;
    }
    if (!shouldForwardChannel(channel, this.state.subscriptions)) {
      return;
    }

    const event = normalizeRedisPayload(channel, message);
    if (!event) {
      return;
    }

    this.broadcast(event);
  }

  private parseRedisEnvelope(
    data: unknown,
  ): { channel: string | null; message: string | null } {
    if (typeof data === "string") {
      return { channel: null, message: data };
    }
    if (typeof data !== "object" || data === null) {
      return { channel: null, message: null };
    }
    const record = data as Record<string, unknown>;
    const channel =
      typeof record.channel === "string" ? record.channel : null;
    const message =
      typeof record.message === "string"
        ? record.message
        : record.message !== undefined
          ? JSON.stringify(record.message)
          : null;
    return { channel, message };
  }

  private broadcast(event: import("./types.js").WsServerEvent): void {
    const maxQueue = intEnv(this.env.MAX_OUTBOUND_QUEUE, 100);
    const payload = JSON.stringify(event);

    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) {
        continue;
      }
      try {
        ws.send(payload);
      } catch {
        // drop on send failure
      }
      void maxQueue;
    }
  }

  private sendJson(ws: WebSocket, event: import("./types.js").WsServerEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  private allowClientMessage(connId: string): boolean {
    const limit = intEnv(this.env.MAX_CLIENT_MESSAGES_PER_SEC, 10);
    const now = Date.now();
    const windowMs = 1000;
    const bucket = this.messageBuckets.get(connId) ?? [];
    const recent = bucket.filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      return false;
    }
    recent.push(now);
    this.messageBuckets.set(connId, recent);
    return true;
  }

  private async scheduleHeartbeat(): Promise<void> {
    const heartbeatSec = intEnv(this.env.HEARTBEAT_ALARM_SEC, 30);
    const existing = await this.ctx.storage.getAlarm();
    if (existing === null) {
      await this.ctx.storage.setAlarm(Date.now() + heartbeatSec * 1000);
    }
  }
}

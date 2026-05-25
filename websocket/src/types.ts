export interface Env {
  USER_HUB: DurableObjectNamespace;
  JWT_SECRET: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  MAX_CONNECTIONS_PER_USER?: string;
  MAX_CLIENT_MESSAGES_PER_SEC?: string;
  MAX_OUTBOUND_QUEUE?: string;
  HEARTBEAT_ALARM_SEC?: string;
}

export interface WsClientMessage {
  command: string;
  payload: Record<string, unknown>;
  request_id?: string;
}

export interface WsServerEvent<T = unknown> {
  event: string;
  payload: T;
  timestamp: string;
  request_id?: string;
}

export interface MarketSubscription {
  assets: string[];
  /** DeepBook pool/pair channel suffix, e.g. DEEP/SUI (from market-monitor) */
  pairs: string[];
  interval: string;
}

export interface SubscriptionState {
  pandas: Record<string, { simulationId?: string }>;
  market: MarketSubscription | null;
}

export interface StoredHubState {
  userId: string;
  subscriptions: SubscriptionState;
  redisChannels: string[];
}

export const WS_CLOSE = {
  INVALID_TOKEN: 4001,
  TOKEN_EXPIRED: 4002,
  USER_NOT_FOUND: 4003,
  RATE_LIMITED: 4008,
  TOO_MANY_CONNECTIONS: 4009,
} as const;

/** WebSocket Hub — aligned with docs/api-specification.md §4 */

export type WsConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error";

export interface WsClientMessage {
  command: string;
  payload: Record<string, unknown>;
  request_id?: string;
}

export interface WsServerEvent<T = Record<string, unknown>> {
  event: string;
  payload: T;
  timestamp: string;
  request_id?: string;
}

export type MarketInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface CandleBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface SubscribeMarketPayload {
  assets?: string[];
  /** DeepBook pool channel suffix, e.g. DEEP/SUI */
  pairs?: string[];
  interval?: MarketInterval;
}

export interface SubscribeSimulationPayload {
  panda_id: string;
  simulation_id: string;
}

export interface MarketTickCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval?: string;
}

export interface MarketTickPayload {
  asset?: string;
  pair?: string;
  timestamp?: number;
  price?: number;
  candle?: MarketTickCandle;
  stale?: boolean;
  [key: string]: unknown;
}

export interface CandlesResponse {
  pool: string;
  pair: string;
  interval: string;
  has_more?: boolean;
  oldest_t?: number | null;
  newest_t?: number | null;
  candles: CandleBar[];
}

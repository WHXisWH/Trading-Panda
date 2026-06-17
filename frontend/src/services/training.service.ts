import type { ApiResult } from "@/types/api";
import { isApiError } from "@/types/api";
import type { OrderIntentApi, TradeFactApi } from "@/types/autonomous-wallet";

function authHeaders(jwt: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };
}

export interface TrainingLedgerState {
  account_id?: string;
  mode: string;
  status?: string;
  cash_balance: number;
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  positions: Array<{
    pair?: string;
    asset: string;
    quantity: number;
    avg_entry_price?: number;
    unrealized_pnl?: number;
  }>;
  actor_active: boolean;
  policy_version?: number | null;
  last_order_intent?: OrderIntentApi | null;
  last_trade_fact?: TradeFactApi | null;
}

async function parseError(res: Response, json: ApiResult<unknown>): Promise<never> {
  const msg = isApiError(json) ? json.error.message : `Request failed (${res.status})`;
  throw new Error(msg);
}

export async function fetchTrainingLedger(
  jwt: string,
  pandaId: string,
): Promise<TrainingLedgerState> {
  const res = await fetch(`/api/panda/${pandaId}/training/ledger`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<TrainingLedgerState>;
  if (!res.ok || isApiError(json)) {
    await parseError(res, json);
  }
  return (json as { success: true; data: TrainingLedgerState }).data;
}

export async function fetchOrderIntents(
  jwt: string,
  pandaId: string,
  limit = 50,
): Promise<OrderIntentApi[]> {
  const res = await fetch(`/api/panda/${pandaId}/training/order-intents?limit=${limit}`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<OrderIntentApi[]>;
  if (!res.ok || isApiError(json)) {
    await parseError(res, json);
  }
  return (json as { success: true; data: OrderIntentApi[] }).data;
}

export async function fetchTradeFacts(
  jwt: string,
  pandaId: string,
  limit = 50,
): Promise<TradeFactApi[]> {
  const res = await fetch(`/api/panda/${pandaId}/training/trade-facts?limit=${limit}`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<TradeFactApi[]>;
  if (!res.ok || isApiError(json)) {
    await parseError(res, json);
  }
  return (json as { success: true; data: TradeFactApi[] }).data;
}

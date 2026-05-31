import type { ApiResult } from "@/types/api";
import { isApiError } from "@/types/api";
import type { TradeRecordApi } from "@/types/trading";

function authHeaders(jwt: string): HeadersInit {
  return { Authorization: `Bearer ${jwt}` };
}

export async function fetchTrades(
  jwt: string,
  pandaId: string,
  opts?: { simulationId?: string; limit?: number },
): Promise<TradeRecordApi[]> {
  const params = new URLSearchParams();
  if (opts?.simulationId) {
    params.set("simulation_id", opts.simulationId);
  }
  if (opts?.limit) {
    params.set("limit", String(opts.limit));
  }
  const qs = params.toString();
  const res = await fetch(`/api/panda/${pandaId}/trades${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<TradeRecordApi[]>;
  if (!res.ok || isApiError(json)) {
    const msg = isApiError(json) ? json.error.message : `trades ${res.status}`;
    throw new Error(msg);
  }
  return json.data;
}

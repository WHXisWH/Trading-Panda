import type { ApiResult } from "@/types/api";
import { isApiError } from "@/types/api";
import type { DeepbookPool } from "@/lib/constants/deepbookPools";
import type { SimulationSpeed } from "@/types/trading";

function authHeaders(jwt: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };
}

export interface SimulationStartResult {
  simulation_id: string;
  panda_id: string;
  status: string;
  speed: SimulationSpeed;
  subscribed_pools: DeepbookPool[];
}

export interface SimulationStatusResult {
  simulation_id: string | null;
  status: string;
  speed: string | null;
  is_trading: boolean;
  actor_active: boolean;
  initial_capital: number;
  equity?: number;
  trade_count?: number;
  positions?: Record<string, number>;
  emotion?: string;
}

async function parseError(res: Response, json: ApiResult<unknown>): Promise<never> {
  const msg = isApiError(json) ? json.error.message : `Request failed (${res.status})`;
  throw new Error(msg);
}

export async function startTraining(
  jwt: string,
  pandaId: string,
  opts: { speed: string; subscribedPools: DeepbookPool[] },
): Promise<SimulationStartResult> {
  const res = await fetch(`/api/panda/${pandaId}/simulation/start`, {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify({
      speed: opts.speed,
      subscribed_pools: opts.subscribedPools,
      data_source: "deepbook",
    }),
  });
  const json = (await res.json()) as ApiResult<SimulationStartResult>;
  if (!res.ok || isApiError(json)) {
    await parseError(res, json);
  }
  return (json as { success: true; data: SimulationStartResult }).data;
}

export async function stopTraining(
  jwt: string,
  pandaId: string,
): Promise<{ simulation_id: string | null; status: string }> {
  const res = await fetch(`/api/panda/${pandaId}/simulation/stop`, {
    method: "POST",
    headers: authHeaders(jwt),
    body: "{}",
  });
  const json = (await res.json()) as ApiResult<{
    simulation_id: string | null;
    status: string;
  }>;
  if (!res.ok || isApiError(json)) {
    await parseError(res, json);
  }
  return (json as { success: true; data: { simulation_id: string | null; status: string } })
    .data;
}

export async function fetchSimulationStatus(
  jwt: string,
  pandaId: string,
): Promise<SimulationStatusResult> {
  const res = await fetch(`/api/panda/${pandaId}/simulation/status`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<SimulationStatusResult>;
  if (!res.ok || isApiError(json)) {
    await parseError(res, json);
  }
  return (json as { success: true; data: SimulationStatusResult }).data;
}

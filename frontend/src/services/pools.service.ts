import type { ApiResult } from "@/types/api";
import { isApiError } from "@/types/api";
import type { DeepbookPool } from "@/lib/constants/deepbookPools";
import type { PandaPoolsData, PoolCatalogItem } from "@/types/pools";
import { DEEPBOOK_POOL_CATALOG } from "@/lib/pools/catalog";

function authHeaders(jwt: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };
}

async function parseError(res: Response, json: ApiResult<unknown>): Promise<never> {
  const msg = isApiError(json) ? json.error.message : `Request failed (${res.status})`;
  throw new Error(msg);
}

/** GET /api/pools — DeepBook catalog (no panda id, no candles). */
export async function fetchPoolCatalog(): Promise<PoolCatalogItem[]> {
  const res = await fetch("/api/pools", { cache: "no-store" });
  const json = (await res.json()) as ApiResult<{ pools: PoolCatalogItem[] }>;
  if (!res.ok || isApiError(json)) {
    await parseError(res, json);
  }
  const data = (json as { success: true; data: { pools: PoolCatalogItem[] } }).data;
  return data.pools?.length ? data.pools : defaultCatalog();
}

export async function updatePandaPools(
  jwt: string,
  pandaId: string,
  body: { subscribed_pools: DeepbookPool[]; primary_pool?: DeepbookPool },
): Promise<Pick<PandaPoolsData, "subscribed_pools" | "primary_pool" | "max_pools">> {
  const res = await fetch(`/api/panda/${pandaId}/pools`, {
    method: "PUT",
    headers: authHeaders(jwt),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: ApiResult<
    Pick<PandaPoolsData, "subscribed_pools" | "primary_pool" | "max_pools">
  >;
  try {
    json = JSON.parse(text) as ApiResult<
      Pick<PandaPoolsData, "subscribed_pools" | "primary_pool" | "max_pools">
    >;
  } catch {
    throw new Error(text || `Request failed (${res.status})`);
  }
  if (!res.ok || isApiError(json)) {
    await parseError(res, json);
  }
  return (json as { success: true; data: PandaPoolsData }).data;
}

export function defaultCatalog(): PoolCatalogItem[] {
  return [...DEEPBOOK_POOL_CATALOG];
}

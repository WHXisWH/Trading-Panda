/**
 * Panda API client — mint register, detail, my list (api-spec §3.2).
 */

import type { ApiResult, SuccessResponse } from "@/types/api";
import { isApiError } from "@/types/api";
import type {
  PandaDetailApi,
  PandaMintRequest,
  PandaMintResponseData,
  PandaSummaryApi,
} from "@/types/panda";

function authHeaders(jwt: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };
}

export async function registerMintedPanda(
  jwt: string,
  body: PandaMintRequest,
): Promise<PandaMintResponseData> {
  const res = await fetch("/api/panda/mint", {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiResult<PandaMintResponseData>;
  if (!res.ok || isApiError(json)) {
    const msg = isApiError(json) ? json.error.message : "Mint registration failed";
    throw new Error(msg);
  }
  return (json as SuccessResponse<PandaMintResponseData>).data;
}

export async function fetchPandaDetail(
  jwt: string,
  id: string,
): Promise<PandaDetailApi> {
  const res = await fetch(`/api/panda/${id}`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<PandaDetailApi>;
  if (!res.ok || isApiError(json)) {
    const msg = isApiError(json) ? json.error.message : "Failed to load panda";
    throw new Error(msg);
  }
  return (json as SuccessResponse<PandaDetailApi>).data;
}

export async function fetchMyPandas(jwt: string): Promise<PandaSummaryApi[]> {
  const res = await fetch("/api/panda/my", {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<PandaSummaryApi[]>;
  if (!res.ok || isApiError(json)) {
    const msg = isApiError(json) ? json.error.message : "Failed to load pandas";
    throw new Error(msg);
  }
  return (json as SuccessResponse<PandaSummaryApi[]>).data;
}

/** Review & Skill Memory API client — Epic 7 */

import type { ApiResult, SuccessResponse } from "@/types/api";
import { isApiError } from "@/types/api";
import type {
  SkillMemoryApi,
  SkillVersionApi,
  TradeReviewApi,
} from "@/types/autonomous-wallet";

function authHeaders(jwt: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };
}

async function parseData<T>(res: Response, fallback: string): Promise<T> {
  const json = (await res.json()) as ApiResult<T>;
  if (!res.ok || isApiError(json)) {
    const msg = isApiError(json) ? json.error.message : fallback;
    throw new Error(msg);
  }
  return (json as SuccessResponse<T>).data;
}

export async function fetchPandaReviews(
  jwt: string,
  pandaId: string,
): Promise<TradeReviewApi[]> {
  const res = await fetch(`/api/panda/${pandaId}/reviews`, {
    headers: authHeaders(jwt),
  });
  return parseData(res, "Failed to load reviews");
}

export async function fetchTradeFactReview(
  jwt: string,
  pandaId: string,
  tradeFactId: string,
): Promise<TradeReviewApi> {
  const res = await fetch(
    `/api/panda/${pandaId}/trade-facts/${tradeFactId}/review`,
    { headers: authHeaders(jwt) },
  );
  return parseData(res, "Review not found");
}

export async function requestTradeReview(
  jwt: string,
  pandaId: string,
  tradeFactId: string,
): Promise<{
  trade_fact_id: string;
  status: string;
  job_id: string | null;
  review?: TradeReviewApi;
  skill_memories?: SkillMemoryApi[];
  latest_skill_version?: SkillVersionApi | null;
}> {
  const res = await fetch(
    `/api/panda/${pandaId}/trade-facts/${tradeFactId}/review`,
    { method: "POST", headers: authHeaders(jwt) },
  );
  return parseData(res, "Failed to queue review");
}

export async function fetchSkillMemories(
  jwt: string,
  pandaId: string,
): Promise<SkillMemoryApi[]> {
  const res = await fetch(`/api/panda/${pandaId}/skill-memories`, {
    headers: authHeaders(jwt),
  });
  return parseData(res, "Failed to load skill memories");
}

export async function fetchLatestSkillVersion(
  jwt: string,
  pandaId: string,
): Promise<SkillVersionApi | null> {
  const res = await fetch(`/api/panda/${pandaId}/skill-versions/latest`, {
    headers: authHeaders(jwt),
  });
  if (res.status === 404) return null;
  return parseData(res, "Failed to load skill version");
}

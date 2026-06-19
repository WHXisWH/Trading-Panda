/**
 * Strategy API — feed / validate / get (api-spec §3.3)
 */

import type { ApiResult, SuccessResponse } from "@/types/api";
import { isApiError } from "@/types/api";
import type {
  StrategyFeedData,
  StrategyFeedRequest,
  StrategyFeedResponse,
  StrategyListItem,
  StrategyParseData,
  StrategyRecord,
  StrategyUpdateRequest,
  StrategyValidateData,
  StrategyValidateResponse,
} from "@/types/strategy";

function authHeaders(jwt: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };
}

async function parseApiError(res: Response, json: ApiResult<unknown>): Promise<never> {
  const msg = isApiError(json)
    ? json.error.message
    : `Request failed (${res.status})`;
  const err = new Error(msg) as Error & {
    code?: string;
    invalidRules?: unknown;
    policyConflicts?: unknown;
  };
  if (isApiError(json)) {
    err.code = json.error.code;
    err.invalidRules = json.error.invalid_rules;
    err.policyConflicts = (json.error as { policy_conflicts?: unknown }).policy_conflicts;
  }
  throw err;
}

export async function listStrategies(
  jwt: string,
  pandaId: string,
): Promise<StrategyListItem[]> {
  const res = await fetch(`/api/panda/${pandaId}/strategies`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<StrategyListItem[]>;
  if (!res.ok || isApiError(json)) {
    await parseApiError(res, json);
  }
  return (json as SuccessResponse<StrategyListItem[]>).data;
}

export async function getStrategy(
  jwt: string,
  pandaId: string,
): Promise<StrategyRecord | null> {
  const res = await fetch(`/api/panda/${pandaId}/strategy`, {
    headers: authHeaders(jwt),
  });
  if (res.status === 404) return null;
  const json = (await res.json()) as ApiResult<StrategyRecord>;
  if (!res.ok || isApiError(json)) {
    await parseApiError(res, json);
  }
  return (json as SuccessResponse<StrategyRecord>).data;
}

export async function parseStrategyText(
  jwt: string,
  pandaId: string,
  rawText: string,
): Promise<StrategyParseData> {
  const res = await fetch(`/api/panda/${pandaId}/strategy/parse`, {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify({ raw_text: rawText }),
  });
  const json = (await res.json()) as ApiResult<StrategyParseData>;
  if (!res.ok || isApiError(json)) {
    await parseApiError(res, json);
  }
  return (json as SuccessResponse<StrategyParseData>).data;
}

export async function feedStrategy(
  jwt: string,
  pandaId: string,
  body: StrategyFeedRequest,
): Promise<StrategyFeedData> {
  const res = await fetch(`/api/panda/${pandaId}/strategy`, {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as StrategyFeedResponse;
  if (!res.ok || isApiError(json)) {
    await parseApiError(res, json);
  }
  return json.data;
}

export async function saveStrategyDraft(
  jwt: string,
  pandaId: string,
  body: Omit<StrategyFeedRequest, "activate">,
): Promise<StrategyFeedData> {
  return feedStrategy(jwt, pandaId, { ...body, activate: false });
}

export async function updateStrategy(
  jwt: string,
  pandaId: string,
  strategyId: string,
  body: StrategyUpdateRequest,
): Promise<StrategyListItem> {
  const res = await fetch(`/api/panda/${pandaId}/strategy/${strategyId}`, {
    method: "PATCH",
    headers: authHeaders(jwt),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiResult<StrategyListItem>;
  if (!res.ok || isApiError(json)) {
    await parseApiError(res, json);
  }
  return (json as SuccessResponse<StrategyListItem>).data;
}

export async function activateStrategy(
  jwt: string,
  pandaId: string,
  strategyId: string,
): Promise<StrategyFeedData> {
  const res = await fetch(`/api/panda/${pandaId}/strategy/${strategyId}/activate`, {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify({}),
  });
  const json = (await res.json()) as StrategyFeedResponse;
  if (!res.ok || isApiError(json)) {
    await parseApiError(res, json);
  }
  return json.data;
}

export async function validateStrategy(
  jwt: string,
  pandaId: string,
  body: StrategyFeedRequest,
): Promise<StrategyValidateData> {
  const res = await fetch(`/api/panda/${pandaId}/strategy/validate`, {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as StrategyValidateResponse;
  if (!res.ok || isApiError(json)) {
    await parseApiError(res, json);
  }
  return json.data;
}

export function strategyErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as Error & { code?: string }).code;
    if (code === "STRATEGY_RULE_INVALID") return "Some rules could not compile — check highlighted rows";
    if (code === "STRATEGY_POLICY_CONFLICT") return "Playbook conflicts with TradingPolicy — adjust pairs or sizing";
    if (code === "POLICY_PAIR_NOT_ALLOWED") return "Playbook includes a pair not allowed by Policy";
    if (code === "STRATEGY_RATE_LIMIT") return "AI drafting is rate-limited — try again shortly";
    if (code === "STRATEGY_PARSE_FAILED") return "Could not read that playbook — try a more specific crypto scenario";
    if (code === "PANDA_IS_TRADING") return "Training is running — stop the ledger before changing strategy";
    return err.message;
  }
  return "Strategy operation failed";
}

/** @deprecated Legacy dashboard path — prefer parseStrategyText */
export async function parseStrategyWithLlm(
  jwt: string,
  pandaId: string,
  rawText: string,
): Promise<StrategyFeedData> {
  const parsed = await parseStrategyText(jwt, pandaId, rawText);
  return {
    strategy_id: "",
    version: 0,
    raw_text: parsed.title,
    parsed: parsed.parsed,
    strategy_hash: "",
    proficiency: 0,
    personality_match: 0,
    panda_reaction: "",
    previous_strategy_shadow: null,
  };
}

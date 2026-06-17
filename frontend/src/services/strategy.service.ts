/**
 * Strategy API — feed / validate / get (api-spec §3.3)
 */

import type { ApiResult, SuccessResponse } from "@/types/api";
import { isApiError } from "@/types/api";
import type {
  StrategyFeedData,
  StrategyFeedRequest,
  StrategyFeedResponse,
  StrategyRecord,
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

export async function parseStrategyWithLlm(
  jwt: string,
  pandaId: string,
  rawText: string,
): Promise<StrategyFeedData> {
  return feedStrategy(jwt, pandaId, { raw_text: rawText, parse_with_llm: true });
}

export function strategyErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as Error & { code?: string }).code;
    if (code === "STRATEGY_RULE_INVALID") return "部分规则无法编译，请检查标红行";
    if (code === "STRATEGY_POLICY_CONFLICT") return "策略与当前 TradingPolicy 冲突，请调整交易对或仓位";
    if (code === "POLICY_PAIR_NOT_ALLOWED") return "策略包含 Policy 未授权的交易对";
    if (code === "STRATEGY_RATE_LIMIT") return "LLM 解析过于频繁，请稍后再试";
    if (code === "PANDA_IS_TRADING") return "训练进行中，请先停止 Training Ledger 再换策略";
    return err.message;
  }
  return "策略操作失败";
}

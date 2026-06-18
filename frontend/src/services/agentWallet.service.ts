import type { ApiResult, SuccessResponse } from "@/types/api";
import { isApiError } from "@/types/api";
import type {
  AgentWalletStatusApi,
  PolicyDraft,
  PolicyValidationResult,
} from "@/types/agent-wallet";

function readApiErrorMessage(json: unknown, fallback: string): string {
  if (json && isApiError(json as ApiResult<unknown>)) {
    return (json as ApiResult<unknown> & { error: { message: string } }).error.message;
  }
  if (json && typeof json === "object") {
    const record = json as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.message === "string") return record.message;
  }
  return fallback;
}

function authHeaders(jwt: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };
}

export async function fetchAgentWalletStatus(
  jwt: string,
  pandaId: string,
): Promise<AgentWalletStatusApi> {
  const res = await fetch(`/api/panda/${pandaId}/agent-wallet`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<AgentWalletStatusApi>;
  if (!res.ok || isApiError(json)) {
    const msg = readApiErrorMessage(json, "Failed to load Agent Wallet status");
    throw new Error(msg);
  }
  return (json as SuccessResponse<AgentWalletStatusApi>).data;
}

export async function validatePolicyDraft(
  jwt: string,
  pandaId: string,
  draft: PolicyDraft,
): Promise<PolicyValidationResult> {
  const res = await fetch(`/api/panda/${pandaId}/agent-wallet/validate-policy`, {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify({
      training_budget: draft.trainingBudget,
      allowed_pairs: draft.allowedPairs,
      max_notional_per_trade: draft.maxNotionalPerTrade,
      max_daily_loss: draft.maxDailyLoss,
      max_open_positions: draft.maxOpenPositions,
      cooldown_ms: draft.cooldownMs,
      max_proofs_per_day: draft.maxProofsPerDay,
      proof_mode: draft.proofMode,
    }),
  });
  const json = (await res.json()) as ApiResult<PolicyValidationResult>;
  if (!res.ok || isApiError(json)) {
    const msg = readApiErrorMessage(json, "Policy validation failed");
    throw new Error(msg);
  }
  return (json as SuccessResponse<PolicyValidationResult>).data;
}

export async function syncAgentWallet(
  jwt: string,
  pandaId: string,
  suiTxDigest: string,
  draft: PolicyDraft,
): Promise<AgentWalletStatusApi> {
  const res = await fetch(`/api/panda/${pandaId}/agent-wallet/sync`, {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify({
      sui_tx_digest: suiTxDigest,
      draft: {
        training_budget: draft.trainingBudget,
        allowed_pairs: draft.allowedPairs,
        max_notional_per_trade: draft.maxNotionalPerTrade,
        max_daily_loss: draft.maxDailyLoss,
        max_open_positions: draft.maxOpenPositions,
        cooldown_ms: draft.cooldownMs,
        max_proofs_per_day: draft.maxProofsPerDay,
        proof_mode: draft.proofMode,
      },
    }),
  });
  const json = (await res.json()) as ApiResult<AgentWalletStatusApi>;
  if (!res.ok || isApiError(json)) {
    const msg = readApiErrorMessage(json, "Backend mirror sync failed");
    throw new Error(msg);
  }
  return (json as SuccessResponse<AgentWalletStatusApi>).data;
}

export async function updateTrainingBudget(
  jwt: string,
  pandaId: string,
  trainingBudget: number,
): Promise<AgentWalletStatusApi> {
  const res = await fetch(`/api/panda/${pandaId}/agent-wallet/training-budget`, {
    method: "PATCH",
    headers: authHeaders(jwt),
    body: JSON.stringify({ training_budget: trainingBudget }),
  });
  const json = (await res.json()) as ApiResult<AgentWalletStatusApi>;
  if (!res.ok || isApiError(json)) {
    const msg = readApiErrorMessage(json, "Training budget update failed");
    throw new Error(msg);
  }
  return (json as SuccessResponse<AgentWalletStatusApi>).data;
}

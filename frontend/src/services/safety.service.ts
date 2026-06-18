import type { ApiResult, SuccessResponse } from "@/types/api";
import { isApiError } from "@/types/api";
import type { PolicyDraft } from "@/types/agent-wallet";
import type { OwnerAction, SafetyStatusApi } from "@/types/safety";

function authHeaders(jwt: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };
}

export async function fetchSafetyStatus(
  jwt: string,
  pandaId: string,
): Promise<SafetyStatusApi> {
  const res = await fetch(`/api/panda/${pandaId}/safety`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<SafetyStatusApi>;
  if (!res.ok || isApiError(json)) {
    const msg = isApiError(json) ? json.error.message : "Failed to load safety status";
    throw new Error(msg);
  }
  return (json as SuccessResponse<SafetyStatusApi>).data;
}

export async function syncOwnerAction(
  jwt: string,
  pandaId: string,
  action: OwnerAction,
  suiTxDigest: string,
  draft?: PolicyDraft & { policy_hash?: string },
): Promise<SafetyStatusApi> {
  const res = await fetch(`/api/panda/${pandaId}/safety/owner-action`, {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify({
      sui_tx_digest: suiTxDigest,
      action,
      draft: draft
        ? {
            training_budget: draft.trainingBudget,
            allowed_pairs: draft.allowedPairs,
            max_notional_per_trade: draft.maxNotionalPerTrade,
            max_daily_loss: draft.maxDailyLoss,
            max_open_positions: draft.maxOpenPositions,
            cooldown_ms: draft.cooldownMs,
            max_proofs_per_day: draft.maxProofsPerDay,
            proof_mode: draft.proofMode,
            policy_hash: draft.policy_hash,
          }
        : undefined,
    }),
  });
  const json = (await res.json()) as ApiResult<SafetyStatusApi>;
  if (!res.ok || isApiError(json)) {
    const msg = isApiError(json) ? json.error.message : "Safety action sync failed";
    throw new Error(msg);
  }
  return (json as SuccessResponse<SafetyStatusApi>).data;
}

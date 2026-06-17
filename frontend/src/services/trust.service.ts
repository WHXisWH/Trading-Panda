import type { ApiResult } from "@/types/api";
import { isApiError } from "@/types/api";

function authHeaders(jwt: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };
}

export interface MerkleRootStatus {
  id: string;
  panda_id: string;
  root_hash: string;
  trade_count: number;
  batch_index: number;
  root_type: string;
  start_fact_id: string | null;
  end_fact_id: string | null;
  sui_tx_digest: string | null;
  submitted_at: string | null;
  chain_status: "pending" | "submitted";
}

export interface SkillDigestStatus {
  id: string;
  panda_id: string;
  version: number;
  skill_hash: string;
  walrus_blob_id: string | null;
  submitted_tx_digest: string | null;
  created_at: string | null;
}

async function parseError(res: Response, json: ApiResult<unknown>): Promise<never> {
  const msg = isApiError(json) ? json.error.message : `Request failed (${res.status})`;
  throw new Error(msg);
}

export async function fetchLatestMerkleStatus(
  jwt: string,
  pandaId: string,
): Promise<MerkleRootStatus | null> {
  const res = await fetch(`/api/panda/${pandaId}/trust/merkle`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<MerkleRootStatus | null>;
  if (!res.ok || isApiError(json)) {
    await parseError(res, json);
  }
  return (json as { success: true; data: MerkleRootStatus | null }).data;
}

export async function fetchLatestSkillDigest(
  jwt: string,
  pandaId: string,
): Promise<SkillDigestStatus | null> {
  const res = await fetch(`/api/panda/${pandaId}/trust/skill-digest`, {
    headers: authHeaders(jwt),
  });
  const json = (await res.json()) as ApiResult<SkillDigestStatus | null>;
  if (!res.ok || isApiError(json)) {
    await parseError(res, json);
  }
  return (json as { success: true; data: SkillDigestStatus | null }).data;
}

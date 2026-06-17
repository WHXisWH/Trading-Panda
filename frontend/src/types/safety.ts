/** Safety / Emergency Controls page types — Epic 8. */

import type { PandaVaultApi, TradingPolicyApi } from "./autonomous-wallet";
import type { MirrorSyncStatus } from "./agent-wallet";

export type RiskStatus =
  | "active"
  | "paused"
  | "revoked"
  | "tightened"
  | "mirror_syncing"
  | "no_wallet";

export type OwnerAction = "pause" | "unpause" | "revoke" | "tighten";

export interface PendingChainProofJobApi {
  job_id: string;
  status: string;
  trade_fact_id: string | null;
  proof_key: string | null;
  proof_source: string | null;
  created_at: string | null;
}

export interface SafetyStatusApi {
  risk_status: RiskStatus;
  mirror_sync_status: MirrorSyncStatus;
  mirror_synced: boolean;
  can_pause: boolean;
  can_unpause: boolean;
  can_revoke: boolean;
  can_tighten: boolean;
  pending_chain_proof_jobs: PendingChainProofJobApi[];
  pending_job_count: number;
  vault: PandaVaultApi | null;
  policy: TradingPolicyApi | null;
  agent_signer_address: string | null;
  launch_pairs: string[];
}

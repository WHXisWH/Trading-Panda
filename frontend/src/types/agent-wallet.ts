/** Agent Wallet setup page types — Epic 2. */

import type { PandaVaultApi, TradingPolicyApi } from "./autonomous-wallet";

export type SetupState = "no_vault" | "active" | "mirror_syncing" | "ready";
export type MirrorSyncStatus = "pending" | "synced" | "degraded";

export interface PolicyDraft {
  allowedPairs: string[];
  maxNotionalPerTrade: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  cooldownMs: number;
  maxProofsPerDay: number;
  proofMode: "manual" | "auto";
}

export interface PolicyValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  policy_hash: string;
  authorized_agent: string | null;
  supported_pairs: string[];
}

export interface PandaAccountApi {
  id: string;
  panda_id: string;
  vault_id: string | null;
  mode: string;
  base_asset: string;
  cash_balance: number;
  debt_balance: number;
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  status: string;
}

export interface AgentWalletStatusApi {
  setup_state: SetupState;
  mirror_sync_status: MirrorSyncStatus;
  vault: PandaVaultApi | null;
  policy: TradingPolicyApi | null;
  account: PandaAccountApi | null;
  authorized_agent_configured: boolean;
  agent_signer_address: string | null;
  can_start_training: boolean;
  launch_pairs: string[];
}

export const DEFAULT_POLICY_DRAFT: PolicyDraft = {
  allowedPairs: ["DEEP/SUI", "SUI/USDC"],
  maxNotionalPerTrade: 50,
  maxDailyLoss: 8,
  maxOpenPositions: 1,
  cooldownMs: 0,
  maxProofsPerDay: 10,
  proofMode: "manual",
};

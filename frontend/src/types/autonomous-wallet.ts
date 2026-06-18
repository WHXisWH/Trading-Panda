/** v3.1 Autonomous Agent Wallet — API wire contracts (snake_case). */

export type VaultMode = "training_ledger" | "panda_coin_demo" | "real_wallet";

export type PolicyMode = VaultMode;

export type VaultStatus = "active" | "paused" | "revoked" | "closed";

export type AccountStatus = "active" | "paused" | "liquidated" | "closed";

export type IntentSide = "BUY" | "SELL" | "HOLD";

export type IntentStatus = "DECIDED" | "REJECTED" | "EXECUTED" | "SKIPPED";

export type ChainProofStatus =
  | "not_requested"
  | "eligible"
  | "requested"
  | "submitted"
  | "confirmed"
  | "failed"
  | "cancelled";

export type ReviewVerdict = "win" | "loss" | "breakeven" | "invalid";

export type SkillScope = "global" | "pair" | "regime";

export type SkillMemoryStatus =
  | "proposed"
  | "supported"
  | "verified"
  | "weakened"
  | "retired";

export interface PandaVaultApi {
  id: string;
  panda_id: string;
  sui_object_id: string | null;
  sui_object_kind: "shared_object";
  mode: VaultMode;
  status: VaultStatus;
  owner_address: string;
  authorized_agent: string | null;
  agent_key_scope: string;
  base_asset: string;
  policy_id: string | null;
  policy_version: number;
  training_budget?: number;
}

export interface TradingPolicyApi {
  id: string;
  panda_id: string;
  vault_id: string | null;
  sui_object_id: string | null;
  object_model: "standalone_shared_object";
  owner_address: string;
  authorized_agent: string | null;
  agent_key_scope: string;
  agent_key_version: number;
  mode: PolicyMode;
  allowed_pairs: string[];
  max_notional_per_trade: number;
  max_daily_loss: number;
  max_leverage: number;
  max_open_positions: number;
  paused: boolean;
  version: number;
  policy_hash: string;
}

export interface OrderIntentApi {
  id: string;
  panda_id: string;
  vault_id: string | null;
  policy_id: string | null;
  policy_version: number;
  mode: VaultMode;
  pair: string;
  side: IntentSide;
  notional: number;
  reference_price: number;
  max_slippage_bps: number | null;
  final_score: number | null;
  reason: string | null;
  decision_hash: string;
  proof_eligible: boolean;
  proof_requested: boolean;
  proof_request_source: "auto" | "manual" | null;
  proof_key: string | null;
  status: IntentStatus;
  rejection_reason: string | null;
}

export interface TradeFactApi {
  id: string;
  panda_id: string;
  order_intent_id: string;
  pair: string;
  side: IntentSide;
  mode: VaultMode;
  review_status: "pending" | "reviewed" | "skipped";
  proof_status: ChainProofStatus;
  proof_key: string | null;
  fact_hash: string;
  realized_pnl: number | null;
  realized_pnl_pct?: number | null;
  opened_at?: string | null;
  closed_at?: string | null;
  decision_snapshot?: Record<string, unknown>;
}

export interface ChainProofEligibilityApi {
  eligible: boolean;
  reasons: string[];
  score_bypassed: boolean;
  chain_proof_enabled: boolean;
}

export interface ChainProofTimelineStepApi {
  state: string;
  label: string;
  active: boolean;
  done: boolean;
}

export interface ChainProofStatusApi {
  trade_fact: TradeFactApi;
  order_intent: OrderIntentApi;
  eligibility: ChainProofEligibilityApi;
  agent_signer: {
    configured: boolean;
    address: string | null;
    scope: string;
  };
  proof_job: {
    job_id: string | null;
    job_status: string | null;
    timeline: ChainProofTimelineStepApi[];
  };
  chain_execution: {
    id: string | null;
    status: ChainProofStatus | string;
    tx_digest: string | null;
    tx_digest_short: string | null;
    policy_version: number | null;
    decision_hash: string | null;
    decision_hash_short: string | null;
    event_type: string | null;
    event_payload: Record<string, unknown> | null;
    error_message: string | null;
    retryable: boolean;
    proof_key: string | null;
  };
  objects: {
    vault_object_id: string | null;
    policy_object_id: string | null;
    vault_object_id_short: string | null;
    policy_object_id_short: string | null;
  };
}

export interface ChainProofRequestResultApi {
  queue: {
    trade_fact_id: string;
    proof_key: string;
    status: string;
    job_id: string | null;
    proof_source: string | null;
    score_bypassed: boolean;
  };
  status: ChainProofStatusApi;
}

export interface SkillMemoryApi {
  id: string;
  panda_id: string;
  scope: SkillScope;
  pair: string | null;
  market_regime: string | null;
  rule_text: string;
  confidence: number;
  status: SkillMemoryStatus;
  evidence_trade_fact_ids: string[];
  version: number;
  memory_hash: string;
}

export interface HypothesisApi {
  thesis: string;
  status: SkillMemoryStatus | "proposed";
  confirming_evidence: string[];
  contradicting_evidence: string[];
  entry_reference_price: number;
  exit_reference_price: number;
  realized_pnl: number;
}

export interface TradeReviewApi {
  id: string;
  panda_id: string;
  trade_fact_id: string;
  verdict: ReviewVerdict;
  reason_summary: string;
  evidence: Record<string, unknown>;
  hypotheses: HypothesisApi[];
  reviewer: string;
  review_hash: string;
  created_at: string | null;
  skill_update?: {
    updated: boolean;
    reason?: string;
    message?: string;
    skill_version?: number;
    skill_hash?: string;
    memory?: SkillMemoryApi;
  };
}

export interface SkillVersionApi {
  id: string;
  panda_id: string;
  version: number;
  skill_hash: string;
  walrus_blob_id: string | null;
  submitted_tx_digest: string | null;
  created_at: string | null;
}

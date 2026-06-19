/** Strategy contracts — snake_case wire format (API / PostgreSQL parsed_json) */

import type { SuccessResponse } from "./api";

export type Philosophy =
  | "trend_following"
  | "contrarian"
  | "intuition_driven"
  | "grid"
  | "custom";

export type SupportedIndicator = "RSI" | "MA20" | "MACD" | "PRICE";

export type SignalAction = "BUY" | "SELL";

export interface SignalRule {
  indicator: SupportedIndicator;
  condition: string;
  threshold?: number;
  action: SignalAction;
  /** Reserved — MVP RuleEngine does not use weights */
  weight?: number;
}

export interface PositionSizingLayers {
  type?: "fixed" | "kelly" | "grid";
  value?: number;
  max_position_pct?: number;
  scale_in?: boolean;
}

export interface RiskManagementLayers {
  stop_loss_pct: number;
  take_profit_pct?: number;
  max_drawdown_pct: number;
}

/** Four-layer strategy JSON (Epic 2 feed / validate body) */
export interface ParsedStrategyLayers {
  philosophy: Philosophy;
  position_sizing: PositionSizingLayers;
  signal_rules: SignalRule[];
  risk_management: RiskManagementLayers;
  target_pairs?: string[];
}

export interface PolicyConflictDetail {
  field: string;
  code: string;
  message: string;
  value?: string | number;
}

export interface GhostInfluenceSummary {
  ghost_weight: number;
  trades_since_switch?: number;
  expected_decay_trades: number;
  summary?: string;
}

export interface StrategyFeedRequest {
  raw_text?: string;
  parsed?: ParsedStrategyLayers;
  parse_with_llm?: boolean;
  activate?: boolean;
}

export interface StrategyUpdateRequest {
  raw_text?: string;
  parsed?: ParsedStrategyLayers;
}

export interface InvalidRuleDetail {
  index: number;
  reason: string;
  indicator?: string | null;
}

export interface StrategyParseData {
  parsed: ParsedStrategyLayers;
  raw_text?: string | null;
  title: string;
  human_summary: string;
  warnings?: string[];
  invalid_rules?: InvalidRuleDetail[];
  draft_valid?: boolean;
}

export interface StrategyListItem {
  strategy_id: string;
  version: number;
  raw_text: string;
  parsed: ParsedStrategyLayers;
  strategy_hash: string;
  proficiency: number;
  is_active: boolean;
  personality_match: number;
  created_at: string | null;
}

export interface StrategyShadowInfo {
  ghost_weight: number;
  expected_decay_trades: number;
}

export interface StrategyFeedData {
  strategy_id: string;
  version: number;
  raw_text: string;
  parsed: ParsedStrategyLayers;
  strategy_hash: string;
  proficiency: number;
  personality_match: number;
  previous_strategy_shadow: StrategyShadowInfo | null;
  panda_reaction: string;
  policy_version?: number | null;
  policy_compatible?: boolean | null;
  target_pairs?: string[];
}

export type StrategyFeedResponse = SuccessResponse<StrategyFeedData>;

export interface StrategyValidatePreviewSignal {
  signed_score: number;
  buy_hits: number;
  sell_hits: number;
  total_rules: number;
  matched_rule_indexes: number[];
}

export interface StrategyValidateData {
  valid: boolean;
  compiled_count: number;
  invalid_rules: Array<{
    index: number;
    reason: string;
    indicator?: string;
  }>;
  preview_signal?: StrategyValidatePreviewSignal;
  warnings: string[];
  policy_compatible?: boolean | null;
  policy_version?: number | null;
  policy_paused?: boolean;
  policy_summary?: string | null;
  allowed_pairs?: string[];
  blocked_pairs?: string[];
  target_pairs?: string[];
  policy_conflicts?: PolicyConflictDetail[];
}

export type StrategyValidateResponse = SuccessResponse<StrategyValidateData>;

/** Persisted strategy row (GET /api/panda/:id/strategy) */
export interface StrategyRecord {
  strategy_id: string;
  version: number;
  raw_text: string;
  parsed: ParsedStrategyLayers;
  strategy_hash: string;
  proficiency: number;
  is_active: boolean;
  personality_match: number;
  created_at: string;
  policy_compatible?: boolean | null;
  policy_version?: number | null;
  policy_summary?: string | null;
  allowed_pairs?: string[];
  blocked_pairs?: string[];
  target_pairs?: string[];
  policy_conflicts?: PolicyConflictDetail[];
  ghost_influence?: GhostInfluenceSummary | null;
}

/** UI builder row (camelCase local state) */
export interface SignalRuleRow {
  id: string;
  indicator: SupportedIndicator;
  condition: string;
  threshold?: number;
  action: SignalAction;
}

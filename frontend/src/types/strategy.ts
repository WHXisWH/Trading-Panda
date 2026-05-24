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
}

export interface StrategyFeedRequest {
  raw_text?: string;
  parsed?: ParsedStrategyLayers;
  parse_with_llm?: boolean;
}

export interface StrategyShadowInfo {
  ghost_weight: number;
  expected_decay_trades: number;
}

export interface StrategyFeedData {
  strategy_id: string;
  raw_text: string;
  parsed: ParsedStrategyLayers;
  strategy_hash: string;
  proficiency: number;
  personality_match: number;
  previous_strategy_shadow: StrategyShadowInfo | null;
  panda_reaction: string;
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
}

export type StrategyValidateResponse = SuccessResponse<StrategyValidateData>;

/** Persisted strategy row (GET /api/panda/:id/strategy) */
export interface StrategyRecord {
  strategy_id: string;
  raw_text: string;
  parsed: ParsedStrategyLayers;
  strategy_hash: string;
  proficiency: number;
  is_active: boolean;
  personality_match: number;
  created_at: string;
}

/** UI builder row (camelCase local state) */
export interface SignalRuleRow {
  id: string;
  indicator: SupportedIndicator;
  condition: string;
  threshold?: number;
  action: SignalAction;
}

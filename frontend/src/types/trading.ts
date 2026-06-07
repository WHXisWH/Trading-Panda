/** Trading & decision chain — aligned with DE + trades table */

import type { EmotionState } from "./panda";

export type Asset = "BTC" | "ETH" | "SUI";

export type TradeAction = "BUY" | "SELL" | "HOLD";

export type DecisionZone = "EXECUTE" | "OBSERVE" | "IGNORE";

/** Step 1 rule vote detail (Dashboard DecisionChain) */
export interface StepRuleHits {
  buy_hits: number;
  sell_hits: number;
  total_compiled: number;
  matched_rule_indexes: number[];
  signed_vote: number;
}

export interface DecisionStep {
  step: number;
  name: string;
  score: number;
  /** Legacy mock fields — keep optional for gradual UI migration */
  inputScore?: number;
  outputScore?: number;
  detail?: string;
  direction?: number;
  rule_hits?: StepRuleHits;
  highlight?: boolean;
}

export interface DecisionLog {
  id?: string;
  timestamp: number | string;
  action: TradeAction;
  final_score: number;
  zone: DecisionZone;
  asset?: string;
  price?: number;
  steps: DecisionStep[];
  entry_threshold?: number;
}

export interface TradeRecordApi {
  id: string;
  panda_id: string;
  strategy_id: string;
  simulation_id: string;
  asset: Asset;
  action: TradeAction;
  price: number;
  quantity: number;
  position_size_pct: number;
  final_score: number;
  emotion_at_trade: EmotionState;
  proficiency_at_trade: number;
  pnl_pct: number | null;
  decision_details: {
    steps: DecisionStep[];
    zone?: DecisionZone;
    entry_threshold?: number;
  };
  created_at: string;
}

/** App-level trade (camelCase) */
export interface Trade {
  id: string;
  pandaId: string;
  asset: Asset;
  action: TradeAction;
  price: number;
  quantity: number;
  finalScore: number;
  emotionAtTrade: EmotionState;
  proficiencyAtTrade: number;
  pnlPct: number | null;
  decisionDetails: {
    steps: DecisionStep[];
    zone?: DecisionZone;
    entry_threshold?: number;
  };
  createdAt: string;
}

export type SimulationSpeed = "1x" | "10x" | "100x" | "instant";

export type SimulationStatus = "running" | "completed" | "stopped";

export interface SimulationState {
  id: string;
  pandaId: string;
  status: SimulationStatus;
  speed: SimulationSpeed;
  equity: number;
  totalTrades: number;
  winRate: number | null;
  maxDrawdown: number | null;
}

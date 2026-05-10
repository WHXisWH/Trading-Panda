// ─── Panda ────────────────────────────────────────────────────────────────────

export type EmotionState =
  | "focused"
  | "excited"
  | "greedy"
  | "cautious"
  | "panicking"
  | "numb";

export type GrowthStage = "cub" | "growing" | "mature";

export interface PandaPersonality {
  boldness: number;    // 0–100 胆识
  patience: number;    // 0–100 耐性 (also drives emotion_stability)
  intuition: number;   // 0–100 直觉
  focus: number;       // 0–100 专注
  contrarian: number;  // 0–100 逆向性
  talent: number;      // 0–6  天赋 (0 = none)
}

export interface Panda {
  id: string;
  suiObjectId: string;
  name: string;
  personality: PandaPersonality;
  experienceLevel: number;       // 0–100
  growthStage: GrowthStage;
  emotionState: EmotionState;
  isTrading: boolean;
  activeStrategyId: string | null;
  walrusBlobId: string | null;
  createdAt: string;
}

// ─── Strategy ────────────────────────────────────────────────────────────────

export type Philosophy =
  | "trend_following"
  | "contrarian"
  | "intuition_driven"
  | "grid"
  | "custom";

export interface ParsedStrategy {
  philosophy: Philosophy;
  positionSizing: Record<string, unknown>;
  signalRules: Array<{ condition: string; action: "BUY" | "SELL" }>;
  riskManagement: { stopLoss: number; maxDrawdown: number };
}

export interface Strategy {
  id: string;
  pandaId: string;
  rawText: string;
  parsedJson: ParsedStrategy;
  strategyHash: string;
  philosophy: Philosophy;
  proficiency: number;   // 0–100
  isActive: boolean;
  createdAt: string;
}

// ─── Trading ─────────────────────────────────────────────────────────────────

export type Asset = "BTC" | "ETH" | "SUI";
export type TradeAction = "BUY" | "SELL" | "HOLD";

export interface DecisionStep {
  step: number;
  name: string;
  inputScore: number;
  outputScore: number;
  detail: string;
}

export interface Trade {
  id: string;
  pandaId: string;
  asset: Asset;
  action: TradeAction;
  price: number;
  quantity: number;
  finalScore: number;       // Step 8 output
  emotionAtTrade: EmotionState;
  proficiencyAtTrade: number;
  pnlPct: number | null;
  decisionDetails: {
    steps: DecisionStep[];
  };
  createdAt: string;
}

// ─── User ────────────────────────────────────────────────────────────────────

export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface OnboardingSurvey {
  tradingExp: string;
  style: string[];
  maxLoss: number;
  indicators: string[];
  pandaAutonomy: number;  // 1–5
}

export interface User {
  id: string;
  walletAddress: string;
  displayName: string | null;
  avatarUrl: string | null;
  experienceLevel: ExperienceLevel | null;
  onboardingSurvey: OnboardingSurvey | null;
  createdAt: string;
}

// ─── Simulation ───────────────────────────────────────────────────────────────

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

// ─── WebSocket events ────────────────────────────────────────────────────────

export type WSEventType =
  | "TRADE_EXECUTED"
  | "EMOTION_CHANGED"
  | "DECISION_MADE"
  | "DIARY_ENTRY"
  | "MERKLE_ROOT_SUBMITTED";

export interface WSEvent {
  type: WSEventType;
  pandaId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

/**
 * Shared types — re-export modules for `@/types` imports.
 * Wire/API shapes use snake_case in strategy.ts & PandaDetailApi; app models use camelCase.
 */

export type {
  ApiErrorCode,
  ApiErrorBody,
  ApiResult,
  ErrorResponse,
  PaginationMeta,
  SuccessResponse,
} from "./api";

export { isApiError } from "./api";

export type {
  AuthConnectData,
  AuthConnectRequest,
  AuthConnectResponse,
  AuthMeData,
  AuthMeResponse,
  AuthMethod,
  AuthNonceData,
  AuthNonceResponse,
  AuthRefreshData,
  AuthRefreshResponse,
} from "./auth";

export { authUserFromConnect, authUserFromMe } from "./auth";

export type {
  EmotionState,
  GrowthStage,
  MintResult,
  Panda,
  PandaDetailApi,
  PandaPersonality,
  PandaTalent,
  WalrusSyncStatus,
} from "./panda";

export type {
  DecisionLog,
  DecisionStep,
  DecisionZone,
  SimulationSpeed,
  SimulationState,
  SimulationStatus,
  StepRuleHits,
  Trade,
  TradeAction,
  TradeRecordApi,
  Asset,
} from "./trading";

export type {
  ParsedStrategyLayers,
  Philosophy,
  PositionSizingLayers,
  RiskManagementLayers,
  SignalAction,
  SignalRule,
  SignalRuleRow,
  StrategyFeedData,
  StrategyFeedRequest,
  StrategyFeedResponse,
  StrategyRecord,
  StrategyShadowInfo,
  StrategyValidateData,
  StrategyValidatePreviewSignal,
  StrategyValidateResponse,
  SupportedIndicator,
} from "./strategy";

/** @deprecated Use ParsedStrategyLayers — kept for incremental migration */
export type ParsedStrategy = import("./strategy").ParsedStrategyLayers;

/** @deprecated Use StrategyRecord fields — legacy store shape */
export interface Strategy {
  id: string;
  pandaId: string;
  rawText: string;
  parsedJson: import("./strategy").ParsedStrategyLayers;
  strategyHash: string;
  philosophy: import("./strategy").Philosophy;
  proficiency: number;
  isActive: boolean;
  createdAt: string;
}

export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface OnboardingSurvey {
  tradingExp: string;
  style: string[];
  maxLoss: number;
  indicators: string[];
  pandaAutonomy: number;
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

export type WSEventType =
  | "TRADE_EXECUTED"
  | "EMOTION_CHANGED"
  | "DECISION_MADE"
  | "DIARY_ENTRY"
  | "MERKLE_ROOT_SUBMITTED"
  | "decision"
  | "emotion"
  | "market.tick";

export interface WSEvent {
  type: WSEventType;
  pandaId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

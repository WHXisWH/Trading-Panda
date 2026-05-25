/** Panda types — API wire + app models */

import type { Philosophy } from "./strategy";

export type EmotionState =
  | "focused"
  | "excited"
  | "greedy"
  | "cautious"
  | "panicking"
  | "numb";

export type GrowthStage =
  | "newborn"
  | "learning"
  | "experienced"
  | "master"
  | "legend"
  | "cub"
  | "growing"
  | "mature";

export type WalrusSyncStatus = "pending" | "synced" | "failed";

export interface PandaPersonality {
  boldness: number;
  patience: number;
  intuition: number;
  focus: number;
  contrarian: number;
}

export interface PandaTalent {
  id: number;
  name: string;
  description: string;
}

/** GET /api/panda/:id — wire format */
/** GET /api/panda/my list item */
export interface PandaSummaryApi {
  id: string;
  sui_object_id: string;
  name: string | null;
  personality: PandaPersonality;
  talent: Pick<PandaTalent, "id" | "name">;
  experience_level: number;
  growth_stage: GrowthStage;
  emotion_state: EmotionState;
  is_trading: boolean;
  total_trades: number;
  win_rate: number | null;
  created_at: string;
}

export interface PandaDetailApi {
  id: string;
  sui_object_id: string;
  owner_id: string;
  name: string;
  personality: PandaPersonality;
  talent: PandaTalent | null;
  experience_level: number;
  growth_stage: GrowthStage;
  emotion_state: EmotionState;
  emotion_stability: number;
  is_trading: boolean;
  current_strategy: {
    philosophy: Philosophy | string;
    proficiency: number;
  } | null;
  total_trades: number;
  win_rate: number | null;
  walrus_sync_status: WalrusSyncStatus;
  generation: number;
  active_strategy_id?: string | null;
  created_at: string;
  updated_at: string;
}

/** App-level panda (camelCase — stores / pages) */
export interface Panda {
  id: string;
  suiObjectId: string;
  name: string;
  personality: PandaPersonality & { talent: number };
  experienceLevel: number;
  growthStage: GrowthStage;
  emotionState: EmotionState;
  emotionStability?: number;
  isTrading: boolean;
  activeStrategyId: string | null;
  walrusBlobId: string | null;
  totalTrades?: number;
  winRate?: number | null;
  createdAt: string;
}

/** POST /api/panda/mint — request (register after wallet-signed mint) */
export interface PandaMintRequest {
  sui_object_id: string;
  sui_tx_digest: string;
  name?: string;
}

/** POST /api/panda/mint — response data */
export interface PandaMintResponseData {
  id: string;
  sui_object_id: string;
  sui_tx_digest: string;
  name: string | null;
  personality: PandaPersonality;
  talent: PandaTalent;
  generation: number;
  created_at: string;
}

export interface MintResult {
  pandaId: string;
  suiObjectId: string;
  name: string;
  personality: PandaPersonality;
  talent: number;
  talentName: string;
  txDigest: string;
}

/** Map API mint response → UI MintResult */
export function mintResultFromApi(data: PandaMintResponseData): MintResult {
  return {
    pandaId: data.id,
    suiObjectId: data.sui_object_id,
    name: data.name ?? "",
    personality: data.personality,
    talent: data.talent.id,
    talentName: data.talent.name,
    txDigest: data.sui_tx_digest,
  };
}

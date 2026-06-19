import { describe, expect, it } from "vitest";
import { resolveProfilePrimaryAction } from "./profileCta";
import type { AgentWalletStatusApi } from "@/types/agent-wallet";
import type { PandaDetailApi, PandaSummaryApi } from "@/types/panda";

const pandaSummary: PandaSummaryApi = {
  id: "panda-1",
  sui_object_id: "0xpanda",
  name: "Bao",
  personality: {
    boldness: 60,
    patience: 55,
    intuition: 48,
    focus: 72,
    contrarian: 35,
  },
  talent: { id: 1, name: "Steady Paw" },
  experience_level: 4,
  growth_stage: "learning",
  emotion_state: "focused",
  is_trading: false,
  total_trades: 8,
  win_rate: 0.5,
  created_at: "2026-06-18T00:00:00.000Z",
};

const pandaDetail: PandaDetailApi = {
  ...pandaSummary,
  owner_id: "user-1",
  name: "Bao",
  talent: { id: 1, name: "Steady Paw", description: "Keeps risk stable." },
  emotion_stability: 55,
  current_strategy: null,
  walrus_sync_status: "pending",
  generation: 1,
  active_strategy_id: null,
  created_at: "2026-06-18T00:00:00.000Z",
  updated_at: "2026-06-18T00:00:00.000Z",
};

const readyWallet: AgentWalletStatusApi = {
  setup_state: "ready",
  mirror_sync_status: "synced",
  vault: null,
  policy: null,
  account: null,
  authorized_agent_configured: true,
  agent_signer_address: "0xagent",
  can_start_training: true,
  launch_pairs: ["DEEP-SUI", "SUI-USDC"],
};

describe("resolveProfilePrimaryAction", () => {
  it("routes empty accounts to mint", () => {
    const action = resolveProfilePrimaryAction({ primaryPanda: null });

    expect(action.kind).toBe("mint");
    expect(action.href).toBe("/mint");
  });

  it("routes pandas without ready Agent Wallet to setup", () => {
    const action = resolveProfilePrimaryAction({
      primaryPanda: pandaSummary,
      pandaDetail,
      agentWallet: { ...readyWallet, setup_state: "no_vault", can_start_training: false },
    });

    expect(action.kind).toBe("setup_wallet");
    expect(action.href).toBe("/agent-wallet?panda=panda-1&step=no-vault");
  });

  it("routes ready wallets without strategy to Training Ledger feed drawer", () => {
    const action = resolveProfilePrimaryAction({
      primaryPanda: pandaSummary,
      pandaDetail,
      agentWallet: readyWallet,
    });

    expect(action.kind).toBe("feed_strategy");
    expect(action.href).toBe("/training-ledger/panda-1?feed=strategy");
  });

  it("routes ready pandas with active_strategy_id to Training Ledger", () => {
    const action = resolveProfilePrimaryAction({
      primaryPanda: pandaSummary,
      pandaDetail: { ...pandaDetail, active_strategy_id: "strategy-1" },
      agentWallet: readyWallet,
    });

    expect(action.kind).toBe("continue_training");
    expect(action.href).toBe("/training-ledger/panda-1");
  });

  it("routes ready pandas with current_strategy to Training Ledger", () => {
    const action = resolveProfilePrimaryAction({
      primaryPanda: pandaSummary,
      pandaDetail: {
        ...pandaDetail,
        active_strategy_id: null,
        current_strategy: { philosophy: "trend_following", proficiency: 10 },
      },
      agentWallet: readyWallet,
    });

    expect(action.kind).toBe("continue_training");
    expect(action.href).toBe("/training-ledger/panda-1");
  });
});

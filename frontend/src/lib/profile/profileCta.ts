import { hasActiveStrategy } from "@/lib/panda/hasActiveStrategy";
import { agentWalletSetupPath, trainingLedgerPath } from "@/lib/ui/routeJump";
import type { AgentWalletStatusApi } from "@/types/agent-wallet";
import type { PandaDetailApi, PandaSummaryApi } from "@/types/panda";

export type ProfilePrimaryActionKind =
  | "mint"
  | "setup_wallet"
  | "feed_strategy"
  | "continue_training";

export interface ProfilePrimaryAction {
  kind: ProfilePrimaryActionKind;
  label: string;
  href: string;
  helper: string;
}

interface ResolveProfilePrimaryActionInput {
  primaryPanda: PandaSummaryApi | null;
  pandaDetail?: PandaDetailApi | null;
  agentWallet?: AgentWalletStatusApi | null;
}

export function resolveProfilePrimaryAction({
  primaryPanda,
  pandaDetail,
  agentWallet,
}: ResolveProfilePrimaryActionInput): ProfilePrimaryAction {
  if (!primaryPanda) {
    return {
      kind: "mint",
      label: "Mint Panda",
      href: "/mint",
      helper: "Create your first Panda NFT before training.",
    };
  }

  if (!agentWallet || agentWallet.setup_state !== "ready" || !agentWallet.can_start_training) {
    return {
      kind: "setup_wallet",
      label: "Set up Agent Wallet",
      href: agentWalletSetupPath(primaryPanda.id),
      helper: "Create bounded authority before the Panda can train.",
    };
  }

  if (!hasActiveStrategy(pandaDetail)) {
    return {
      kind: "feed_strategy",
      label: "Feed Strategy",
      href: trainingLedgerPath(primaryPanda.id, { feedStrategy: true }),
      helper: "Give this Panda a strategy before starting the ledger.",
    };
  }

  return {
    kind: "continue_training",
    label: "Continue Training",
    href: trainingLedgerPath(primaryPanda.id),
    helper: "Return to the live Training Ledger.",
  };
}


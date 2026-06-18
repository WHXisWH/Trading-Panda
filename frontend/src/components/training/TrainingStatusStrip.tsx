"use client";

import { DisclosureL1 } from "@/lib/ui/disclosure";
import type { SessionPhase } from "@/hooks/useSimulationSession";
import type { MerkleRootStatus } from "@/services/trust.service";
import type { WsConnectionStatus } from "@/types/ws";

interface Props {
  phase: SessionPhase;
  pair: string;
  actorActive: boolean;
  policyVersion?: number | null;
  marketFresh?: boolean;
  wsStatus: WsConnectionStatus;
  policyPaused?: boolean;
  merkleStatus?: MerkleRootStatus | null;
}

const PHASE_LABEL: Record<SessionPhase, string> = {
  idle: "Standby",
  starting: "Starting",
  running: "Training",
  stopping: "Stopping",
  error: "Error",
};

function merkleLabel(status: MerkleRootStatus | null | undefined): string {
  if (!status) return "Merkle —";
  if (status.chain_status === "submitted") {
    return `Merkle batch #${status.batch_index} on-chain`;
  }
  return `Merkle batch #${status.batch_index} pending`;
}

export function TrainingStatusStrip({
  phase,
  pair,
  actorActive,
  policyVersion,
  marketFresh = true,
  wsStatus,
  policyPaused = false,
  merkleStatus,
}: Props) {
  const merkleOnChain = merkleStatus?.chain_status === "submitted";

  const items = [
    {
      label: "Phase",
      value: PHASE_LABEL[phase],
      tone: phase === "running" ? "pass" as const : phase === "error" ? "danger" as const : "default" as const,
    },
    { label: "Pair", value: pair },
    {
      label: "Market",
      value: marketFresh ? "Fresh" : "Stale",
      tone: marketFresh ? "pass" as const : "warn" as const,
    },
    {
      label: "Actor",
      value: actorActive ? "Online" : "Offline",
      tone: actorActive ? "pass" as const : "default" as const,
    },
    ...(policyVersion != null
      ? [{ label: "Policy", value: `v${policyVersion}` }]
      : []),
    ...(policyPaused
      ? [{ label: "Policy", value: "Paused", tone: "danger" as const }]
      : []),
    {
      label: "Merkle",
      value: merkleLabel(merkleStatus).replace("Merkle ", ""),
      tone: merkleStatus ? (merkleOnChain ? "pass" as const : "warn" as const) : "default" as const,
    },
    { label: "WS", value: wsStatus },
  ];

  return (
    <div className="space-y-2">
      <DisclosureL1 items={items} />
      {merkleStatus?.sui_tx_digest ? (
        <p
          className="text-[10px] text-product-muted"
          title={`Root ${merkleStatus.root_hash.slice(0, 12)}… · ${merkleStatus.trade_count} facts`}
        >
          Trade Fact Merkle batches anchor every 50 executions
        </p>
      ) : null}
    </div>
  );
}

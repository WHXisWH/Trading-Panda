"use client";

import { clsx } from "clsx";
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
  idle: "待机",
  starting: "启动中",
  running: "训练中",
  stopping: "停止中",
  error: "异常",
};

function merkleLabel(status: MerkleRootStatus | null | undefined): string {
  if (!status) return "Merkle: —";
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

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-paper-card px-4 py-2 text-[12px]">
      <span className="font-semibold text-neutral-900">Training Ledger</span>
      <span className="rounded-full bg-neutral-100 px-2 py-0.5">{PHASE_LABEL[phase]}</span>
      <span className="text-neutral-600">Pair: {pair}</span>
      <span className={clsx(marketFresh ? "text-emerald-600" : "text-amber-600")}>
        Market: {marketFresh ? "fresh" : "stale"}
      </span>
      <span className={clsx(actorActive ? "text-emerald-600" : "text-neutral-500")}>
        Actor: {actorActive ? "online" : "offline"}
      </span>
      {policyVersion != null ? (
        <span className="text-neutral-600">Policy v{policyVersion}</span>
      ) : null}
      {policyPaused ? (
        <span className="font-medium text-red-600">Policy paused</span>
      ) : null}
      <span
        className={clsx(
          merkleStatus ? (merkleOnChain ? "text-emerald-600" : "text-amber-600") : "text-neutral-500",
        )}
        title={
          merkleStatus?.sui_tx_digest
            ? `Root ${merkleStatus.root_hash.slice(0, 12)}… · ${merkleStatus.trade_count} facts`
            : "Trade Fact Merkle batches anchor every 50 executions"
        }
      >
        {merkleLabel(merkleStatus)}
      </span>
      <span className="ml-auto text-neutral-500">WS: {wsStatus}</span>
    </div>
  );
}

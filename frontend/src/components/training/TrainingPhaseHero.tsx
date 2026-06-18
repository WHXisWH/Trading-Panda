"use client";

import { clsx } from "clsx";
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

const PHASE_HEADLINES: Record<SessionPhase, string> = {
  idle: "Standby",
  starting: "Starting",
  running: "Training",
  stopping: "Stopping",
  error: "Error",
};

const PHASE_SUBTITLES: Record<SessionPhase, string> = {
  idle: "DeepBook ticks are live — start training when pre-flight checks pass.",
  starting: "Spinning up the Panda actor and syncing policy gates.",
  running: "Paper ledger is mutating on every policy-approved OrderIntent.",
  stopping: "Draining the actor and persisting the latest ledger snapshot.",
  error: "Training halted — check wallet, policy, and market connectivity.",
};

const PHASE_COLORS: Record<SessionPhase, string> = {
  idle: "text-product-muted",
  starting: "text-product-amber",
  running: "text-product-green",
  stopping: "text-product-amber",
  error: "text-product-red",
};

function merkleLabel(status: MerkleRootStatus | null | undefined): string {
  if (!status) return "—";
  if (status.chain_status === "submitted") {
    return `batch #${status.batch_index} on-chain`;
  }
  return `batch #${status.batch_index} pending`;
}

export function TrainingPhaseHero({
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
      label: "Pair",
      value: pair,
    },
    {
      label: "Market",
      value: marketFresh ? "Fresh" : "Stale",
      tone: marketFresh ? ("pass" as const) : ("warn" as const),
    },
    {
      label: "Actor",
      value: actorActive ? "Online" : "Offline",
      tone: actorActive ? ("pass" as const) : ("default" as const),
    },
    ...(policyVersion != null
      ? [{ label: "Policy", value: `v${policyVersion}` }]
      : []),
    ...(policyPaused
      ? [{ label: "Policy", value: "Paused", tone: "danger" as const }]
      : []),
    {
      label: "Merkle",
      value: merkleLabel(merkleStatus),
      tone: merkleStatus ? (merkleOnChain ? ("pass" as const) : ("warn" as const)) : ("default" as const),
    },
    { label: "WS", value: wsStatus },
  ];

  return (
    <div
      className={clsx(
        "ledger-hero px-5 py-5 md:px-6 md:py-6",
        phase === "running" && "ledger-hero--running",
        phase === "error" && "ledger-hero--error",
      )}
    >
      <p
        className={clsx(
          "font-mono text-[10px] font-extrabold uppercase tracking-[0.12em]",
          phase === "running" ? "text-product-green/90" : "text-product-gold/80",
        )}
      >
        Live phase
      </p>
      <p
        className={clsx(
          "mt-2 font-sans text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[0.95] tracking-[-0.04em]",
          PHASE_COLORS[phase],
        )}
      >
        {PHASE_HEADLINES[phase]}
      </p>
      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[#c8dcc8]/90">
        {PHASE_SUBTITLES[phase]}
      </p>

      <div className="mt-5">
        <DisclosureL1
          className="ledger-status-pills border-0 bg-transparent px-0 py-0"
          items={items}
        />
      </div>

      {merkleStatus?.sui_tx_digest ? (
        <p
          className="mt-3 text-[10px] text-product-muted/85"
          title={`Root ${merkleStatus.root_hash.slice(0, 12)}… · ${merkleStatus.trade_count} facts`}
        >
          Trade Fact Merkle batches anchor every 50 executions
        </p>
      ) : null}
    </div>
  );
}

/** @deprecated Use TrainingPhaseHero — kept for imports that still reference the strip. */
export function TrainingStatusStrip(props: Props) {
  return <TrainingPhaseHero {...props} />;
}
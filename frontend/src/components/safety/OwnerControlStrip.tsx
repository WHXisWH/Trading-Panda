"use client";

import { DisclosureL1, TruncatedEvidence } from "@/lib/ui/disclosure";
import type { SafetyStatusApi } from "@/types/safety";

interface Props {
  status: SafetyStatusApi;
}

function truncateAddress(addr: string | null | undefined): string {
  if (!addr) return "—";
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function OwnerControlStrip({ status }: Props) {
  const policyTone =
    status.policy?.paused
      ? "danger"
      : status.risk_status === "active"
        ? "pass"
        : status.risk_status === "tightened"
          ? "warn"
          : "default";

  return (
    <div className="space-y-3">
      <DisclosureL1
        className="border-0 bg-transparent px-0 py-0"
        items={[
          {
            label: "Policy",
            value: `v${status.policy?.version ?? "—"}`,
            tone: policyTone as "pass" | "warn" | "danger" | "default",
          },
          {
            label: "Mirror",
            value: status.mirror_sync_status,
            tone: status.mirror_synced ? "pass" : "warn",
          },
          {
            label: "Agent signer",
            value: status.agent_signer_address ? "Configured" : "None",
            tone: status.agent_signer_address ? "default" : "warn",
          },
          {
            label: "Pending proofs",
            value: String(status.pending_job_count),
            tone: status.pending_job_count > 0 ? "warn" : "default",
          },
        ]}
      />
      {status.policy?.sui_object_id ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TruncatedEvidence label="TradingPolicy object" value={status.policy.sui_object_id} />
          {status.agent_signer_address ? (
            <TruncatedEvidence
              label="Authorized agent"
              value={truncateAddress(status.agent_signer_address)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import type { PolicyDraft } from "@/types/agent-wallet";

interface PolicyPreviewSummaryProps {
  draft: PolicyDraft;
  agentAddress: string | null;
}

export function PolicyPreviewSummary({ draft, agentAddress }: PolicyPreviewSummaryProps) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 p-4 text-[13px]">
      <p className="font-medium text-neutral-800">Collar preview</p>
      <ul className="mt-2 space-y-1 text-neutral-600">
        <li>Pairs: {draft.allowedPairs.join(", ") || "none selected"}</li>
        <li>Max order: {draft.maxNotionalPerTrade} training units</li>
        <li>Daily loss cap: {draft.maxDailyLoss}%</li>
        <li>Proof: {draft.proofMode === "manual" ? "manual first" : "auto when eligible"}</li>
        <li>Signer: {agentAddress ? `${agentAddress.slice(0, 10)}…` : "server not configured"}</li>
      </ul>
    </div>
  );
}

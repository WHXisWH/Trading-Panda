"use client";

import type { PolicyDraft } from "@/types/agent-wallet";
import { formatPaperUsd } from "@/lib/agentWallet/paperUsd";

interface PolicyPreviewSummaryProps {
  draft: PolicyDraft;
  agentAddress: string | null;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="product-metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function PolicyPreviewSummary({ draft, agentAddress }: PolicyPreviewSummaryProps) {
  return (
    <aside className="rounded-[18px] border border-product-line/80 bg-white/[0.035] p-4">
      <div className="flex items-baseline justify-between gap-3 border-b border-product-line/40 pb-3">
        <span className="font-mono text-[10px] font-black uppercase tracking-wider text-product-green">
          Collar preview
        </span>
        <span className="font-mono text-[10px] text-product-muted">v1 candidate</span>
      </div>

      <div className="pt-1">
        <MetricRow label="Training budget (USD)" value={formatPaperUsd(draft.trainingBudget)} />
        <MetricRow label="Pairs" value={draft.allowedPairs.join(", ") || "none selected"} />
        <MetricRow label="Max order (USD)" value={formatPaperUsd(draft.maxNotionalPerTrade)} />
        <MetricRow label="Daily loss cap" value={`${draft.maxDailyLoss}%`} />
        <MetricRow
          label="Proof"
          value={draft.proofMode === "manual" ? "manual first" : "auto when eligible"}
        />
        <MetricRow
          label="Signer"
          value={agentAddress ? `${agentAddress.slice(0, 10)}…` : "server not configured"}
        />
      </div>
    </aside>
  );
}

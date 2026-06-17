"use client";

import type { ChainProofEligibilityApi } from "@/types/autonomous-wallet";

interface ProofEligibilityPanelProps {
  eligibility: ChainProofEligibilityApi;
}

export function ProofEligibilityPanel({ eligibility }: ProofEligibilityPanelProps) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] p-4">
      <h2 className="text-[13px] font-semibold text-neutral-200">Proof eligibility</h2>
      {!eligibility.chain_proof_enabled ? (
        <p className="mt-2 text-[12px] text-amber-400/90">
          Mode 2 is disabled on this server (`CHAIN_PROOF_ENABLED=false`).
        </p>
      ) : null}
      {eligibility.eligible ? (
        <p className="mt-2 text-[12px] text-emerald-400/90">
          This Trade Fact can become a testnet PandaCoin PTB under the active TradingPolicy.
          {eligibility.score_bypassed ? " Manual proof bypassed the score threshold." : ""}
        </p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-neutral-400">
          {eligibility.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChainProof } from "@/hooks/useChainProof";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import { DisclosureL0 } from "@/lib/ui/disclosure";
import { trainingLedgerPath } from "@/lib/ui/routeJump";
import { Button } from "@/components/ui/Button";
import { ProofConfirmModal } from "@/components/chain-proof/ProofConfirmModal";
import { ProofDetailsDrawer } from "@/components/chain-proof/ProofDetailsDrawer";
import { ProofEligibilityPanel } from "@/components/chain-proof/ProofEligibilityPanel";
import { ProofFailureState } from "@/components/chain-proof/ProofFailureState";
import { ProofJobTimeline } from "@/components/chain-proof/ProofJobTimeline";
import { TradeFactHeader } from "@/components/chain-proof/TradeFactHeader";
import { TxDigestCard } from "@/components/chain-proof/TxDigestCard";

export default function ChainProofPageClient() {
  const searchParams = useSearchParams();
  const pandaId = searchParams.get("panda");
  const tradeFactId = searchParams.get("fact");
  const { jwt } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { status, isLoading, error, requestProof, isRequesting } = useChainProof(
    jwt,
    pandaId,
    tradeFactId,
  );

  if (!pandaId || !tradeFactId) {
    return (
      <ProductPageShell density="high" className="py-12 text-center text-[13px] text-product-muted">
        Open this page from Training Ledger with a selected Trade Fact (
        <code className="text-product-gold">?panda=…&fact=…</code>).
      </ProductPageShell>
    );
  }

  if (isLoading) {
    return (
      <ProductPageShell density="high" className="py-12 text-center text-[13px] text-product-muted">
        Loading Chain Proof console…
      </ProductPageShell>
    );
  }

  if (error || !status) {
    return (
      <ProductPageShell density="high" className="py-12 text-center text-[13px] text-product-red">
        {(error as Error)?.message ?? "Could not load Chain Proof status"}
      </ProductPageShell>
    );
  }

  const confirmed = status.chain_execution.status === "confirmed";
  const failed = status.chain_execution.status === "failed";
  const canProve =
    status.eligibility.eligible &&
    !confirmed &&
    !isRequesting &&
    (status.chain_execution.status === "not_requested" ||
      status.chain_execution.status === "eligible" ||
      (failed && status.chain_execution.retryable));

  return (
    <ProductPageShell density="high" className="space-y-6">
      <DisclosureL0
        eyebrow="Chain Proof"
        title="Proof console"
        description="Submit a selected Trade Fact as a testnet PandaCoin PTB. Training Ledger PnL never rolls back on proof failure."
      />

      <TradeFactHeader status={status} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <ProofEligibilityPanel eligibility={status.eligibility} />
          <ProofJobTimeline steps={status.proof_job.timeline} />
          <section className="rounded-xl border border-[var(--color-border)] p-4 text-[12px] text-neutral-400">
            <h2 className="text-[13px] font-semibold text-neutral-200">Agent Signer</h2>
            <p className="mt-2">{status.agent_signer.scope}</p>
            <p className="mt-1 font-mono text-[11px] text-neutral-500">
              {status.agent_signer.configured
                ? status.agent_signer.address
                : "Not configured on server"}
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-[var(--color-border)] p-4">
            <h2 className="text-[13px] font-semibold text-neutral-200">PTB preview</h2>
            <p className="mt-2 text-[12px] text-neutral-400">
              PandaVault + TradingPolicy v{status.chain_execution.policy_version} → PandaCoin demo
              mutation via <span className="font-mono">chain_proof_executor</span>
            </p>
            <p className="mt-2 font-mono text-[11px] text-neutral-500">
              vault {status.objects.vault_object_id_short ?? "—"} · policy{" "}
              {status.objects.policy_object_id_short ?? "—"}
            </p>
          </section>

          <TxDigestCard chainExecution={status.chain_execution} />
          <ProofFailureState
            message={failed ? status.chain_execution.error_message : null}
            retryable={status.chain_execution.retryable}
            onRetry={() => setConfirmOpen(true)}
            isRetrying={isRequesting}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          disabled={!canProve}
          onClick={() => setConfirmOpen(true)}
          title={!status.eligibility.eligible ? status.eligibility.reasons[0] : undefined}
        >
          Prove on-chain
        </Button>
        <Button size="lg" variant="outline" onClick={() => setDetailsOpen(true)}>
          View proof details
        </Button>
        <Link href={trainingLedgerPath(pandaId)}>
          <Button size="lg" variant="outline">
            Back to Training
          </Button>
        </Link>
      </div>

      <ProofConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        agentAddress={status.agent_signer.address}
        isSubmitting={isRequesting}
        onConfirm={() => {
          setConfirmOpen(false);
          requestProof();
        }}
      />
      <ProofDetailsDrawer open={detailsOpen} onOpenChange={setDetailsOpen} status={status} />
    </ProductPageShell>
  );
}

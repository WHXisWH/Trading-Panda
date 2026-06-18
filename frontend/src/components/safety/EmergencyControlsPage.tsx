"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PausePolicyCard,
  RevokeAgentCard,
  TightenLimitsCard,
} from "@/components/safety/SafetyActionCards";
import { OwnerSignatureModal } from "@/components/safety/OwnerSignatureModal";
import { PendingJobsWarning } from "@/components/safety/PendingJobsWarning";
import {
  PolicyResultPanel,
  TightenLimitsDrawer,
} from "@/components/safety/PolicyResultPanel";
import { RiskStatusBanner } from "@/components/safety/RiskStatusBanner";
import { DisclosureL0 } from "@/lib/ui/disclosure";
import { agentWalletSetupPath, trainingLedgerPath } from "@/lib/ui/routeJump";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useSafetyControls } from "@/hooks/useSafetyControls";
import { DEFAULT_POLICY_DRAFT, type PolicyDraft } from "@/types/agent-wallet";

interface Props {
  pandaId: string;
}

export function EmergencyControlsPage({ pandaId }: Props) {
  const { jwt } = useAuth();
  const [tightenDraft, setTightenDraft] = useState<PolicyDraft>(DEFAULT_POLICY_DRAFT);
  const [currentDraft, setCurrentDraft] = useState<PolicyDraft>(DEFAULT_POLICY_DRAFT);

  const controls = useSafetyControls(jwt, pandaId, tightenDraft, currentDraft);
  const status = controls.status;

  useEffect(() => {
    if (!status?.policy) return;
    const next: PolicyDraft = {
      trainingBudget: status.vault?.training_budget ?? DEFAULT_POLICY_DRAFT.trainingBudget,
      allowedPairs: status.policy.allowed_pairs,
      maxNotionalPerTrade: status.policy.max_notional_per_trade,
      maxDailyLoss: status.policy.max_daily_loss,
      maxOpenPositions: status.policy.max_open_positions,
      cooldownMs: 0,
      maxProofsPerDay: 10,
      proofMode: "manual",
    };
    setCurrentDraft(next);
    setTightenDraft(next);
  }, [status?.policy]);

  const isPaused = useMemo(
    () => status?.risk_status === "paused" || Boolean(status?.policy?.paused),
    [status],
  );

  if (!status) {
    return <div className="py-12 text-center text-[13px] text-product-muted">Loading safety…</div>;
  }

  const noWallet = status.risk_status === "no_wallet";

  return (
    <div className="space-y-6">
      <DisclosureL0
        eyebrow="Safety"
        title="Emergency controls"
        description="Stop, revoke, or tighten your Panda's autonomous execution boundary immediately."
      />

      {controls.errorMessage ? (
        <div className="rounded-lg border border-product-red/40 bg-product-red/10 px-4 py-2 text-[13px] text-product-red">
          {controls.errorMessage}
        </div>
      ) : null}

      <RiskStatusBanner
        status={status.risk_status}
        policyVersion={status.policy?.version}
        mirrorSyncStatus={status.mirror_sync_status}
      />

      {noWallet ? (
        <div className="rounded-xl border border-product-line bg-product-panel p-6 text-center">
          <p className="text-[13px] text-product-muted">
            Create Agent Wallet before using safety controls.
          </p>
          <Link href={agentWalletSetupPath(pandaId)} className="mt-4 inline-block">
            <Button>Go to Agent Wallet</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <PausePolicyCard
              title={isPaused ? "Resume policy" : "Pause policy"}
              consequence={
                isPaused
                  ? "Resume Training Ledger when market and strategy are healthy."
                  : "Immediate stop for paper execution and queued Chain Proof jobs."
              }
              detail="Reviews can still complete. The Panda cannot unpause itself."
              actionLabel={isPaused ? "Resume execution" : "Pause now"}
              onAction={() => controls.openAction(isPaused ? "unpause" : "pause")}
              disabled={controls.isLoading || (!status.can_pause && !status.can_unpause)}
              danger={!isPaused}
            />
            <RevokeAgentCard
              title="Revoke agent"
              consequence="Disable testnet Agent Signer for Chain Proof."
              detail="Also pauses policy. Cannot be undone without new Agent Wallet setup."
              actionLabel="Revoke authorized agent"
              onAction={() => controls.openAction("revoke")}
              disabled={controls.isLoading || !status.can_revoke}
            />
            <TightenLimitsCard
              onAction={() => controls.openAction("tighten")}
              disabled={controls.isLoading || !status.can_tighten}
            />
          </div>

          <PendingJobsWarning
            jobs={status.pending_chain_proof_jobs}
            onViewDetails={() => controls.setResultDrawerOpen(true)}
          />

          <Link href={trainingLedgerPath(pandaId)}>
            <Button variant="outline">Back to Training</Button>
          </Link>
        </>
      )}

      <TightenLimitsDrawer
        open={controls.tightenDrawerOpen}
        onOpenChange={controls.setTightenDrawerOpen}
        maxNotional={tightenDraft.maxNotionalPerTrade}
        maxDailyLoss={tightenDraft.maxDailyLoss}
        ceilingMaxNotional={currentDraft.maxNotionalPerTrade}
        ceilingMaxDailyLoss={currentDraft.maxDailyLoss}
        onMaxNotionalChange={(v: number) =>
          setTightenDraft((d) => ({ ...d, maxNotionalPerTrade: v }))
        }
        onMaxDailyLossChange={(v: number) => setTightenDraft((d) => ({ ...d, maxDailyLoss: v }))}
        onConfirm={() => controls.executeOwnerAction("tighten", tightenDraft)}
        loading={controls.isLoading}
      />

      <OwnerSignatureModal
        open={controls.signModalOpen}
        onOpenChange={controls.setSignModalOpen}
        action={controls.pendingAction === "tighten" ? null : controls.pendingAction}
        loading={controls.isLoading}
        onConfirm={() => {
          if (controls.pendingAction) {
            void controls.executeOwnerAction(controls.pendingAction);
          }
        }}
      />

      <PolicyResultPanel
        open={controls.resultDrawerOpen}
        onOpenChange={controls.setResultDrawerOpen}
        status={
          status.policy
            ? {
                setup_state: "ready",
                mirror_sync_status: status.mirror_sync_status,
                vault: status.vault,
                policy: status.policy,
                account: null,
                authorized_agent_configured: Boolean(status.agent_signer_address),
                agent_signer_address: status.agent_signer_address,
                can_start_training: false,
                launch_pairs: status.launch_pairs,
              }
            : null
        }
        txDigest={controls.lastTxDigest}
        pandaId={pandaId}
      />
    </div>
  );
}

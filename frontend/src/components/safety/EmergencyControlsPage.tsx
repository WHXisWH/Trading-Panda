"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OwnerSignatureModal } from "@/components/safety/OwnerSignatureModal";
import { OwnerControlStrip } from "@/components/safety/OwnerControlStrip";
import {
  PolicyResultPanel,
  TightenLimitsDrawer,
} from "@/components/safety/PolicyResultPanel";
import { PendingJobsStrip } from "@/components/safety/PendingJobsStrip";
import { RiskStatusHero } from "@/components/safety/RiskStatusHero";
import { SafetyActionDeck } from "@/components/safety/SafetyActionDeck";
import { SafetyConsequencePanel } from "@/components/safety/SafetyConsequencePanel";
import { SafetyPageSkeleton } from "@/components/safety/SafetyPageSkeleton";
import { DisclosureL0 } from "@/lib/ui/disclosure";
import { agentWalletSetupPath } from "@/lib/ui/routeJump";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useSafetyControls, type SafetyActionKind } from "@/hooks/useSafetyControls";
import { DEFAULT_POLICY_DRAFT, type PolicyDraft } from "@/types/agent-wallet";

interface Props {
  pandaId: string;
}

export function EmergencyControlsPage({ pandaId }: Props) {
  const { jwt } = useAuth();
  const [tightenDraft, setTightenDraft] = useState<PolicyDraft>(DEFAULT_POLICY_DRAFT);
  const [currentDraft, setCurrentDraft] = useState<PolicyDraft>(DEFAULT_POLICY_DRAFT);
  const [highlightedAction, setHighlightedAction] = useState<SafetyActionKind | null>(null);

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
  }, [status?.policy, status?.vault?.training_budget]);

  const isPaused = useMemo(
    () => status?.risk_status === "paused" || Boolean(status?.policy?.paused),
    [status],
  );

  const handleSelectAction = (action: SafetyActionKind) => {
    setHighlightedAction(action);
  };

  const handleSignFromPanel = () => {
    if (!highlightedAction || highlightedAction === "tighten") return;
    controls.openAction(highlightedAction);
  };

  if (controls.isStatusLoading || !status) {
    return <SafetyPageSkeleton />;
  }

  const noWallet = status.risk_status === "no_wallet";
  const controlsBusy = controls.isLoading;

  return (
    <div className="space-y-6">
      <DisclosureL0
        eyebrow="Safety"
        title="Emergency controls"
        description="Stop, revoke, or tighten your Panda's autonomous execution boundary immediately."
      />

      {controls.errorMessage ? (
        <div className="rounded-xl border border-product-red/40 bg-product-red/10 px-4 py-2 text-[13px] text-product-red">
          {controls.errorMessage}
        </div>
      ) : null}

      <RiskStatusHero status={status.risk_status} pandaId={noWallet ? undefined : pandaId} />

      {noWallet ? (
        <div className="product-panel p-6 text-center">
          <p className="text-[13px] text-product-muted">
            Create Agent Wallet before using safety controls.
          </p>
          <Link href={agentWalletSetupPath(pandaId)} className="mt-4 inline-block">
            <Button>Go to Agent Wallet</Button>
          </Link>
        </div>
      ) : (
        <>
          <OwnerControlStrip status={status} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <SafetyConsequencePanel
              status={status}
              highlightedAction={highlightedAction}
              currentDraft={currentDraft}
              tightenDraft={tightenDraft}
              isPaused={isPaused}
              onSign={handleSignFromPanel}
              onEditTighten={() => controls.setTightenDrawerOpen(true)}
              signDisabled={
                controlsBusy ||
                (highlightedAction === "pause" && !status.can_pause) ||
                (highlightedAction === "unpause" && !status.can_unpause) ||
                (highlightedAction === "revoke" && !status.can_revoke)
              }
            />

            <SafetyActionDeck
              isPaused={isPaused}
              highlightedAction={highlightedAction}
              canPause={status.can_pause}
              canUnpause={status.can_unpause}
              canRevoke={status.can_revoke}
              canTighten={status.can_tighten}
              disabled={controlsBusy}
              onSelect={handleSelectAction}
            />
          </div>

          <PendingJobsStrip
            jobs={status.pending_chain_proof_jobs}
            onViewDetails={() => controls.setResultDrawerOpen(true)}
          />
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
        loading={controlsBusy}
      />

      <OwnerSignatureModal
        open={controls.signModalOpen}
        onOpenChange={controls.setSignModalOpen}
        action={
          controls.pendingAction === "tighten" ? null : controls.pendingAction
        }
        loading={controlsBusy}
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

"use client";

import { useEffect } from "react";
import { AgentWalletDetailsDrawer } from "@/components/agent-wallet/AgentWalletDetailsDrawer";
import { AgentWalletPageSkeleton } from "@/components/agent-wallet/AgentWalletPageSkeleton";
import { AuthorizedAgentReview } from "@/components/agent-wallet/AuthorizedAgentReview";
import { PandaPermissionCard } from "@/components/agent-wallet/PandaPermissionCard";
import { PolicyCollarEditor } from "@/components/agent-wallet/PolicyCollarEditor";
import { PolicyPreviewSummary } from "@/components/agent-wallet/PolicyPreviewSummary";
import { WalletSignatureModal } from "@/components/mint/WalletSignatureModal";
import { DisclosureL0, DisclosureL1 } from "@/lib/ui/disclosure";
import { Button } from "@/components/ui/Button";
import { useAgentWallet } from "@/hooks/useAgentWallet";
import type { PandaSummaryApi } from "@/types/panda";

interface AgentWalletPageProps {
  jwt: string | null;
  panda: PandaSummaryApi;
}

export function AgentWalletPageContent({ jwt, panda }: AgentWalletPageProps) {
  const wallet = useAgentWallet(jwt, panda.id, panda.sui_object_id);
  const isReady = wallet.status?.setup_state === "ready";
  const hasVault = Boolean(wallet.status?.vault?.sui_object_id);
  const editorLocked = wallet.step === "signing" || wallet.isSetupPending || isReady;
  const setupStatusMessage =
    wallet.setupPhase === "preparing"
      ? "Preparing PandaVault + Policy transaction…"
      : wallet.setupPhase === "awaiting_wallet"
        ? "Confirm the transaction in your wallet."
        : wallet.setupPhase === "syncing"
          ? "Chain setup submitted — syncing backend mirror…"
          : null;

  useEffect(() => {
    if (!wallet.toast) return;
    const t = window.setTimeout(() => wallet.setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [wallet]);

  if (wallet.isStatusLoading) {
    return <AgentWalletPageSkeleton message="Loading policy collar…" />;
  }

  return (
    <div className="space-y-6">
      <DisclosureL0
        eyebrow="Agent Wallet Setup"
        title="Create Agent Wallet"
        description="Give your Panda a bounded training collar. PandaVault holds the ledger boundary; TradingPolicy enforces risk limits on-chain and off-chain."
      />

      <DisclosureL1
        className="agent-wallet-status-strip px-3.5 py-2.5"
        items={[
          {
            label: "Setup",
            value: isReady ? "Ready" : hasVault ? "Active" : "Draft",
            tone: isReady ? "pass" : "default",
          },
          {
            label: "Mirror",
            value: wallet.status?.mirror_sync_status ?? "pending",
            tone: wallet.status?.mirror_sync_status === "synced" ? "pass" : "warn",
          },
        ]}
      />

      {setupStatusMessage ? (
        <div className="agent-wallet-alert agent-wallet-alert--amber">{setupStatusMessage}</div>
      ) : null}
      {wallet.toast ? (
        <div className="agent-wallet-alert agent-wallet-alert--green">{wallet.toast}</div>
      ) : null}
      {wallet.errorMessage ? (
        <div className="agent-wallet-alert agent-wallet-alert--red">
          {wallet.errorMessage}
          {wallet.txDigest && !hasVault ? (
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => wallet.retrySync()}
            >
              Retry mirror sync
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <PandaPermissionCard
          panda={panda}
          status={wallet.status}
          onViewObjects={() => wallet.setDetailsOpen(true)}
        />

        <section className="agent-wallet-card space-y-6 p-5 md:p-6">
          {isReady ? (
            <div className="space-y-5">
              <PolicyCollarEditor
                draft={wallet.draft}
                onChange={wallet.setDraft}
                launchPairs={wallet.launchPairs}
                fieldErrors={wallet.fieldErrors}
                disabled={wallet.isSavingBudget || wallet.isSetupPending}
                mode="budget"
              />
              <PolicyPreviewSummary draft={wallet.draft} agentAddress={wallet.agentAddress} />
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="agent-wallet-btn-primary"
                  loading={wallet.isSavingBudget}
                  disabled={wallet.isSavingBudget || wallet.isSetupPending}
                  onClick={() => wallet.saveTrainingBudget()}
                >
                  Update training budget
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <PolicyCollarEditor
                draft={wallet.draft}
                onChange={wallet.setDraft}
                launchPairs={wallet.launchPairs}
                fieldErrors={wallet.fieldErrors}
                disabled={editorLocked || wallet.isSavingBudget}
              />
              <PolicyPreviewSummary draft={wallet.draft} agentAddress={wallet.agentAddress} />
              <div className="agent-wallet-divider flex flex-wrap gap-3 pt-5">
                {!wallet.hasChainSigner ? (
                  <p className="w-full text-[12px] text-product-amber">
                    Connect a Sui wallet or sign in with Google to approve on-chain setup.
                  </p>
                ) : null}
                {!wallet.agentAddress ? (
                  <p className="w-full text-[12px] text-product-amber">
                    Server agent signer is not configured. Set{" "}
                    <span className="font-mono">AGENT_SIGNER_ADDRESS</span> on the backend to
                    continue.
                  </p>
                ) : null}
                <Button
                  size="lg"
                  className="agent-wallet-btn-primary"
                  loading={wallet.isValidating || wallet.isSetupPending}
                  disabled={
                    wallet.isValidating ||
                    wallet.isSetupPending ||
                    wallet.isSavingBudget ||
                    !wallet.agentAddress ||
                    !wallet.hasChainSigner
                  }
                  onClick={() => wallet.openReview()}
                >
                  {wallet.isValidating ? "Checking setup…" : "Confirm training setup"}
                </Button>
                {hasVault ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="agent-wallet-btn-secondary"
                    onClick={() => wallet.setDetailsOpen(true)}
                  >
                    View objects
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>

      <AuthorizedAgentReview
        open={wallet.reviewOpen}
        onOpenChange={wallet.setReviewOpen}
        agentAddress={wallet.agentAddress}
        draft={wallet.draft}
        onConfirm={wallet.startSigning}
      />

      <WalletSignatureModal
        open={wallet.signModalOpen}
        onOpenChange={(open) => (open ? wallet.setSignModalOpen(true) : wallet.closeSignModal())}
        title="Create PandaVault + Policy"
        description="Sign to create shared PandaVault and TradingPolicy objects on Sui testnet."
        confirmLabel="Approve setup"
        gasVariant="agent-wallet"
        onConfirm={() => void wallet.executeSetup()}
      />

      <AgentWalletDetailsDrawer
        open={wallet.detailsOpen}
        onOpenChange={wallet.setDetailsOpen}
        status={wallet.status}
        txDigest={wallet.txDigest}
      />
    </div>
  );
}

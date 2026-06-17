"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AgentWalletDetailsDrawer } from "@/components/agent-wallet/AgentWalletDetailsDrawer";
import { AuthorizedAgentReview } from "@/components/agent-wallet/AuthorizedAgentReview";
import { PandaPermissionCard } from "@/components/agent-wallet/PandaPermissionCard";
import { PolicyCollarEditor } from "@/components/agent-wallet/PolicyCollarEditor";
import { PolicyPreviewSummary } from "@/components/agent-wallet/PolicyPreviewSummary";
import { WalletSignatureModal } from "@/components/mint/WalletSignatureModal";
import { DisclosureL0, DisclosureL1 } from "@/lib/ui/disclosure";
import { safetyPath, strategyPath, trainingLedgerPath } from "@/lib/ui/routeJump";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
  const editorLocked = wallet.step === "signing" || isReady;

  useEffect(() => {
    if (!wallet.toast) return;
    const t = window.setTimeout(() => wallet.setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [wallet]);

  return (
    <div className="space-y-6">
      <DisclosureL0
        eyebrow="Agent Wallet Setup"
        title="Create Agent Wallet"
        description="Give your Panda a bounded training collar. PandaVault holds the ledger boundary; TradingPolicy enforces risk limits on-chain and off-chain."
      />

      <DisclosureL1
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

      {wallet.toast ? (
        <div className="rounded-xl border border-product-green/30 bg-product-green/10 px-4 py-2 text-[13px] text-product-green">
          {wallet.toast}
        </div>
      ) : null}
      {wallet.errorMessage ? (
        <div className="rounded-xl border border-product-red/40 bg-product-red/10 px-4 py-2 text-[13px] text-product-red">
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
        <PandaPermissionCard panda={panda} status={wallet.status} />

        <Card className="space-y-6 p-5 md:p-6">
          {isReady ? (
            <div className="space-y-5">
              <p className="text-[13px] text-product-muted">
                PandaVault and TradingPolicy are active. Mirror status:{" "}
                <strong className="text-product-text">{wallet.status?.mirror_sync_status}</strong>
              </p>
              <PolicyPreviewSummary draft={wallet.draft} agentAddress={wallet.agentAddress} />
              <div className="flex flex-wrap gap-3">
                <Link href={strategyPath(panda.id)}>
                  <Button size="lg">Feed strategy</Button>
                </Link>
                <Link href={trainingLedgerPath(panda.id)}>
                  <Button size="lg" variant="outline">
                    Training Ledger
                  </Button>
                </Link>
                <Link href={safetyPath(panda.id)}>
                  <Button size="sm" variant="ghost">
                    Safety
                  </Button>
                </Link>
                <Button size="lg" variant="outline" onClick={() => wallet.setDetailsOpen(true)}>
                  View objects
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
                disabled={editorLocked || wallet.isLoading}
              />
              <PolicyPreviewSummary draft={wallet.draft} agentAddress={wallet.agentAddress} />
              <div className="flex flex-wrap gap-3 border-t border-product-line/40 pt-5">
                <Button
                  size="lg"
                  disabled={wallet.isLoading || !wallet.agentAddress}
                  onClick={() => wallet.openReview()}
                >
                  Review Agent Signer
                </Button>
                {hasVault ? (
                  <Button size="lg" variant="outline" onClick={() => wallet.setDetailsOpen(true)}>
                    View objects
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </Card>
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
        onOpenChange={wallet.setSignModalOpen}
        title="Create PandaVault + Policy"
        description="Sign to create shared PandaVault and TradingPolicy objects on Sui testnet."
        confirmLabel={wallet.isLoading ? "Signing…" : "Approve setup"}
        loading={wallet.isLoading}
        onConfirm={wallet.executeSetup}
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

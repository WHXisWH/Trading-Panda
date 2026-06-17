"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toastFailedSafely, toastSubmitted, toastSuccess } from "@/lib/ui/productToast";
import { useAuth } from "@/hooks/useAuth";
import { useMintPanda } from "@/hooks/useMintPanda";
import { parseMintError } from "@/lib/sui/parseMintError";
import { fetchMyPandas } from "@/services/panda.service";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { GasFeeHint } from "@/components/mint/GasFeeHint";
import { MintDetailsDrawer } from "@/components/mint/MintDetailsDrawer";
import { MintHeroCopy } from "@/components/mint/MintHeroCopy";
import { PandaCarouselStage } from "@/components/mint/PandaCarouselStage";
import { PandaStageHalo } from "@/components/mint/PandaStageHalo";
import { WalletSignatureModal } from "@/components/mint/WalletSignatureModal";
import { ConnectWalletModal } from "@/components/layout/ConnectWalletModal";
import { agentWalletSetupPath } from "@/lib/mint/mintRoutes";

export default function MintPage() {
  const { jwt } = useAuth();
  const [connectOpen, setConnectOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    effectiveStatus,
    signModalOpen,
    openSignModal,
    closeSignModal,
    executeMint,
    retryRegistration,
    result,
    errorMessage,
    errorKind,
    pendingRegistration,
    reset,
    revealedStats,
    isSuccess,
    isPendingChain,
  } = useMintPanda(jwt);

  const { data: existingPandas } = useQuery({
    queryKey: ["panda", "my", jwt],
    queryFn: () => fetchMyPandas(jwt!),
    enabled: !!jwt,
    staleTime: 30_000,
  });

  async function handleConfirmMint() {
    try {
      toastSubmitted("Mint submitted", "Confirm the transaction in your wallet.");
      await executeMint();
      toastSuccess("Panda minted successfully");
    } catch (err: unknown) {
      const parsed = parseMintError(err);
      if (parsed.kind !== "rejected") {
        toastFailedSafely("Mint failed", parsed.message);
      }
    }
  }

  async function handleRetryRegistration() {
    try {
      toastSubmitted("Syncing mint to backend…");
      await retryRegistration();
      toastSuccess("Panda registered successfully");
    } catch (err: unknown) {
      toastFailedSafely("Registration failed", parseMintError(err).message);
    }
  }

  const showStageDimmed = isPendingChain;
  const showRevealed = isSuccess && revealedStats;

  return (
    <div className="min-h-[calc(100dvh-var(--navbar-height))] bg-[#0d1421]">
      <PageContainer
        variant="mint"
        className="flex min-h-[calc(100dvh-var(--navbar-height))] flex-col items-center justify-center gap-8 py-10 md:py-14"
      >
        {existingPandas && existingPandas.length > 0 && effectiveStatus === "connecting" && jwt && (
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[12px] text-neutral-300">
            You already have {existingPandas.length} Panda
            {existingPandas.length > 1 ? "s" : ""}.{" "}
            <Link
              href={`/agent-wallet?panda=${existingPandas[0].id}`}
              className="text-primary-500 underline"
            >
              Continue Agent Wallet setup
            </Link>
          </div>
        )}

        <MintHeroCopy
          subtitle={
            effectiveStatus === "connecting"
              ? "Connect your Sui wallet to mint a unique on-chain agent identity."
              : isPendingChain
                ? "Transaction pending — your Panda personality is being sealed on-chain."
                : undefined
          }
        />

        <PandaStageHalo dimmed={showStageDimmed} revealed={!!showRevealed}>
          <PandaCarouselStage
            activeStats={showRevealed ? revealedStats : null}
            paused={isSuccess}
            slowed={isPendingChain}
          />
        </PandaStageHalo>

        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          {effectiveStatus === "connecting" && (
            <>
              <Button size="lg" className="min-w-[220px]" onClick={() => setConnectOpen(true)}>
                Connect Wallet
              </Button>
              <GasFeeHint muted />
            </>
          )}

          {(effectiveStatus === "idle" || effectiveStatus === "error") && jwt && (
            <>
              {pendingRegistration && effectiveStatus === "error" ? (
                <Button
                  size="lg"
                  className="min-w-[220px]"
                  onClick={() => void handleRetryRegistration()}
                >
                  Retry backend sync
                </Button>
              ) : (
                <Button size="lg" className="min-w-[220px]" onClick={openSignModal}>
                  Mint Panda NFT
                </Button>
              )}
              <GasFeeHint />
            </>
          )}

          {isPendingChain && (
            <Button size="lg" loading disabled className="min-w-[220px]">
              {effectiveStatus === "signing"
                ? "Awaiting signature…"
                : effectiveStatus === "registering"
                  ? "Registering Panda…"
                  : "Minting on-chain…"}
            </Button>
          )}

          {effectiveStatus === "error" && errorMessage && (
            <div className="max-w-sm space-y-3 text-center">
              <p className="text-[13px] text-red-400">{errorMessage}</p>
              {errorKind === "insufficient_gas" && (
                <p className="text-[11px] text-neutral-400">
                  <a
                    href="https://faucet.testnet.sui.io/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-500 underline"
                  >
                    Get Testnet SUI
                  </a>
                </p>
              )}
              {pendingRegistration ? (
                <Button size="lg" onClick={() => void handleRetryRegistration()}>
                  Retry backend sync
                </Button>
              ) : (
                <Button size="lg" variant="outline" onClick={reset}>
                  Try again
                </Button>
              )}
            </div>
          )}

          {isSuccess && result && (
            <div className="flex w-full flex-col items-center gap-3">
              <p className="text-center text-[13px] text-neutral-300">
                Your Panda identity is ready. Set up an Agent Wallet to grant bounded
                training permissions.
              </p>
              <Link href={agentWalletSetupPath(result.pandaId)}>
                <Button size="lg" className="min-w-[220px]">
                  Create Agent Wallet
                </Button>
              </Link>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setDetailsOpen(true)}>
                  View mint details
                </Button>
                <Button size="sm" variant="ghost" onClick={reset}>
                  Mint another
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageContainer>

      <WalletSignatureModal
        open={signModalOpen}
        onOpenChange={(open) => (open ? openSignModal() : closeSignModal())}
        onConfirm={() => void handleConfirmMint()}
        loading={isPendingChain}
      />

      {result && (
        <MintDetailsDrawer
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          txDigest={result.txDigest}
          objectId={result.suiObjectId}
        />
      )}

      <ConnectWalletModal open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}

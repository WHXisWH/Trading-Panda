"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toastFailedSafely, toastSubmitted, toastSuccess } from "@/lib/ui/productToast";
import { useAuth } from "@/hooks/useAuth";
import { useMintPanda } from "@/hooks/useMintPanda";
import { useWalletAuthPending } from "@/lib/auth/walletLoginSession";
import { parseMintError } from "@/lib/sui/parseMintError";
import { fetchMyPandas } from "@/services/panda.service";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
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
  const { jwt, isAuthed } = useAuth();
  const walletAuthPending = useWalletAuthPending();
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
    <ProductPageShell density="low" fitViewport className="!py-0">
      <div className="mint-ritual-screen mx-auto h-full w-full max-w-4xl">
        <div className="mint-ritual-cluster">
          <div className="mint-hero-row">
            {existingPandas && existingPandas.length > 0 && effectiveStatus === "connecting" && jwt && (
              <div className="product-chip rounded-2xl px-3 py-1.5 text-[10px]">
                You already have {existingPandas.length} Panda
                {existingPandas.length > 1 ? "s" : ""}.{" "}
                <Link
                  href={`/agent-wallet?panda=${existingPandas[0].id}`}
                  className="text-product-green underline"
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
          </div>

          <div className="mint-stage-slot">
            <PandaStageHalo dimmed={showStageDimmed} revealed={!!showRevealed}>
              <PandaCarouselStage
                activeStats={showRevealed ? revealedStats : null}
                paused={isSuccess}
                slowed={isPendingChain}
              />
            </PandaStageHalo>
          </div>

          <div className="mint-action-zone">
          {effectiveStatus === "connecting" && (
            <>
              <Button
                size="lg"
                className="min-w-[220px]"
                loading={walletAuthPending && !isAuthed}
                disabled={walletAuthPending}
                onClick={() => setConnectOpen(true)}
              >
                {walletAuthPending && !isAuthed ? "Connecting…" : "Connect Wallet"}
              </Button>
              <GasFeeHint muted compact />
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
              <GasFeeHint compact />
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
            <div className="max-w-sm space-y-2 text-center">
              <p className="text-[12px] leading-snug text-product-red">{errorMessage}</p>
              {errorKind === "insufficient_gas" && (
                <p className="text-[10px] text-product-muted">
                  <a
                    href="https://faucet.testnet.sui.io/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-product-green underline"
                  >
                    Get Testnet SUI
                  </a>
                </p>
              )}
              {pendingRegistration ? (
                <Button size="md" onClick={() => void handleRetryRegistration()}>
                  Retry backend sync
                </Button>
              ) : (
                <Button size="md" variant="outline" onClick={reset}>
                  Try again
                </Button>
              )}
            </div>
          )}

          {isSuccess && result && (
            <div className="flex w-full flex-col items-center gap-2">
              <p className="max-w-sm text-center text-[12px] leading-snug text-[#c6c8b9]">
                Identity ready. Set up an Agent Wallet for bounded training permissions.
              </p>
              <Link href={agentWalletSetupPath(result.pandaId)}>
                <Button size="lg" className="min-w-[220px]">
                  Create Agent Wallet
                </Button>
              </Link>
              <div className="flex flex-wrap justify-center gap-1.5">
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
        </div>
      </div>

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
    </ProductPageShell>
  );
}

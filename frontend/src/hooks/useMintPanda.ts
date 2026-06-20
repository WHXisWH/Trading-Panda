"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import {
  buildMintTx,
  resolvePandaObjectIdFromDigest,
  type MintSuiClient,
} from "@/lib/sui/mintPanda";
import { extractTxDigest } from "@/lib/sui/parseMintEvent";
import { parseMintError } from "@/lib/sui/parseMintError";
import {
  clearPendingMintRegistration,
  loadPendingMintRegistration,
  savePendingMintRegistration,
  type PendingMintRegistration,
} from "@/lib/mint/pendingMint";
import { registerMintedPanda } from "@/services/panda.service";
import { mintResultFromApi, type MintResult } from "@/types/panda";
import { statsFromPanda } from "@/utils/pandaHelper";
import type { PandaStats } from "@/utils/pandaHelper";
import { useZkLoginWallet } from "@/hooks/useZkLoginWallet";
import { isAccountOnAppNetwork, networkMismatchHint } from "@/lib/sui/network";

export type MintStatus =
  | "idle"
  | "connecting"
  | "signing"
  | "minting"
  | "registering"
  | "success"
  | "error";

export function useMintPanda(jwt: string | null) {
  const account = useCurrentAccount();
  const zkLoginWallet = useZkLoginWallet();
  const suiClient = useSuiClient();
  const signAndExecute = useSignAndExecuteTransaction() as {
    mutateAsync: (args: { transaction: unknown }) => Promise<unknown>;
  };

  const hasChainSigner = !!account || zkLoginWallet.isReady;
  const networkMismatch = !!account && !isAccountOnAppNetwork(account);

  const [status, setStatus] = useState<MintStatus>("idle");
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [result, setResult] = useState<MintResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingMintRegistration | null>(null);

  const effectiveStatus: MintStatus =
    !hasChainSigner || !jwt ? "connecting" : status;

  useEffect(() => {
    const stored = loadPendingMintRegistration();
    if (stored) setPendingRegistration(stored);
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setSignModalOpen(false);
    setResult(null);
    setErrorMessage(null);
    setErrorKind(null);
    clearPendingMintRegistration();
    setPendingRegistration(null);
  }, []);

  const registerOnBackend = useCallback(
    async (pending: PendingMintRegistration, options?: { name?: string }) => {
      setStatus("registering");
      const apiData = await registerMintedPanda(jwt!, {
        sui_object_id: pending.suiObjectId,
        sui_tx_digest: pending.suiTxDigest,
        name: options?.name,
      });
      clearPendingMintRegistration();
      setPendingRegistration(null);
      const mintResult = mintResultFromApi(apiData);
      setResult(mintResult);
      setStatus("success");
      return mintResult;
    },
    [jwt],
  );

  const executeMint = useCallback(
    async (options?: { name?: string }) => {
      if (!hasChainSigner || !jwt) {
        setErrorMessage("Connect wallet and sign in first");
        setStatus("error");
        return;
      }
      if (networkMismatch) {
        setErrorMessage(networkMismatchHint());
        setErrorKind("network_mismatch");
        setStatus("error");
        return;
      }

      setErrorMessage(null);
      setErrorKind(null);
      setResult(null);
      setSignModalOpen(false);

      try {
        setStatus("signing");
        const tx = buildMintTx();
        let txResult: unknown;

        if (zkLoginWallet.isReady) {
          txResult = await zkLoginWallet.signAndExecute(tx);
        } else if (account) {
          txResult = await signAndExecute.mutateAsync({ transaction: tx });
        } else {
          throw new Error("No wallet available for minting");
        }

        const txDigest = extractTxDigest(txResult);
        if (!txDigest) throw new Error("Transaction digest not found");

        setStatus("minting");
        const objectId = await resolvePandaObjectIdFromDigest(
          suiClient as MintSuiClient,
          txDigest,
        );

        const pending: PendingMintRegistration = {
          suiObjectId: objectId,
          suiTxDigest: txDigest,
        };
        savePendingMintRegistration(pending);
        setPendingRegistration(pending);

        await registerOnBackend(pending, options);
      } catch (err: unknown) {
        const parsed = parseMintError(err);
        setErrorMessage(parsed.message);
        setErrorKind(parsed.kind);
        setStatus("error");
        throw err;
      }
    },
    [
      account,
      hasChainSigner,
      jwt,
      networkMismatch,
      registerOnBackend,
      signAndExecute,
      suiClient,
      zkLoginWallet,
    ],
  );

  const openSignModal = useCallback(() => {
    if (!hasChainSigner || !jwt) return;
    setErrorMessage(null);
    setErrorKind(null);
    setSignModalOpen(true);
  }, [hasChainSigner, jwt]);

  const closeSignModal = useCallback(() => {
    if (status === "signing" || status === "minting" || status === "registering") return;
    setSignModalOpen(false);
  }, [status]);

  const retryRegistration = useCallback(
    async (options?: { name?: string }) => {
      const pending = pendingRegistration ?? loadPendingMintRegistration();
      if (!pending || !jwt) {
        setErrorMessage("No pending mint to sync. Try minting again.");
        setStatus("error");
        return;
      }

      setErrorMessage(null);
      setErrorKind(null);

      try {
        await registerOnBackend(pending, options);
      } catch (err: unknown) {
        const parsed = parseMintError(err);
        setErrorMessage(parsed.message);
        setErrorKind(parsed.kind === "rejected" ? "unknown" : parsed.kind);
        setStatus("error");
        throw err;
      }
    },
    [jwt, pendingRegistration, registerOnBackend],
  );

  const revealedStats: PandaStats | null = result
    ? statsFromPanda({
        boldness: result.personality.boldness,
        patience: result.personality.patience,
        intuition: result.personality.intuition,
        focus: result.personality.focus,
        contrarian: result.personality.contrarian,
        experience_level: 5,
      })
    : null;

  return {
    status,
    effectiveStatus,
    signModalOpen,
    setSignModalOpen,
    openSignModal,
    closeSignModal,
    result,
    errorMessage,
    errorKind,
    pendingRegistration,
    executeMint,
    retryRegistration,
    reset,
    revealedStats,
    networkMismatch,
    isSuccess: status === "success",
    isPendingChain:
      status === "signing" || status === "minting" || status === "registering",
  };
}

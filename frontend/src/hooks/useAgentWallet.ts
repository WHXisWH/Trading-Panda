"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import {
  fetchAgentWalletStatus,
  syncAgentWallet,
  updateTrainingBudget,
  validatePolicyDraft,
} from "@/services/agentWallet.service";
import { buildSetupAgentWalletTx } from "@/lib/sui/setupAgentWallet";
import { extractTxDigest } from "@/lib/sui/parseMintEvent";
import { parseMintError } from "@/lib/sui/parseMintError";
import { canonicalMarketPair, dedupeMarketPairs } from "@/lib/market/canonicalMarketPair";
import {
  toastFailedSafely,
  toastSubmitted,
  toastSuccess,
  toastSyncing,
} from "@/lib/ui/productToast";
import { useZkLoginWallet } from "@/hooks/useZkLoginWallet";
import {
  DEFAULT_POLICY_DRAFT,
  type AgentWalletStatusApi,
  type PolicyDraft,
} from "@/types/agent-wallet";

export type AgentWalletStep = "draft" | "review" | "signing" | "active" | "ready";
export type SetupPhase = "idle" | "preparing" | "awaiting_wallet" | "syncing";

export function useAgentWallet(jwt: string | null, pandaId: string | null, pandaSuiObjectId: string | null) {
  const account = useCurrentAccount();
  const zkLoginWallet = useZkLoginWallet();
  const signAndExecute = useSignAndExecuteTransaction() as {
    mutateAsync: (args: { transaction: unknown }) => Promise<unknown>;
  };

  const hasChainSigner = !!account || zkLoginWallet.isReady;

  const [status, setStatus] = useState<AgentWalletStatusApi | null>(null);
  const [draft, setDraft] = useState<PolicyDraft>(DEFAULT_POLICY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<AgentWalletStep>("draft");
  const [setupPhase, setSetupPhase] = useState<SetupPhase>("idle");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  const isSetupPending = setupPhase !== "idle";

  const refreshStatus = useCallback(async () => {
    if (!jwt || !pandaId) return;
    try {
      const data = await fetchAgentWalletStatus(jwt, pandaId);
      setStatus(data);
      if (data.setup_state === "ready") setStep("ready");
      else if (data.vault?.sui_object_id) setStep("active");
      setDraft((prev) => {
        const next = { ...prev };
        if (data.vault?.training_budget != null) {
          next.trainingBudget = data.vault.training_budget;
        }
        if (data.policy) {
          if (Array.isArray(data.policy.allowed_pairs) && data.policy.allowed_pairs.length) {
            next.allowedPairs = dedupeMarketPairs(data.policy.allowed_pairs);
          }
          next.maxNotionalPerTrade = data.policy.max_notional_per_trade;
          next.maxDailyLoss = data.policy.max_daily_loss;
          next.maxOpenPositions = data.policy.max_open_positions;
        }
        return next;
      });
      if (data.launch_pairs?.length && !data.vault?.sui_object_id) {
        const launchPairs = dedupeMarketPairs(data.launch_pairs);
        setDraft((prev) => {
          const kept = prev.allowedPairs.filter((p) =>
            launchPairs.some((lp) => canonicalMarketPair(lp) === canonicalMarketPair(p)),
          );
          return {
            ...prev,
            allowedPairs: kept.length
              ? dedupeMarketPairs(kept.map(canonicalMarketPair))
              : launchPairs.slice(0, 2),
          };
        });
      }
    } finally {
      setIsStatusLoading(false);
    }
  }, [jwt, pandaId]);

  useEffect(() => {
    setIsStatusLoading(true);
    refreshStatus().catch((err: Error) => {
      setErrorMessage(err.message);
      setIsStatusLoading(false);
    });
  }, [refreshStatus]);

  const launchPairs = useMemo(
    () => dedupeMarketPairs(status?.launch_pairs ?? DEFAULT_POLICY_DRAFT.allowedPairs),
    [status?.launch_pairs],
  );

  const agentAddress = status?.agent_signer_address ?? null;

  const runValidation = useCallback(async () => {
    if (!jwt || !pandaId) return false;
    const result = await validatePolicyDraft(jwt, pandaId, draft);
    const errors: Record<string, string> = {};
    for (const err of result.errors) errors[err.field] = err.message;
    setFieldErrors(errors);
    return result.valid;
  }, [jwt, pandaId, draft]);

  const openReview = useCallback(async () => {
    setErrorMessage(null);
    setIsValidating(true);
    try {
      const ok = await runValidation();
      if (!ok) return;
      setReviewOpen(true);
      setStep("review");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setIsValidating(false);
    }
  }, [runValidation]);

  const startSigning = useCallback(() => {
    setReviewOpen(false);
    setSignModalOpen(true);
    setStep("signing");
  }, []);

  const closeSignModal = useCallback(() => {
    if (isSetupPending) return;
    setSignModalOpen(false);
    if (step === "signing") setStep("draft");
  }, [isSetupPending, step]);

  const executeSetup = useCallback(async () => {
    if (!jwt || !pandaId || !pandaSuiObjectId || !agentAddress) {
      const message = "Missing wallet, panda, or agent signer configuration";
      setErrorMessage(message);
      toastFailedSafely("Setup unavailable", message);
      return;
    }

    if (!hasChainSigner) {
      const message = "Connect a Sui wallet or sign in with Google before approving setup.";
      setErrorMessage(message);
      toastFailedSafely("Wallet required", message);
      return;
    }

    setErrorMessage(null);
    setSignModalOpen(false);
    setSetupPhase("preparing");

    let digest: string | null = null;

    try {
      toastSubmitted("Setup submitted", "Confirm the transaction in your wallet.");
      const tx = await buildSetupAgentWalletTx(pandaSuiObjectId, agentAddress, draft);
      setSetupPhase("awaiting_wallet");

      let result: unknown;
      if (zkLoginWallet.isReady) {
        result = await zkLoginWallet.signAndExecute(tx);
      } else if (account) {
        result = await signAndExecute.mutateAsync({ transaction: tx });
      } else {
        throw new Error("No wallet available for signing");
      }

      digest = extractTxDigest(result);
      if (!digest) throw new Error("No transaction digest returned");

      setTxDigest(digest);
      setSetupPhase("syncing");
      toastSyncing("Backend mirror is syncing your PandaVault and TradingPolicy.");

      const synced = await syncAgentWallet(jwt, pandaId, digest, draft);
      setStatus(synced);
      setStep(synced.setup_state === "ready" ? "ready" : "active");
      setToast("Agent Wallet active");
      toastSuccess("Agent Wallet active");
    } catch (err) {
      const parsed = parseMintError(err);

      if (parsed.kind === "rejected") {
        setErrorMessage(parsed.message);
        setReviewOpen(true);
        setStep("review");
        return;
      }

      if (digest) {
        setTxDigest(digest);
        const message =
          "Chain setup succeeded but backend sync failed. Retry mirror sync below.";
        setErrorMessage(message);
        setStep("active");
        toastFailedSafely("Mirror sync failed", parsed.message);
        return;
      }

      setErrorMessage(parsed.message);
      setStep("draft");
      toastFailedSafely("Agent Wallet setup failed", parsed.message);
    } finally {
      setSetupPhase("idle");
    }
  }, [
    account,
    agentAddress,
    draft,
    hasChainSigner,
    jwt,
    pandaId,
    pandaSuiObjectId,
    signAndExecute,
    zkLoginWallet,
  ]);

  const retrySync = useCallback(async () => {
    if (!jwt || !pandaId || !txDigest) return;
    setSetupPhase("syncing");
    setErrorMessage(null);
    try {
      toastSyncing();
      const synced = await syncAgentWallet(jwt, pandaId, txDigest, draft);
      setStatus(synced);
      setStep(synced.setup_state === "ready" ? "ready" : "active");
      setToast("Mirror synced");
      toastSuccess("Mirror synced");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setErrorMessage(message);
      toastFailedSafely("Mirror sync failed", message);
    } finally {
      setSetupPhase("idle");
    }
  }, [draft, jwt, pandaId, txDigest]);

  const saveTrainingBudget = useCallback(async () => {
    if (!jwt || !pandaId) return;
    setIsSavingBudget(true);
    setErrorMessage(null);
    setFieldErrors({});
    try {
      const synced = await updateTrainingBudget(jwt, pandaId, draft.trainingBudget);
      setStatus(synced);
      setToast("Training budget updated");
      toastSuccess("Training budget updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Training budget update failed";
      setErrorMessage(message);
      toastFailedSafely("Update failed", message);
    } finally {
      setIsSavingBudget(false);
    }
  }, [draft.trainingBudget, jwt, pandaId]);

  return {
    status,
    draft,
    setDraft,
    fieldErrors,
    step,
    setupPhase,
    isSetupPending,
    launchPairs,
    agentAddress,
    hasChainSigner,
    reviewOpen,
    setReviewOpen,
    signModalOpen,
    setSignModalOpen,
    closeSignModal,
    detailsOpen,
    setDetailsOpen,
    txDigest,
    toast,
    setToast,
    errorMessage,
    isSavingBudget,
    isValidating,
    isStatusLoading,
    openReview,
    startSigning,
    executeSetup,
    retrySync,
    refreshStatus,
    saveTrainingBudget,
  };
}

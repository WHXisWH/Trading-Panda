"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import {
  fetchAgentWalletStatus,
  syncAgentWallet,
  validatePolicyDraft,
} from "@/services/agentWallet.service";
import { buildSetupAgentWalletTx, extractTxDigest } from "@/lib/sui/setupAgentWallet";
import {
  DEFAULT_POLICY_DRAFT,
  type AgentWalletStatusApi,
  type PolicyDraft,
} from "@/types/agent-wallet";

export type AgentWalletStep = "draft" | "review" | "signing" | "active" | "ready";

export function useAgentWallet(jwt: string | null, pandaId: string | null, pandaSuiObjectId: string | null) {
  const signAndExecute = useSignAndExecuteTransaction() as {
    mutateAsync: (args: { transaction: unknown }) => Promise<unknown>;
  };

  const [status, setStatus] = useState<AgentWalletStatusApi | null>(null);
  const [draft, setDraft] = useState<PolicyDraft>(DEFAULT_POLICY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<AgentWalletStep>("draft");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!jwt || !pandaId) return;
    const data = await fetchAgentWalletStatus(jwt, pandaId);
    setStatus(data);
    if (data.setup_state === "ready") setStep("ready");
    else if (data.vault?.sui_object_id) setStep("active");
    if (data.launch_pairs?.length) {
      setDraft((prev) => ({
        ...prev,
        allowedPairs: prev.allowedPairs.filter((p) => data.launch_pairs.includes(p)).length
          ? prev.allowedPairs.filter((p) => data.launch_pairs.includes(p))
          : data.launch_pairs.slice(0, 2),
      }));
    }
  }, [jwt, pandaId]);

  useEffect(() => {
    refreshStatus().catch((err: Error) => setErrorMessage(err.message));
  }, [refreshStatus]);

  const launchPairs = useMemo(
    () => status?.launch_pairs ?? DEFAULT_POLICY_DRAFT.allowedPairs,
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
    try {
      const ok = await runValidation();
      if (!ok) return;
      setReviewOpen(true);
      setStep("review");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Validation failed");
    }
  }, [runValidation]);

  const startSigning = useCallback(() => {
    setReviewOpen(false);
    setSignModalOpen(true);
    setStep("signing");
  }, []);

  const executeSetup = useCallback(async () => {
    if (!jwt || !pandaId || !pandaSuiObjectId || !agentAddress) {
      setErrorMessage("Missing wallet, panda, or agent signer configuration");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const tx = await buildSetupAgentWalletTx(pandaSuiObjectId, agentAddress, draft);
      const result = await signAndExecute.mutateAsync({ transaction: tx });
      const digest = extractTxDigest(result);
      if (!digest) throw new Error("No transaction digest returned");
      setTxDigest(digest);
      setSignModalOpen(false);
      setToast("Setup submitted — syncing mirror…");
      const synced = await syncAgentWallet(jwt, pandaId, digest, draft);
      setStatus(synced);
      setStep(synced.setup_state === "ready" ? "ready" : "active");
      setToast("Agent Wallet active");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Setup failed";
      if (msg.toLowerCase().includes("reject")) {
        setErrorMessage("Wallet rejected signing. Your draft is unchanged.");
        setStep("review");
      } else if (txDigest) {
        setErrorMessage("Chain setup succeeded but backend sync failed. Retry sync from details.");
        setStep("active");
      } else {
        setErrorMessage(msg);
        setStep("draft");
      }
    } finally {
      setIsLoading(false);
    }
  }, [agentAddress, draft, jwt, pandaId, pandaSuiObjectId, signAndExecute, txDigest]);

  const retrySync = useCallback(async () => {
    if (!jwt || !pandaId || !txDigest) return;
    setIsLoading(true);
    try {
      const synced = await syncAgentWallet(jwt, pandaId, txDigest, draft);
      setStatus(synced);
      setToast("Mirror synced");
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsLoading(false);
    }
  }, [draft, jwt, pandaId, txDigest]);

  return {
    status,
    draft,
    setDraft,
    fieldErrors,
    step,
    launchPairs,
    agentAddress,
    reviewOpen,
    setReviewOpen,
    signModalOpen,
    setSignModalOpen,
    detailsOpen,
    setDetailsOpen,
    txDigest,
    toast,
    setToast,
    errorMessage,
    isLoading,
    openReview,
    startSigning,
    executeSetup,
    retrySync,
    refreshStatus,
  };
}

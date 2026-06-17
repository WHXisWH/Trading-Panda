"use client";

import { useCallback, useEffect, useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import {
  buildPausePolicyTx,
  buildRevokeAgentTx,
  buildTightenPolicyTx,
  extractTxDigest,
} from "@/lib/sui/ownerPolicyActions";
import { toastFailedSafely, toastSubmitted, toastSuccess, toastSyncing } from "@/lib/ui/productToast";
import { validatePolicyDraft } from "@/services/agentWallet.service";
import { fetchSafetyStatus, syncOwnerAction } from "@/services/safety.service";
import type { PolicyDraft } from "@/types/agent-wallet";
import type { OwnerAction, SafetyStatusApi } from "@/types/safety";

export type SafetyActionKind = "pause" | "unpause" | "revoke" | "tighten";

export function useSafetyControls(
  jwt: string | null,
  pandaId: string,
  tightenDraft: PolicyDraft,
  currentDraft: PolicyDraft,
) {
  const signAndExecute = useSignAndExecuteTransaction() as {
    mutateAsync: (args: { transaction: unknown }) => Promise<unknown>;
  };

  const [status, setStatus] = useState<SafetyStatusApi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastTxDigest, setLastTxDigest] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<SafetyActionKind | null>(null);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [tightenDrawerOpen, setTightenDrawerOpen] = useState(false);
  const [resultDrawerOpen, setResultDrawerOpen] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!jwt || !pandaId) return;
    const data = await fetchSafetyStatus(jwt, pandaId);
    setStatus(data);
  }, [jwt, pandaId]);

  useEffect(() => {
    refreshStatus().catch((err: Error) => setErrorMessage(err.message));
  }, [refreshStatus]);

  const openAction = useCallback((action: SafetyActionKind) => {
    setErrorMessage(null);
    if (action === "tighten") {
      setTightenDrawerOpen(true);
      return;
    }
    setPendingAction(action);
    setSignModalOpen(true);
  }, []);

  const executeOwnerAction = useCallback(
    async (kind: SafetyActionKind, draft?: PolicyDraft) => {
      if (!jwt || !pandaId) return;
      const policyObjectId = status?.policy?.sui_object_id;
      if (!policyObjectId) {
        setErrorMessage("TradingPolicy object is not mirrored yet.");
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        toastSubmitted("Owner action submitted", "Confirm the transaction in your wallet.");
        let tx;
        let mirrorAction: OwnerAction;
        let draftPayload: (PolicyDraft & { policy_hash?: string }) | undefined;

        if (kind === "pause") {
          tx = await buildPausePolicyTx(policyObjectId, true);
          mirrorAction = "pause";
        } else if (kind === "unpause") {
          tx = await buildPausePolicyTx(policyObjectId, false);
          mirrorAction = "unpause";
        } else if (kind === "revoke") {
          tx = await buildRevokeAgentTx(policyObjectId);
          mirrorAction = "revoke";
        } else {
          const tighten = draft ?? tightenDraft;
          const validation = await validatePolicyDraft(jwt, pandaId, tighten);
          if (!validation.valid) {
            throw new Error(validation.errors[0]?.message ?? "Tighten draft is invalid");
          }
          if (
            tighten.maxNotionalPerTrade > currentDraft.maxNotionalPerTrade ||
            tighten.maxDailyLoss > currentDraft.maxDailyLoss
          ) {
            throw new Error("Tighten only allows lower caps than current policy");
          }
          tx = await buildTightenPolicyTx(policyObjectId, currentDraft, tighten);
          mirrorAction = "tighten";
          draftPayload = { ...tighten, policy_hash: validation.policy_hash };
        }

        const result = await signAndExecute.mutateAsync({ transaction: tx });
        const digest = extractTxDigest(result);
        if (!digest) throw new Error("Missing transaction digest");

        setLastTxDigest(digest);
        const updated = await syncOwnerAction(jwt, pandaId, mirrorAction, digest, draftPayload);
        setStatus(updated);
        setSignModalOpen(false);
        setTightenDrawerOpen(false);
        setPendingAction(null);
        setResultDrawerOpen(true);

        if (updated.mirror_sync_status === "degraded") {
          toastSyncing();
        } else {
          toastSuccess(
            kind === "pause"
              ? "Policy paused"
              : kind === "unpause"
                ? "Policy resumed"
                : kind === "revoke"
                  ? "Agent signer revoked"
                  : "Policy limits tightened",
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Owner action failed";
        if (!/reject/i.test(message)) {
          toastFailedSafely("Action not applied", message);
          setErrorMessage(message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentDraft,
      jwt,
      pandaId,
      signAndExecute,
      status?.policy?.sui_object_id,
      tightenDraft,
    ],
  );

  return {
    status,
    isLoading,
    errorMessage,
    lastTxDigest,
    pendingAction,
    signModalOpen,
    setSignModalOpen,
    tightenDrawerOpen,
    setTightenDrawerOpen,
    resultDrawerOpen,
    setResultDrawerOpen,
    refreshStatus,
    openAction,
    executeOwnerAction,
  };
}

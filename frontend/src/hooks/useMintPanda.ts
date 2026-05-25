"use client";

import { useCallback, useState } from "react";
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
import { registerMintedPanda } from "@/services/panda.service";
import { mintResultFromApi, type MintResult } from "@/types/panda";

export type MintStatus =
  | "idle"
  | "connecting"
  | "confirming"
  | "minting"
  | "revealing"
  | "success"
  | "error";

export function useMintPanda(jwt: string | null) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const signAndExecute = useSignAndExecuteTransaction() as {
    mutateAsync: (args: { transaction: unknown }) => Promise<unknown>;
  };

  const [status, setStatus] = useState<MintStatus>("idle");
  const [result, setResult] = useState<MintResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<string | null>(null);
  const [revealPhase, setRevealPhase] = useState<"hatching" | "radar" | "talent" | "done">(
    "hatching",
  );

  const effectiveStatus: MintStatus =
    !account || !jwt ? "connecting" : status;

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
    setErrorKind(null);
    setRevealPhase("hatching");
  }, []);

  const startReveal = useCallback(() => {
    setRevealPhase("hatching");
    const t1 = window.setTimeout(() => setRevealPhase("radar"), 400);
    const t2 = window.setTimeout(() => setRevealPhase("talent"), 1400);
    const t3 = window.setTimeout(() => {
      setRevealPhase("done");
      setStatus("success");
    }, 2200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  const mint = useCallback(
    async (options?: { name?: string }) => {
      if (!account || !jwt) {
        setErrorMessage("请先连接钱包并登录");
        setStatus("error");
        return;
      }

      setErrorMessage(null);
      setErrorKind(null);
      setResult(null);

      try {
        setStatus("confirming");
        const tx = buildMintTx();
        const txResult = await signAndExecute.mutateAsync({ transaction: tx });

        const txDigest = extractTxDigest(txResult);
        if (!txDigest) throw new Error("未找到交易 digest");

        setStatus("minting");
        const objectId = await resolvePandaObjectIdFromDigest(
          suiClient as MintSuiClient,
          txDigest,
        );

        const apiData = await registerMintedPanda(jwt, {
          sui_object_id: objectId,
          sui_tx_digest: txDigest,
          name: options?.name,
        });

        const mintResult = mintResultFromApi(apiData);
        setResult(mintResult);
        setStatus("revealing");
        startReveal();
      } catch (err: unknown) {
        const parsed = parseMintError(err);
        setErrorMessage(parsed.message);
        setErrorKind(parsed.kind);
        setStatus("error");
        throw err;
      }
    },
    [account, jwt, signAndExecute, startReveal, suiClient],
  );

  return {
    status,
    effectiveStatus,
    result,
    errorMessage,
    errorKind,
    revealPhase,
    mint,
    reset,
    showRadar: revealPhase === "radar" || revealPhase === "talent" || revealPhase === "done",
    showTalent: revealPhase === "talent" || revealPhase === "done",
    isSuccess: status === "success",
  };
}

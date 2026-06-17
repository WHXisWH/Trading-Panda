"use client";

import { useCallback, useEffect, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useAuthStore } from "@/stores/authStore";
import {
  loadZkLoginSession,
  type ZkLoginPersistedSession,
} from "@/lib/sui/zkLoginSession";
import { signAndExecuteZkLoginTransaction } from "@/lib/sui/zkLoginExecute";
import type { Transaction } from "@mysten/sui/transactions";

export function useZkLoginWallet() {
  const { user, accessToken, jwt } = useAuthStore();
  const token = accessToken ?? jwt;
  const suiClient = useSuiClient();
  const [session, setSession] = useState<ZkLoginPersistedSession | null>(null);

  useEffect(() => {
    setSession(loadZkLoginSession());
  }, [token, user?.walletAddress]);

  const isReady =
    !!token &&
    !!session &&
    !!user?.walletAddress &&
    session.walletAddress.toLowerCase() === user.walletAddress.toLowerCase();

  const signAndExecute = useCallback(
    async (transaction: Transaction) => {
      if (!session) {
        throw new Error("zkLogin wallet is not ready");
      }
      return signAndExecuteZkLoginTransaction(session, transaction);
    },
    [session],
  );

  return {
    isReady,
    address: isReady ? session!.walletAddress : null,
    signAndExecute,
    suiClient,
  };
}

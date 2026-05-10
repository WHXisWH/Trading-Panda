"use client";
import { useEffect, useRef } from "react";
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/api/client";
import type { User } from "@/types";

interface LoginResponse {
  jwt: string;
  user_id: string;
  wallet_address: string;
  is_new_user: boolean;
}

export function useAuth() {
  const account = useCurrentAccount();
  const { user, jwt, setAuth, clearAuth } = useAuthStore();
  const { mutateAsync: signMessage } = useSignPersonalMessage();
  const signingRef = useRef(false);

  useEffect(() => {
    if (!account) {
      clearAuth();
      return;
    }
    // Already authenticated for this wallet
    if (jwt && user?.walletAddress === account.address) return;
    if (signingRef.current) return;

    signingRef.current = true;
    const message = `TradingPanda:login:${Date.now()}`;

    signMessage({ message: new TextEncoder().encode(message) })
      .then(({ signature }) =>
        apiClient.post<LoginResponse>("/api/auth/wallet-login", {
          wallet_address: account.address,
          message,
          signature,
        })
      )
      .then((data) => {
        const u: User = {
          id: data.user_id,
          walletAddress: data.wallet_address,
          displayName: null,
          avatarUrl: null,
          experienceLevel: null,
          onboardingSurvey: null,
          createdAt: new Date().toISOString(),
        };
        setAuth(u, data.jwt);
      })
      .catch(console.error)
      .finally(() => {
        signingRef.current = false;
      });
  }, [account?.address]);

  return { user, jwt, isAuthed: !!jwt };
}

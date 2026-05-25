"use client";

/**
 * Keeps wallet address in sync with JWT; auto sign-in after wallet connect.
 */

import { useEffect, useRef } from "react";
import { useCurrentAccount, useCurrentWallet } from "@mysten/dapp-kit";
import { toast } from "sonner";
import { useWalletLogin } from "@/hooks/useWalletLogin";
import { clearWalletLoginFailure, walletsMatch } from "@/lib/auth/walletLoginSession";
import { isAccountOnAppNetwork, networkMismatchHint } from "@/lib/sui/network";
import { useAuthStore } from "@/stores/authStore";

export function WalletAuthSync() {
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const { user, accessToken, jwt, clearAuth } = useAuthStore();
  const token = accessToken ?? jwt;
  const { loginWithWallet } = useWalletLogin();
  const loginRef = useRef(loginWithWallet);
  loginRef.current = loginWithWallet;

  const networkMismatch = account ? !isAccountOnAppNetwork(account) : false;
  const networkToastShown = useRef(false);

  useEffect(() => {
    if (!account) {
      clearWalletLoginFailure();
      networkToastShown.current = false;
      return;
    }

    if (token && user?.walletAddress && !walletsMatch(user.walletAddress, account.address)) {
      clearAuth();
    }
  }, [account?.address, token, user?.walletAddress, clearAuth]);

  useEffect(() => {
    const address = account?.address;
    if (!address || token) {
      networkToastShown.current = false;
      return;
    }
    if (!currentWallet) return;

    if (networkMismatch) {
      if (!networkToastShown.current) {
        networkToastShown.current = true;
        toast.error(networkMismatchHint(), { id: "wallet-network-mismatch", duration: 8000 });
      }
      return;
    }

    void loginRef.current();
  }, [account?.address, token, currentWallet?.name, networkMismatch]);

  return null;
}

"use client";

import { useCallback } from "react";
import { useCurrentAccount, useCurrentWallet } from "@mysten/dapp-kit";
import { toast } from "sonner";
import { authErrorMessage, connectAuth, fetchAuthNonce } from "@/lib/auth.service";
import { isAccountOnAppNetwork, networkMismatchHint } from "@/lib/sui/network";
import { signPersonalMessageOnAppChain } from "@/lib/sui/walletSign";
import {
  markWalletLoginFailed,
  releaseWalletLogin,
  tryAcquireWalletLogin,
  useWalletLoginInFlight,
} from "@/lib/auth/walletLoginSession";
import { useAuthStore } from "@/stores/authStore";

export function useWalletLogin() {
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const { setAuth } = useAuthStore();
  const inFlightAddress = useWalletLoginInFlight();

  const networkMismatch = account ? !isAccountOnAppNetwork(account) : false;
  const isLoading =
    !!account && inFlightAddress?.toLowerCase() === account.address.toLowerCase();

  const loginWithWallet = useCallback(async () => {
    if (!account) {
      toast.error("请先Connect Wallet");
      return;
    }

    if (!currentWallet) {
      toast.error("钱包未就绪，请重新连接");
      return;
    }

    if (networkMismatch) {
      toast.error(networkMismatchHint(), { duration: 8000 });
      return;
    }

    const address = account.address;
    if (!tryAcquireWalletLogin(address)) {
      return;
    }

    try {
      const { message, nonce } = await fetchAuthNonce(address);
      const signature = await signPersonalMessageOnAppChain(
        currentWallet as Parameters<typeof signPersonalMessageOnAppChain>[0],
        account,
        new TextEncoder().encode(message),
      );

      const session = await connectAuth({
        method: "wallet",
        wallet_address: address,
        signature,
        nonce,
      });
      setAuth(session.user, session.accessToken, session.refreshToken);
      toast.success("登录成功");
    } catch (err) {
      console.error(err);
      markWalletLoginFailed(address);
      toast.error(authErrorMessage(err), { id: "wallet-login-error" });
    } finally {
      releaseWalletLogin(address);
    }
  }, [account, currentWallet, networkMismatch, setAuth]);

  return { loginWithWallet, isLoading, networkMismatch };
}

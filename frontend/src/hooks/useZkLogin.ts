"use client";

import { useCallback, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { connectAuth, authErrorMessage } from "@/lib/auth.service";
import { buildGoogleOAuthUrl, getOrCreateZkLoginSalt, saveZkLoginReturnTo, suppressWalletAutoLoginForOAuth, releaseWalletAutoLoginSuppress } from "@/lib/sui/zkLogin";
import { finalizeZkLoginSession, prepareZkLoginOAuthSession } from "@/lib/sui/zkLoginSession";

export function useZkLogin() {
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGoogleLogin = useCallback(async (returnTo?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      saveZkLoginReturnTo(returnTo);
      suppressWalletAutoLoginForOAuth();
      const { nonce } = await prepareZkLoginOAuthSession();
      const redirectUri = `${window.location.origin}/auth/zklogin-callback`;
      window.location.href = buildGoogleOAuthUrl(redirectUri, nonce);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "zkLogin 未配置";
      setError(msg);
      setIsLoading(false);
    }
  }, []);

  const completeWithIdToken = useCallback(
    async (idToken: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const session = await finalizeZkLoginSession(idToken);
        const salt = getOrCreateZkLoginSalt();
        const { user, accessToken, refreshToken } = await connectAuth({
          method: "zklogin",
          wallet_address: session.walletAddress,
          id_token: idToken,
          provider: "google",
          salt,
        });
        setAuth(user, accessToken, refreshToken, "zklogin");
        releaseWalletAutoLoginSuppress();
      } catch (e) {
        const msg = authErrorMessage(e);
        setError(msg);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [setAuth],
  );

  return { startGoogleLogin, completeWithIdToken, isLoading, error };
}

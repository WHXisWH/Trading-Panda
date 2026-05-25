"use client";

import { useCallback, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { connectAuth } from "@/lib/auth.service";
import { buildGoogleOAuthUrl } from "@/lib/sui/zkLogin";

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useZkLogin() {
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGoogleLogin = useCallback(() => {
    setError(null);
    try {
      const nonce = randomNonce();
      sessionStorage.setItem("tp-zklogin-nonce", nonce);
      const redirectUri = `${window.location.origin}/auth/zklogin-callback`;
      window.location.href = buildGoogleOAuthUrl(redirectUri, nonce);
    } catch (e) {
      setError(e instanceof Error ? e.message : "zkLogin 未配置");
    }
  }, []);

  const completeWithIdToken = useCallback(
    async (idToken: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const { deriveZkLoginAddress, getOrCreateZkLoginSalt } = await import(
          "@/lib/sui/zkLogin"
        );
        const salt = getOrCreateZkLoginSalt();
        const walletAddress = deriveZkLoginAddress(idToken, salt);
        const { user, accessToken, refreshToken } = await connectAuth({
          method: "zklogin",
          wallet_address: walletAddress,
          id_token: idToken,
          provider: "google",
          salt,
        });
        setAuth(user, accessToken, refreshToken);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "zkLogin 连接失败";
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

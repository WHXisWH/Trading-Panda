"use client";

import { useAuthStore } from "@/stores/authStore";
import { resolveEffectiveAccessToken } from "@/lib/auth/accessToken";

/** Read auth state only. Wallet connect → auto login runs in <WalletAuthSync />. */
export function useAuth() {
  const { user, accessToken, jwt, refreshToken } = useAuthStore();
  const token = resolveEffectiveAccessToken(accessToken, jwt);

  return {
    user,
    jwt: token,
    accessToken: token,
    refreshToken,
    isAuthed: !!token,
  };
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import type { AuthMethod } from "@/types/auth";
import { clearWalletLoginFailure, resetWalletLoginState } from "@/lib/auth/walletLoginSession";
import { releaseWalletAutoLoginSuppress } from "@/lib/sui/zkLogin";
import { clearZkLoginSession } from "@/lib/sui/zkLoginSession";

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** @deprecated use accessToken */
  jwt: string | null;
  authMethod: AuthMethod | null;
  /** When true, WalletAuthSync will not auto sign-in (e.g. after explicit logout). */
  walletAutoLoginSuppressed: boolean;
  setAuth: (
    user: User,
    accessToken: string,
    refreshToken?: string,
    authMethod?: AuthMethod,
  ) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
  allowWalletAutoLogin: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      jwt: null,
      authMethod: null,
      walletAutoLoginSuppressed: false,
      setAuth: (user, accessToken, refreshToken, authMethod) =>
        set((state) => ({
          user,
          accessToken,
          refreshToken: refreshToken ?? null,
          jwt: accessToken,
          authMethod: authMethod ?? state.authMethod ?? "wallet",
          walletAutoLoginSuppressed: false,
        })),
      setTokens: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
          jwt: accessToken,
        })),
      allowWalletAutoLogin: () => {
        releaseWalletAutoLoginSuppress();
        set({ walletAutoLoginSuppressed: false });
      },
      clearAuth: () => {
        clearZkLoginSession();
        clearWalletLoginFailure();
        resetWalletLoginState();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          jwt: null,
          authMethod: null,
          walletAutoLoginSuppressed: true,
        });
      },
    }),
    {
      name: "trading-panda-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        jwt: state.jwt,
        authMethod: state.authMethod,
      }),
    },
  ),
);

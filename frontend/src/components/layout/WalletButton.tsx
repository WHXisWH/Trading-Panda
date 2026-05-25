"use client";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { useZkLogin } from "@/hooks/useZkLogin";
import { useAuth } from "@/hooks/useAuth";
import { useWalletLogin } from "@/hooks/useWalletLogin";
import { resetWalletLoginState } from "@/lib/auth/walletLoginSession";
import { formatShortAddress } from "@/lib/formatAddress";
import { networkMismatchHint } from "@/lib/sui/network";
import { useAuthStore } from "@/stores/authStore";

/**
 * Navbar 右侧钱包 / Google / 会话控件（Obsidian WalletButton）
 */
export function WalletButton() {
  const account = useCurrentAccount();
  const { isAuthed, user } = useAuth();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { startGoogleLogin, isLoading: zkLoading } = useZkLogin();
  const { isLoading: walletLoginLoading, networkMismatch } = useWalletLogin();

  const needsWalletSignIn = !!account && !isAuthed;
  const sessionLabel =
    user?.displayName ??
    (user?.walletAddress ? formatShortAddress(user.walletAddress) : null);

  if (isAuthed) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {sessionLabel && (
          <span
            className="hidden max-w-[160px] truncate rounded-md bg-bamboo-50 px-2.5 py-1 text-[12px] font-medium text-bamboo-800 sm:inline"
            title={user?.walletAddress ?? undefined}
          >
            已登录 · {sessionLabel}
          </span>
        )}
        <button
          type="button"
          onClick={() => clearAuth()}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[13px] font-medium text-ink-600 transition-colors hover:bg-paper-card"
        >
          退出
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => startGoogleLogin()}
        disabled={zkLoading}
        className="hidden min-h-[44px] rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-paper-card sm:inline-block"
      >
        {zkLoading ? "跳转 Google…" : "Google 登录"}
      </button>
      {needsWalletSignIn && walletLoginLoading && (
        <span className="text-[13px] text-ink-500">登录中…</span>
      )}
      {needsWalletSignIn && networkMismatch && !walletLoginLoading && (
        <span
          className="max-w-[140px] text-[11px] leading-tight text-amber-800"
          title={networkMismatchHint()}
        >
          请切换 Testnet
        </span>
      )}
      <ConnectButton
        connectText={
          needsWalletSignIn && walletLoginLoading ? "登录中…" : "连接钱包"
        }
        onClick={() => resetWalletLoginState()}
      />
    </div>
  );
}

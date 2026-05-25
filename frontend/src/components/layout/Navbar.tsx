"use client";

import Link from "next/link";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { useZkLogin } from "@/hooks/useZkLogin";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { PandaSelector } from "@/components/panda/PandaSelector";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWalletLogin } from "@/hooks/useWalletLogin";
import { resetWalletLoginState } from "@/lib/auth/walletLoginSession";
import { formatShortAddress } from "@/lib/formatAddress";
import { networkMismatchHint } from "@/lib/sui/network";
import { APP_SUI_NETWORK } from "@/lib/sui/network";
import { useAuthStore } from "@/stores/authStore";

const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/mint", label: "铸造" },
  { href: "/market", label: "市场" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/achievements", label: "成就" },
];

const NETWORK_LABEL = APP_SUI_NETWORK === "testnet" ? "Testnet" : "Mainnet";

export function Navbar() {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const { jwt, isAuthed, user } = useAuth();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { startGoogleLogin, isLoading: zkLoading } = useZkLogin();
  const { isLoading: walletLoginLoading, networkMismatch } = useWalletLogin();

  const { data: pandas } = useQuery<{ id: string; name?: string }[]>({
    queryKey: ["pandas", jwt],
    enabled: !!jwt,
    queryFn: () =>
      fetch("/api/pandas", { headers: { Authorization: `Bearer ${jwt}` } }).then(
        (r) => r.json(),
      ),
  });

  const dashMatch = pathname.match(/^\/dashboard\/([^/]+)/);
  const currentPandaId = dashMatch?.[1];
  const needsWalletSignIn = !!account && !isAuthed;
  const sessionLabel = user?.displayName ?? (user?.walletAddress
    ? formatShortAddress(user.walletAddress)
    : null);

  return (
    <header className="sticky top-0 z-50 h-navbar border-b border-[var(--color-border)] bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="shrink-0 font-serif text-lg font-bold text-bamboo-900 transition-colors hover:text-bamboo-500"
        >
          🐼 TradingPanda
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                pathname === href
                  ? "bg-bamboo-50 text-bamboo-500"
                  : "text-ink-500 hover:bg-paper-card hover:text-ink-900",
              )}
            >
              {label}
            </Link>
          ))}
          {isAuthed && pandas && pandas.length > 0 && (
            <Link
              href={`/dashboard/${pandas[0].id}`}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                pathname.startsWith("/dashboard")
                  ? "bg-bamboo-50 text-bamboo-500"
                  : "text-ink-500 hover:bg-paper-card hover:text-ink-900",
              )}
            >
              模拟盘
            </Link>
          )}
          {isAuthed && (
            <Link
              href="/profile"
              className={clsx(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                pathname === "/profile"
                  ? "bg-bamboo-50 text-bamboo-500"
                  : "text-ink-500 hover:bg-paper-card hover:text-ink-900",
              )}
            >
              我的
            </Link>
          )}
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <span
            className="hidden rounded-md bg-bamboo-50 px-2 py-0.5 text-[11px] font-medium text-bamboo-700 sm:inline"
            title="DApp 使用的链网络"
          >
            {NETWORK_LABEL}
          </span>
          {currentPandaId && pandas && pandas.length > 1 && (
            <PandaSelector
              pandas={pandas}
              currentId={currentPandaId}
              className="hidden lg:flex"
            />
          )}

          {isAuthed && sessionLabel && (
            <span
              className="hidden max-w-[160px] truncate rounded-md bg-bamboo-50 px-2.5 py-1 text-[12px] font-medium text-bamboo-800 sm:inline"
              title={user?.walletAddress ?? undefined}
            >
              已登录 · {sessionLabel}
            </span>
          )}

          {!isAuthed && (
            <>
              <button
                type="button"
                onClick={() => startGoogleLogin()}
                disabled={zkLoading}
                className="hidden rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-paper-card sm:inline-block"
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
            </>
          )}

          {isAuthed && (
            <button
              type="button"
              onClick={() => clearAuth()}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[13px] font-medium text-ink-600 transition-colors hover:bg-paper-card"
            >
              退出
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

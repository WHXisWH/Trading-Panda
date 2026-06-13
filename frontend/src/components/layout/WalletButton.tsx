"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConnectModal, useCurrentAccount } from "@mysten/dapp-kit";
import { useZkLogin } from "@/hooks/useZkLogin";
import { useAuth } from "@/hooks/useAuth";
import { useWalletLogin } from "@/hooks/useWalletLogin";
import { resetWalletLoginState } from "@/lib/auth/walletLoginSession";
import { formatShortAddress } from "@/lib/formatAddress";
import { networkMismatchHint } from "@/lib/sui/network";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import {
  Wallet,
  LogOut,
  ChevronDown,
  User,
  LayoutDashboard,
  Award,
  Flame,
  Loader2,
} from "lucide-react";

/**
 * Wallet / Google / session controls.
 *
 * Three mutually exclusive states:
 *  A) Authenticated → user pill with dropdown (Profile, Dashboard, Achievements,
 *     Leaderboard, Logout)
 *  B) Wallet connected but not authenticated → "Sign In" prompt + Google
 *  C) Fully disconnected → ConnectModal trigger + Google
 */
export function WalletButton() {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const { isAuthed, user } = useAuth();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { startGoogleLogin, isLoading: zkLoading } = useZkLogin();
  const { isLoading: walletLoginLoading, networkMismatch } = useWalletLogin();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── close dropdown on outside click ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── fetch pandas for dashboard link ──
  const { data: pandas } = useQuery<{ id: string; name?: string }[]>({
    queryKey: ["panda", "my", "wallet-button"],
    enabled: !!isAuthed,
    queryFn: async () => {
      const jwt = useAuthStore.getState().accessToken;
      if (!jwt) return [];
      const res = await fetch("/api/panda/my", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = await res.json();
      return json.data ?? json;
    },
  });

  const dashMatch = pathname.match(/^\/dashboard\/([^/]+)/);
  const currentPandaId = dashMatch?.[1];
  const needsWalletSignIn = !!account && !isAuthed;
  const sessionLabel =
    user?.displayName ??
    (user?.walletAddress ? formatShortAddress(user.walletAddress) : null);

  // ═══════════════════════════════════════════════════════════════
  //  State A — Authenticated
  // ═══════════════════════════════════════════════════════════════
  if (isAuthed) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={clsx(
            "flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm font-medium transition-all",
            "hover:border-primary-300 hover:shadow-sm",
            dropdownOpen && "border-primary-400 ring-2 ring-primary-500/10",
          )}
        >
          {/* avatar dot */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="max-w-[120px] truncate text-neutral-700">
            {sessionLabel}
          </span>
          <ChevronDown
            className={clsx(
              "h-3.5 w-3.5 text-neutral-400 transition-transform",
              dropdownOpen && "rotate-180",
            )}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full z-[var(--z-dropdown)] mt-1.5 w-48 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg animate-scale-in">
            {/* ── user info header ── */}
            <div className="border-b border-[var(--color-border)] px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-neutral-900">
                {user?.displayName ?? "User"}
              </p>
              {user?.walletAddress && (
                <p
                  className="truncate text-xs text-neutral-400"
                  title={user.walletAddress}
                >
                  {formatShortAddress(user.walletAddress)}
                </p>
              )}
            </div>

            <Link
              href="/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-primary-50 hover:text-primary-600"
            >
              <User className="h-4 w-4" /> Profile
            </Link>
            {pandas && pandas.length > 0 && (
              <Link
                href={`/dashboard/${currentPandaId ?? pandas[0].id}`}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-primary-50 hover:text-primary-600"
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            )}
            <Link
              href="/achievements"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-primary-50 hover:text-primary-600"
            >
              <Award className="h-4 w-4" /> Achievements
            </Link>
            <Link
              href="/leaderboard"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-primary-50 hover:text-primary-600"
            >
              <Flame className="h-4 w-4" /> Leaderboard
            </Link>

            <div className="mx-2 my-1 border-t border-[var(--color-border)]" />

            <button
              type="button"
              onClick={() => {
                clearAuth();
                setDropdownOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  States B & C — Not authenticated
  // ═══════════════════════════════════════════════════════════════
  const connectLabel = needsWalletSignIn ? "Sign In" : "Connect Wallet";

  return (
    <div className="flex items-center gap-2">
      {/* ── Google login ── */}
      <button
        type="button"
        onClick={() => startGoogleLogin()}
        disabled={zkLoading}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm disabled:opacity-50"
      >
        {zkLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        <span className="hidden sm:inline">Google</span>
      </button>

      {/* ── network mismatch warning ── */}
      {needsWalletSignIn && networkMismatch && !walletLoginLoading && (
        <span
          className="max-w-[140px] text-xs leading-tight text-amber-600"
          title={networkMismatchHint()}
        >
          Switch to Testnet
        </span>
      )}

      {/* ── wallet connect / sign-in ── */}
      {needsWalletSignIn && walletLoginLoading ? (
        <Button variant="primary" size="sm" disabled className="rounded-full">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Signing in…</span>
        </Button>
      ) : (
        <ConnectModal
          trigger={
            <Button
              variant="primary"
              size="sm"
              className="rounded-full"
              onClick={() => resetWalletLoginState()}
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">{connectLabel}</span>
            </Button>
          }
        />
      )}
    </div>
  );
}

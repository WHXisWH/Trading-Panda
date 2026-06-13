"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { ConnectWalletModal } from "@/components/layout/ConnectWalletModal";
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
  const { isLoading: walletLoginLoading, networkMismatch } = useWalletLogin();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
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
        <Button
          variant="primary"
          size="sm"
          className="rounded-full"
          onClick={() => {
            resetWalletLoginState();
            setConnectOpen(true);
          }}
        >
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">{connectLabel}</span>
        </Button>
      )}

      <ConnectWalletModal open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}

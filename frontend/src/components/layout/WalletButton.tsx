"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { ConnectWalletModal } from "@/components/layout/ConnectWalletModal";
import { Tooltip } from "@/components/ui/Tooltip";
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
            "flex items-center gap-2 rounded-full border border-product-line bg-white/[0.055] px-3 py-1.5 text-sm font-medium transition-all",
            "hover:border-product-green/40 hover:shadow-[var(--glow-green)]",
            dropdownOpen && "border-product-green/50 ring-2 ring-product-green/15",
          )}
        >
          {/* avatar dot */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-product-green to-[#bfff87] text-[#071108]">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="max-w-[120px] truncate text-product-text">
            {sessionLabel}
          </span>
          <ChevronDown
            className={clsx(
              "h-3.5 w-3.5 text-product-muted transition-transform",
              dropdownOpen && "rotate-180",
            )}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full z-[calc(var(--z-navbar)+1)] mt-2 w-52 overflow-hidden rounded-2xl border border-product-line bg-[rgba(11,15,11,0.96)] py-1 shadow-[var(--shadow-product)] backdrop-blur-xl animate-scale-in">
            <div className="border-b border-product-line px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-product-text">
                {user?.displayName ?? "User"}
              </p>
              {user?.walletAddress && (
                <Tooltip content={user.walletAddress}>
                  <p className="truncate font-mono text-xs text-product-muted">
                    {formatShortAddress(user.walletAddress)}
                  </p>
                </Tooltip>
              )}
            </div>

            <Link
              href="/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-product-text transition-colors hover:bg-product-green/10 hover:text-product-green"
            >
              <User className="h-4 w-4" /> Profile
            </Link>
            {pandas && pandas.length > 0 && (
              <Link
                href={`/dashboard/${currentPandaId ?? pandas[0].id}`}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-product-text transition-colors hover:bg-product-green/10 hover:text-product-green"
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            )}
            <Link
              href="/achievements"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-product-text transition-colors hover:bg-product-green/10 hover:text-product-green"
            >
              <Award className="h-4 w-4" /> Achievements
            </Link>
            <Link
              href="/leaderboard"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-product-text transition-colors hover:bg-product-green/10 hover:text-product-green"
            >
              <Flame className="h-4 w-4" /> Leaderboard
            </Link>

            <div className="mx-2 my-1 border-t border-product-line" />

            <button
              type="button"
              onClick={() => {
                clearAuth();
                setDropdownOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-product-muted transition-colors hover:bg-product-red/10 hover:text-product-red"
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
        <Tooltip content={networkMismatchHint()}>
          <span className="max-w-[140px] text-xs leading-tight text-amber-600">
            Switch to Testnet
          </span>
        </Tooltip>
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

"use client";

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { useWallets, useConnectWallet } from "@mysten/dapp-kit";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type ConnectableWallet = ReturnType<typeof useWallets>[number];
import { useZkLogin } from "@/hooks/useZkLogin";
import {
  resetWalletLoginState,
  setWalletConnectPending,
} from "@/lib/auth/walletLoginSession";
import { setConnectModalWalletLoginSuppress } from "@/lib/sui/zkLogin";
import { useAuthStore } from "@/stores/authStore";
import { Zap, ShieldCheck, TrendingUp, X, ChevronRight, Loader2, Wallet } from "lucide-react";

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BENEFITS = [
  {
    icon: Zap,
    title: "One-click login",
    desc: "No new accounts or passwords. Connect your wallet and you're in.",
  },
  {
    icon: ShieldCheck,
    title: "Own your panda",
    desc: "Your panda NFT lives in your wallet — fully yours, provably unique.",
  },
  {
    icon: TrendingUp,
    title: "Verifiable trades",
    desc: "Every decision and Merkle root is anchored on Sui. Nothing hidden.",
  },
];

/**
 * Branded connect modal — replaces dapp-kit's generic ConnectModal.
 * Left: wallet list + Google. Right: product-specific value panel.
 * On successful connect, WalletAuthSync auto-triggers wallet login.
 */
export function ConnectWalletModal({ open, onOpenChange }: ConnectWalletModalProps) {
  const pathname = usePathname();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { startGoogleLogin, isLoading: googleLoading } = useZkLogin();
  const allowWalletAutoLogin = useAuthStore((s) => s.allowWalletAutoLogin);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    setConnectModalWalletLoginSuppress(open);
    return () => setConnectModalWalletLoginSuppress(false);
  }, [open]);

  function handleConnect(wallet: ConnectableWallet) {
    setConnecting(wallet.name);
    resetWalletLoginState();
    allowWalletAutoLogin();
    setWalletConnectPending(true);
    connect(
      { wallet },
      {
        onSuccess: () => {
          setConnecting(null);
          setWalletConnectPending(false);
          onOpenChange(false);
        },
        onError: () => {
          setConnecting(null);
          setWalletConnectPending(false);
        },
      },
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-neutral-900/45 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(760px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-lg animate-modal-in focus:outline-none"
          aria-describedby="connect-desc"
        >
          <Dialog.Description id="connect-desc" className="sr-only">
            Connect a Sui wallet or sign in with Google to start raising your AI trading panda.
          </Dialog.Description>

          <div className="grid md:grid-cols-[1fr_300px]">
            {/* ── Left: connect options ── */}
            <div className="flex flex-col gap-5 p-6 sm:p-8">
              <div>
                <Dialog.Title className="text-xl font-bold tracking-tight text-neutral-900">
                  Connect to TradingPanda
                </Dialog.Title>
                <p className="mt-1 text-sm text-neutral-500">
                  Choose how you'd like to sign in.
                </p>
              </div>

              {/* wallet list */}
              <div className="flex flex-col gap-2">
                {wallets.length === 0 && (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-center text-sm text-neutral-500">
                    No Sui wallet detected.{" "}
                    <a
                      href="https://slush.app"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary-600 hover:underline"
                    >
                      Get Slush
                    </a>
                  </div>
                )}
                {wallets.map((wallet) => {
                  const isConnecting = connecting === wallet.name;
                  return (
                    <button
                      key={wallet.name}
                      type="button"
                      disabled={!!connecting}
                      onClick={() => handleConnect(wallet)}
                      className="lift group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left hover:border-primary-300 disabled:opacity-60"
                    >
                      {wallet.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={wallet.icon}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-lg"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                          <Wallet className="h-4 w-4" />
                        </span>
                      )}
                      <span className="flex-1 text-sm font-medium text-neutral-800">
                        {wallet.name}
                      </span>
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-neutral-300 transition-colors group-hover:text-primary-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* divider */}
              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
                <span className="h-px flex-1 bg-neutral-200" />
                or
                <span className="h-px flex-1 bg-neutral-200" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={() => void startGoogleLogin(pathname)}
                disabled={googleLoading || !!connecting}
                className="lift flex items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 hover:border-neutral-300 disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continue with Google
              </button>
            </div>

            {/* ── Right: branded value panel ── */}
            <div className="relative hidden flex-col justify-between gap-6 bg-dark-panel p-7 text-white md:flex">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/assets/ui-logo.png"
                  alt="TradingPanda"
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
                <span className="text-sm font-semibold">TradingPanda</span>
              </div>

              <div className="space-y-5">
                {BENEFITS.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-primary-300 ring-1 ring-white/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/60">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-white/40">
                Simulated trading · Live on Sui Testnet
              </p>
            </div>
          </div>

          <Dialog.Close
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

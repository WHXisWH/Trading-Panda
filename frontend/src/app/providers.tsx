"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider, SuiClientProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { Toaster } from "sonner";
import { useState } from "react";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import { SafeWalletAutoConnect } from "@/components/auth/SafeWalletAutoConnect";
import { WalletAuthSync } from "@/components/auth/WalletAuthSync";
import { ZkLoginResultToast } from "@/components/auth/ZkLoginResultToast";
import {
  isLoginCompatibleWallet,
  sanitizeWalletConnectionStorage,
} from "@/lib/sui/walletConnection";

const SUI_NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet") ?? "testnet";

/** Prefer official Sui Wallet / Slush over Suiet for personal-message login. */
const PREFERRED_WALLETS = ["Sui Wallet", "Slush"];

sanitizeWalletConnectionStorage();

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={{
          testnet: { url: getFullnodeUrl("testnet") },
          mainnet: { url: getFullnodeUrl("mainnet") },
        }}
        defaultNetwork={SUI_NETWORK}
      >
        <WalletProvider
          autoConnect={false}
          preferredWallets={PREFERRED_WALLETS}
          walletFilter={isLoginCompatibleWallet}
          stashedWallet={{ name: "TradingPanda", network: SUI_NETWORK }}
        >
          <SafeWalletAutoConnect />
          <WalletAuthSync />
          <ZkLoginResultToast />
          <OnboardingGuard>{children}</OnboardingGuard>
          <Toaster position="bottom-right" richColors theme="dark" />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

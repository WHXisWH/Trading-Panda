"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider, SuiClientProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { Toaster } from "sonner";
import { useState } from "react";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import { WalletAuthSync } from "@/components/auth/WalletAuthSync";
import { walletSupportsPersonalMessageLogin } from "@/lib/sui/walletCompat";

const SUI_NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet") ?? "testnet";

/** Prefer official Sui Wallet / Slush over Suiet for personal-message login. */
const PREFERRED_WALLETS = ["Sui Wallet", "Slush"];

function loginWalletFilter(wallet: {
  features: Record<string, unknown>;
}): boolean {
  const f = wallet.features as {
    "sui:signTransaction"?: unknown;
    "sui:signTransactionBlock"?: unknown;
    "sui:signPersonalMessage"?: unknown;
    "sui:signMessage"?: unknown;
  };
  const canSignTx = Boolean(f["sui:signTransaction"] || f["sui:signTransactionBlock"]);
  return canSignTx && walletSupportsPersonalMessageLogin(f);
}

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
          autoConnect
          preferredWallets={PREFERRED_WALLETS}
          walletFilter={loginWalletFilter}
          stashedWallet={{ name: "TradingPanda", network: SUI_NETWORK }}
        >
          <WalletAuthSync />
          <OnboardingGuard>{children}</OnboardingGuard>
          <Toaster position="bottom-right" richColors />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

import { Suspense } from "react";
import { AgentWalletPageSkeleton } from "@/components/agent-wallet/AgentWalletPageSkeleton";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import AgentWalletPageClient from "./AgentWalletPageClient";

export default function AgentWalletPage() {
  return (
    <Suspense
      fallback={
        <ProductPageShell density="medium">
          <AgentWalletPageSkeleton message="Preparing Agent Wallet…" />
        </ProductPageShell>
      }
    >
      <AgentWalletPageClient />
    </Suspense>
  );
}

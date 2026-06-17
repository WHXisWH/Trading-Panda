import { Suspense } from "react";
import AgentWalletPageClient from "./AgentWalletPageClient";

export default function AgentWalletPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-[13px] text-product-muted">Loading…</div>
      }
    >
      <AgentWalletPageClient />
    </Suspense>
  );
}

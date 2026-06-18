"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AgentWalletPageContent } from "@/components/agent-wallet/AgentWalletPage";
import { AgentWalletPageSkeleton } from "@/components/agent-wallet/AgentWalletPageSkeleton";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyPandas } from "@/services/panda.service";

export default function AgentWalletPageClient() {
  const searchParams = useSearchParams();
  const pandaId = searchParams.get("panda");
  const { jwt } = useAuth();

  const { data: pandas, isLoading } = useQuery({
    queryKey: ["panda", "my", jwt],
    queryFn: () => fetchMyPandas(jwt!),
    enabled: !!jwt,
  });

  const panda =
    pandas?.find((p) => p.id === pandaId) ?? (pandas && pandas.length > 0 ? pandas[0] : null);

  if (!jwt || isLoading) {
    return (
      <ProductPageShell density="medium">
        <AgentWalletPageSkeleton
          message={!jwt ? "Connecting session…" : "Loading your Panda…"}
        />
      </ProductPageShell>
    );
  }

  if (!panda) {
    return (
      <ProductPageShell className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-12">
        <p className="text-[13px] text-product-muted">Mint a Panda before setting up Agent Wallet.</p>
        <Link href="/mint">
          <Button className="agent-wallet-btn-primary">Mint Panda</Button>
        </Link>
      </ProductPageShell>
    );
  }

  return (
    <ProductPageShell density="medium">
      <AgentWalletPageContent jwt={jwt} panda={panda} />
    </ProductPageShell>
  );
}

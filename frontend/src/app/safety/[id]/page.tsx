"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { EmergencyControlsPage } from "@/components/safety/EmergencyControlsPage";
import { SafetyPageSkeleton } from "@/components/safety/SafetyPageSkeleton";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyPandas } from "@/services/panda.service";

export default function SafetyRoutePage({ params }: { params: { id: string } }) {
  const { jwt } = useAuth();
  const pandaId = params.id;

  const { data: pandas, isLoading } = useQuery({
    queryKey: ["panda", "my", jwt],
    queryFn: () => fetchMyPandas(jwt!),
    enabled: !!jwt,
  });

  const panda = pandas?.find((p) => p.id === pandaId);

  if (!jwt || isLoading) {
    return (
      <ProductPageShell density="urgent">
        <SafetyPageSkeleton message="Loading safety controls…" />
      </ProductPageShell>
    );
  }

  if (!panda) {
    return (
      <ProductPageShell density="urgent" className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-[13px] text-product-muted">Panda not found or not owned.</p>
        <Link href="/mint">
          <Button>Mint Panda</Button>
        </Link>
      </ProductPageShell>
    );
  }

  return (
    <ProductPageShell density="urgent">
      <EmergencyControlsPage pandaId={pandaId} />
    </ProductPageShell>
  );
}

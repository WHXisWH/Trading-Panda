"use client";

import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface TrainingLedgerPageSkeletonProps {
  message?: string;
}

/** Product-themed placeholder while Training Ledger data loads. */
export function TrainingLedgerPageSkeleton({
  message = "Loading training cockpit…",
}: TrainingLedgerPageSkeletonProps) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading Training Ledger">
      <header className="ledger-page-header">
        <div className="ledger-page-header-copy space-y-2">
          <Skeleton variant="product" className="h-3 w-28 rounded-full" />
          <Skeleton variant="product" className="h-9 w-[min(100%,16rem)] rounded-xl" />
        </div>
        <div className="ledger-header-metrics w-full space-y-2">
          <div className="ledger-header-metrics-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ledger-header-metric">
                <Skeleton variant="product" className="ml-auto h-2.5 w-12 rounded-full sm:ml-auto" />
                <Skeleton variant="product" className="ml-auto h-4 w-16 rounded-lg sm:ml-auto" />
              </div>
            ))}
          </div>
          <Skeleton variant="product" className="h-3 w-24 rounded-full" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <section className="ledger-surface space-y-3 p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton variant="product" className="h-7 w-20 rounded-full" />
            <Skeleton variant="product" className="h-7 w-24 rounded-full" />
            <Skeleton variant="product" className="h-7 w-16 rounded-full" />
          </div>
          <Skeleton variant="product" className="h-[min(52dvh,28rem)] w-full rounded-[18px]" />
        </section>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <section key={i} className="ledger-rail-section ledger-surface space-y-3 p-4">
              <Skeleton variant="product" className="h-3 w-24 rounded-full" />
              <Skeleton variant="product" className="h-20 w-full rounded-[14px]" />
            </section>
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <div className="space-y-2">
          <Skeleton variant="product" className="h-3 w-24 rounded-full" />
          <Skeleton variant="product" className="h-5 w-40 rounded-lg" />
        </div>
        <Skeleton variant="product" className="h-48 w-full rounded-[18px]" />
      </section>

      <p className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-wide text-product-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-product-green" aria-hidden />
        {message}
      </p>
    </div>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface AgentWalletPageSkeletonProps {
  message?: string;
}

/** Product-themed placeholder while Agent Wallet data loads. */
export function AgentWalletPageSkeleton({
  message = "Loading Agent Wallet…",
}: AgentWalletPageSkeletonProps) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading Agent Wallet">
      <header className="space-y-2.5">
        <Skeleton variant="product" className="h-3 w-36 rounded-full" />
        <Skeleton variant="product" className="h-9 w-[min(100%,18rem)] rounded-xl" />
        <Skeleton variant="product" className="h-4 w-full max-w-2xl rounded-lg" />
        <Skeleton variant="product" className="h-4 w-[min(100%,28rem)] rounded-lg" />
      </header>

      <div className="agent-wallet-status-strip flex flex-wrap gap-2 px-3.5 py-2.5">
        <Skeleton variant="product" className="h-7 w-24 rounded-full" />
        <Skeleton variant="product" className="h-7 w-28 rounded-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="agent-wallet-card space-y-4 p-5">
          <Skeleton variant="product" className="h-3 w-28 rounded-full" />
          <Skeleton variant="product" className="h-6 w-40 rounded-lg" />
          <Skeleton variant="product" className="h-3 w-full max-w-xs rounded-lg" />
          <div className="space-y-2.5 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton variant="product" className="h-3 w-24 rounded-full" />
                <Skeleton variant="product" className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="agent-wallet-card space-y-5 p-5 md:p-6">
          <div className="space-y-2">
            <Skeleton variant="product" className="h-3 w-24 rounded-full" />
            <Skeleton variant="product" className="h-7 w-36 rounded-lg" />
            <Skeleton variant="product" className="h-3 w-full max-w-md rounded-lg" />
          </div>

          <div className="agent-wallet-inset space-y-5 p-4 md:p-5">
            <div className="space-y-3">
              <Skeleton variant="product" className="h-3 w-28 rounded-full" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="product" className="h-9 w-[5.5rem] rounded-full" />
                ))}
              </div>
            </div>

            <div className="agent-wallet-divider grid gap-4 pt-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton variant="product" className="h-3 w-32 rounded-full" />
                <Skeleton variant="product" className="h-11 w-full rounded-[14px]" />
              </div>
              <div className="space-y-2">
                <Skeleton variant="product" className="h-3 w-28 rounded-full" />
                <Skeleton variant="product" className="h-11 w-full rounded-[14px]" />
              </div>
            </div>

            <div className="agent-wallet-divider space-y-2 pt-5">
              <Skeleton variant="product" className="h-3 w-24 rounded-full" />
              <Skeleton variant="product" className="h-11 w-full rounded-[14px]" />
            </div>
          </div>

          <Skeleton variant="product" className="h-28 w-full rounded-[18px]" />
          <Skeleton variant="product" className="h-11 w-44 rounded-xl" />
        </section>
      </div>

      <p className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-wide text-product-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-product-green" aria-hidden />
        {message}
      </p>
    </div>
  );
}

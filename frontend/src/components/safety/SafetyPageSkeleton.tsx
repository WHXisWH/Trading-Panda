"use client";

import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface SafetyPageSkeletonProps {
  message?: string;
}

/** Product-themed placeholder while Safety Desk data loads. */
export function SafetyPageSkeleton({
  message = "Loading safety controls…",
}: SafetyPageSkeletonProps) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading safety controls">
      <header className="space-y-2.5">
        <Skeleton variant="product" className="h-3 w-28 rounded-full" />
        <Skeleton variant="product" className="h-9 w-[min(100%,16rem)] rounded-xl" />
        <Skeleton variant="product" className="h-4 w-full max-w-2xl rounded-lg" />
      </header>

      <Skeleton
        variant="product"
        className="h-[min(11rem,28dvh)] w-full rounded-[24px] ring-1 ring-product-red/10"
      />

      <div className="flex flex-wrap gap-2 rounded-xl border border-product-line/40 bg-product-panel/50 px-3 py-2.5">
        <Skeleton variant="product" className="h-7 w-24 rounded-full" />
        <Skeleton variant="product" className="h-7 w-28 rounded-full" />
        <Skeleton variant="product" className="h-7 w-32 rounded-full" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="product-panel space-y-4 p-5 md:p-6">
          <Skeleton variant="product" className="h-3 w-32 rounded-full" />
          <Skeleton variant="product" className="h-6 w-48 rounded-lg" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton variant="product" className="h-28 rounded-[18px]" />
            <Skeleton variant="product" className="h-28 rounded-[18px]" />
          </div>
          <div className="space-y-2.5 border-t border-product-line/30 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton variant="product" className="h-3 w-28 rounded-full" />
                <Skeleton variant="product" className="h-4 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton variant="product" className="h-14 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton variant="product" className="h-12 rounded-2xl" />
            <Skeleton variant="product" className="h-12 rounded-2xl" />
          </div>
        </div>
      </div>

      <Skeleton variant="product" className="h-16 w-full rounded-xl" />

      <p className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-wide text-product-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-product-green" aria-hidden />
        {message}
      </p>
    </div>
  );
}

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
    <div className="space-y-8" aria-busy="true" aria-label="Loading safety controls">
      <header className="space-y-2.5">
        <Skeleton variant="product" className="h-3 w-28 rounded-full" />
        <Skeleton variant="product" className="h-9 w-[min(100%,16rem)] rounded-xl" />
        <Skeleton variant="product" className="h-4 w-full max-w-2xl rounded-lg" />
      </header>

      <Skeleton variant="product" className="safety-hero h-[min(11rem,28dvh)] w-full" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-3">
          <Skeleton variant="product" className="h-3 w-16 rounded-full" />
          <Skeleton variant="product" className="h-5 w-36 rounded-lg" />
          <Skeleton variant="product" className="h-[11.5rem] w-full rounded-[18px]" />
        </div>

        <div className="space-y-3">
          <Skeleton variant="product" className="h-3 w-16 rounded-full" />
          <Skeleton variant="product" className="h-5 w-40 rounded-lg" />
          <div className="safety-surface space-y-4 p-5 md:p-6">
            <Skeleton variant="product" className="h-3 w-32 rounded-full" />
            <Skeleton variant="product" className="h-6 w-48 rounded-lg" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton variant="product" className="h-28 rounded-[18px]" />
              <Skeleton variant="product" className="h-28 rounded-[18px]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-0 py-0">
        <Skeleton variant="product" className="h-7 w-24 rounded-full" />
        <Skeleton variant="product" className="h-7 w-28 rounded-full" />
        <Skeleton variant="product" className="h-7 w-32 rounded-full" />
      </div>

      <Skeleton variant="product" className="h-16 w-full rounded-xl" />

      <p className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-wide text-product-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-product-green" aria-hidden />
        {message}
      </p>
    </div>
  );
}

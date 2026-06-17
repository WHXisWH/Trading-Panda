"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";

export type ProductDensity = "low" | "medium" | "high" | "urgent";

const densityClass: Record<ProductDensity, string> = {
  low: "max-w-mint",
  medium: "max-w-5xl",
  high: "max-w-page",
  urgent: "max-w-4xl",
};

interface ProductPageShellProps {
  density?: ProductDensity;
  children: ReactNode;
  className?: string;
}

/** Black-gold product canvas for MVP journey pages (Epic 10 visual system). */
export function ProductPageShell({
  density = "medium",
  children,
  className,
}: ProductPageShellProps) {
  return (
    <div className="min-h-[calc(100dvh-var(--navbar-height))] text-product-text">
      <div
        className={clsx(
          "relative mx-auto w-full px-4 py-8 md:px-6",
          densityClass[density],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

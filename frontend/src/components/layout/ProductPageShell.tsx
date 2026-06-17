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
  /** Lock content to one viewport below the navbar (no page scroll). */
  fitViewport?: boolean;
  children: ReactNode;
  className?: string;
}

/** Black-gold product canvas for MVP journey pages (Epic 10 visual system). */
export function ProductPageShell({
  density = "medium",
  fitViewport = false,
  children,
  className,
}: ProductPageShellProps) {
  return (
    <div
      className={clsx(
        "text-product-text",
        fitViewport
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "min-h-[calc(100dvh-var(--navbar-height))]",
      )}
    >
      <div
        className={clsx(
          "relative mx-auto w-full px-4 md:px-6",
          fitViewport ? "flex min-h-0 flex-1 flex-col overflow-hidden !py-2 md:!py-3" : "py-8",
          densityClass[density],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

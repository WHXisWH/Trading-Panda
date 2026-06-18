"use client";

import { clsx } from "clsx";
import type { StrategySurfaceTheme } from "@/lib/ui/strategySurfaceTheme";

interface Props {
  version?: number | null;
  isActive?: boolean;
  isDraft?: boolean;
  matchScore?: number | null;
  theme?: StrategySurfaceTheme;
}

export function StrategyVersionBar({
  version,
  isActive,
  isDraft,
  matchScore,
  theme = "light",
}: Props) {
  const isProduct = theme === "product";

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-2 px-4 py-3.5",
        isProduct
          ? "strategy-feed-card"
          : "rounded-xl border border-[var(--color-border)] bg-white",
      )}
    >
      <span
        className={clsx(
          "text-[11px] font-semibold uppercase tracking-wide",
          isProduct ? "text-product-gold/75" : "text-neutral-500",
        )}
      >
        Strategy version
      </span>
      {version ? (
        <span
          className={clsx(
            "rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold",
            isProduct ? "strategy-feed-chip text-product-gold" : "bg-neutral-900 text-white",
          )}
        >
          v{version}
        </span>
      ) : (
        <span
          className={clsx(
            "rounded-full px-2.5 py-0.5 text-[11px]",
            isProduct
              ? "strategy-feed-chip strategy-feed-chip--warn text-product-amber"
              : "bg-amber-100 text-amber-800",
          )}
        >
          No active version
        </span>
      )}
      {isDraft ? (
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[11px]",
            isProduct
              ? "strategy-feed-chip strategy-feed-chip--draft text-product-muted"
              : "bg-neutral-100 text-neutral-600",
          )}
        >
          Draft
        </span>
      ) : null}
      {isActive ? (
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[11px]",
            isProduct
              ? "strategy-feed-chip strategy-feed-chip--pass text-product-green"
              : "bg-emerald-100 text-emerald-700",
          )}
        >
          Active
        </span>
      ) : null}
      {matchScore != null ? (
        <span
          className={clsx(
            "ml-auto text-[11px]",
            isProduct ? "text-product-muted" : "text-neutral-500",
          )}
        >
          Panda fit{" "}
          <span className={isProduct ? "font-semibold text-product-green" : ""}>
            {matchScore}%
          </span>
        </span>
      ) : null}
    </div>
  );
}

"use client";

import { clsx } from "clsx";
import type { StrategySurfaceTheme } from "@/lib/ui/strategySurfaceTheme";
import type { GhostInfluenceSummary, StrategyShadowInfo } from "@/types/strategy";

interface Props {
  ghost?: GhostInfluenceSummary | StrategyShadowInfo | null;
  theme?: StrategySurfaceTheme;
}

export function GhostInfluenceHint({ ghost, theme = "light" }: Props) {
  if (!ghost) return null;

  const isProduct = theme === "product";
  const weight = "ghost_weight" in ghost ? ghost.ghost_weight : 0;
  const decay =
    "expected_decay_trades" in ghost ? ghost.expected_decay_trades : 50;
  const summary =
    "summary" in ghost && ghost.summary
      ? ghost.summary
      : `Old habits may fade over the next ${decay} trades.`;

  return (
    <div
      className={clsx(
        "rounded-[18px] px-4 py-3.5 text-[12px]",
        isProduct
          ? "strategy-feed-ghost text-product-muted"
          : "border border-dashed border-neutral-300 bg-neutral-50 text-neutral-600",
      )}
    >
      <p
        className={clsx(
          "font-medium",
          isProduct ? "text-product-gold/90" : "text-neutral-800",
        )}
      >
        Ghost influence
      </p>
      <p className="mt-1">{summary}</p>
      <p className={clsx("mt-1 text-[11px]", isProduct && "text-product-muted/85")}>
        Previous strategy residue is active but cannot override TradingPolicy.
      </p>
      <button
        type="button"
        className={clsx(
          "mt-2 text-[11px] underline-offset-2 hover:underline",
          isProduct ? "text-product-green" : "text-primary-600",
        )}
        onClick={() => {
          /* drawer opened by parent */
        }}
        hidden
      >
        Residual weight ~{(weight * 100).toFixed(0)}%
      </button>
    </div>
  );
}

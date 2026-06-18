"use client";

import { clsx } from "clsx";
import { STRATEGY_TEMPLATES } from "@/lib/strategyBuilder";
import type { StrategySurfaceTheme } from "@/lib/ui/strategySurfaceTheme";
import type { SignalRuleRow } from "@/types/strategy";
import { newRuleRow } from "@/lib/strategyBuilder";

interface Props {
  hasExistingRules: boolean;
  theme?: StrategySurfaceTheme;
  onApply: (
    rules: SignalRuleRow[],
    philosophy: typeof STRATEGY_TEMPLATES[0]["philosophy"],
    extras?: { positionPct?: number; stopLossPct?: number },
  ) => void;
}

export function StrategyTemplates({ hasExistingRules, theme = "light", onApply }: Props) {
  const isProduct = theme === "product";

  return (
    <div className="flex flex-wrap gap-2">
      {STRATEGY_TEMPLATES.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          className={clsx(
            "rounded-full px-3 py-1.5 text-[11px] transition-colors",
            isProduct
              ? "strategy-feed-template-chip text-product-gold/90"
              : "border border-dashed border-primary-500 text-primary-600 hover:bg-primary-50",
          )}
          onClick={() => {
            const rows = tpl.rules.map((r) => newRuleRow({ ...r, id: crypto.randomUUID() }));
            onApply(
              rows,
              tpl.philosophy,
              { positionPct: tpl.positionPct, stopLossPct: tpl.stopLossPct },
            );
          }}
        >
          {tpl.name}
        </button>
      ))}
      {hasExistingRules && isProduct ? (
        <span className="self-center text-[10px] text-product-muted/75">
          Templates append when rules exist
        </span>
      ) : null}
    </div>
  );
}

"use client";

import { STRATEGY_TEMPLATES } from "@/lib/strategyBuilder";
import type { SignalRuleRow } from "@/types/strategy";
import { newRuleRow } from "@/lib/strategyBuilder";

interface Props {
  hasExistingRules: boolean;
  onApply: (
    rules: SignalRuleRow[],
    philosophy: typeof STRATEGY_TEMPLATES[0]["philosophy"],
    extras?: { positionPct?: number; stopLossPct?: number },
  ) => void;
}

export function StrategyTemplates({ hasExistingRules, onApply }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {STRATEGY_TEMPLATES.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          className="rounded-full border border-dashed border-primary-500 px-3 py-1 text-[11px] text-primary-600 hover:bg-primary-50"
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
    </div>
  );
}

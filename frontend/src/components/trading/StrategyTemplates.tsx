"use client";

import { STRATEGY_TEMPLATES } from "@/lib/strategyBuilder";
import type { SignalRuleRow } from "@/types/strategy";
import { newRuleRow } from "@/lib/strategyBuilder";

interface Props {
  hasExistingRules: boolean;
  onApply: (rules: SignalRuleRow[], philosophy: typeof STRATEGY_TEMPLATES[0]["philosophy"]) => void;
}

export function StrategyTemplates({ hasExistingRules, onApply }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {STRATEGY_TEMPLATES.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          className="rounded-full border border-dashed border-bamboo-400 px-3 py-1 text-[11px] text-bamboo-600 hover:bg-bamboo-50"
          onClick={() => {
            const rows = tpl.rules.map((r) => newRuleRow({ ...r, id: crypto.randomUUID() }));
            onApply(
              hasExistingRules
                ? rows
                : rows,
              tpl.philosophy,
            );
          }}
        >
          {tpl.name}
        </button>
      ))}
    </div>
  );
}

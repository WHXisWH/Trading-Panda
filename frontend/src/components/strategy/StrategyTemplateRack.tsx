"use client";

import { STRATEGY_TEMPLATES } from "@/lib/strategyBuilder";
import type { Philosophy, SignalRuleRow } from "@/types/strategy";
import { newRuleRow } from "@/lib/strategyBuilder";

export interface StrategyTemplateApplyPayload {
  rules: SignalRuleRow[];
  philosophy: Philosophy;
  positionPct?: number;
  stopLossPct?: number;
  templateId?: string;
}

interface Props {
  onApply: (payload: StrategyTemplateApplyPayload) => void;
  selectedId?: string | null;
}

export function StrategyTemplateRack({ onApply, selectedId }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {STRATEGY_TEMPLATES.map((tpl) => {
        const active = selectedId === tpl.id;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => {
              const rows = tpl.rules.map((r) => newRuleRow({ ...r, id: crypto.randomUUID() }));
              onApply({
                rules: rows,
                philosophy: tpl.philosophy,
                positionPct: tpl.positionPct,
                stopLossPct: tpl.stopLossPct,
                templateId: tpl.id,
              });
            }}
            className={[
              "rounded-xl border px-4 py-3 text-left transition-colors",
              active
                ? "border-primary-500 bg-primary-50"
                : "border-[var(--color-border)] bg-white hover:border-primary-300",
            ].join(" ")}
          >
            <p className="text-[13px] font-semibold text-neutral-900">{tpl.name}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{tpl.description}</p>
          </button>
        );
      })}
    </div>
  );
}

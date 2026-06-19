"use client";

import { Check, ChevronRight } from "lucide-react";
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
  onPreview?: (payload: StrategyTemplateApplyPayload) => void;
  templateIds?: string[];
}

export function StrategyTemplateRack({
  onApply,
  selectedId,
  onPreview,
  templateIds,
}: Props) {
  const templates = templateIds?.length
    ? STRATEGY_TEMPLATES.filter((tpl) => templateIds.includes(tpl.id))
    : STRATEGY_TEMPLATES;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      {templates.map((tpl) => {
        const active = selectedId === tpl.id;
        const payload: StrategyTemplateApplyPayload = {
          rules: tpl.rules.map((r) => newRuleRow({ ...r, id: crypto.randomUUID() })),
          philosophy: tpl.philosophy,
          positionPct: tpl.positionPct,
          stopLossPct: tpl.stopLossPct,
          templateId: tpl.id,
        };
        return (
          <div
            key={tpl.id}
            className={[
              "rounded-[18px] border px-4 py-3 text-left transition-colors",
              active
                ? "border-product-green/50 bg-product-green/10"
                : "border-product-line/80 bg-product-panel/70 hover:border-product-green/30 hover:bg-product-panel",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => onApply(payload)}
              onMouseEnter={() => onPreview?.(payload)}
              onFocus={() => onPreview?.(payload)}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-product-text">{tpl.name}</span>
                  {active ? <Check className="h-3.5 w-3.5 text-product-green" /> : null}
                </span>
                <span className="mt-1 block text-[11px] leading-relaxed text-product-muted">
                  {tpl.description}
                </span>
              </span>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-product-muted/70" />
            </button>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="strategy-feed-chip rounded-full px-2 py-0.5 text-[10px] text-product-gold/90">
                {tpl.philosophy.replace("_", " ")}
              </span>
              {tpl.positionPct != null ? (
                <span className="strategy-feed-chip rounded-full px-2 py-0.5 text-[10px] text-product-muted">
                  {(tpl.positionPct * 100).toFixed(0)}% entry
                </span>
              ) : null}
              <span className="strategy-feed-chip rounded-full px-2 py-0.5 text-[10px] text-product-muted">
                {tpl.rules.length} rules
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

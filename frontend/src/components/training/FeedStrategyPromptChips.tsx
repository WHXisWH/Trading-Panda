"use client";

import { clsx } from "clsx";
import type { StrategyPromptTemplate } from "@/lib/strategyPromptTemplates";

interface FeedStrategyPromptChipsProps {
  templates: StrategyPromptTemplate[];
  onSelect: (prompt: string) => void;
  compact?: boolean;
}

export function FeedStrategyPromptChips({
  templates,
  onSelect,
  compact = false,
}: FeedStrategyPromptChipsProps) {
  return (
    <div className={clsx("flex flex-wrap gap-2", compact ? "" : "justify-center")}>
      {templates.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.prompt)}
          className={clsx(
            "strategy-feed-chip rounded-full text-left transition-colors hover:bg-product-green/10",
            compact ? "px-2.5 py-1.5" : "px-3 py-2",
          )}
        >
          <span className="block text-[11px] font-semibold text-product-text">{item.label}</span>
          {!compact ? (
            <span className="mt-0.5 block text-[10px] leading-snug text-product-muted">{item.scene}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

"use client";

import { StrategyBuilder } from "@/components/trading/StrategyBuilder";
import type { ParsedStrategyLayers, StrategyRecord } from "@/types/strategy";

interface Props {
  compact?: boolean;
  builderKey: string;
  loading: boolean;
  parseLoading: boolean;
  matchScore: number | null;
  warnings: string[];
  invalidRuleIndexes: number[];
  initialParsed: ParsedStrategyLayers | null;
  strategy: StrategyRecord | null | undefined;
  pandaReaction: string | null;
  onValidate: (parsed: ParsedStrategyLayers) => void;
  onSubmit: (parsed: ParsedStrategyLayers) => void;
  onParseText: (text: string) => void;
}

export function DashboardStrategySection({
  compact = false,
  builderKey,
  loading,
  parseLoading,
  matchScore,
  warnings,
  invalidRuleIndexes,
  initialParsed,
  strategy,
  pandaReaction,
  onValidate,
  onSubmit,
  onParseText,
}: Props) {
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3">
      <StrategyBuilder
        key={builderKey}
        compact={compact}
        loading={loading}
        parseLoading={parseLoading}
        matchScore={matchScore}
        warnings={warnings}
        invalidRuleIndexes={invalidRuleIndexes}
        initialParsed={initialParsed}
        onValidate={onValidate}
        onSubmit={onSubmit}
        onParseText={onParseText}
      />

      {strategy && (
        <p className="rounded-lg bg-paper-card px-3 py-2 text-[12px] italic text-ink-500">
          当前策略：{strategy.raw_text.slice(0, 120)}
          {strategy.raw_text.length > 120 ? "…" : ""}
        </p>
      )}

      {pandaReaction && (
        <p className="rounded-lg border border-bamboo-100 bg-bamboo-50 px-3 py-2 text-[12px] text-bamboo-600">
          🐼 {pandaReaction}
        </p>
      )}
    </div>
  );
}

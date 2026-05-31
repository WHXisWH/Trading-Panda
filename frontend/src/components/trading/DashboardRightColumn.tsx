"use client";

import { clsx } from "clsx";
import { DashboardStrategySection } from "@/components/trading/DashboardStrategySection";
import type { ParsedStrategyLayers, StrategyRecord } from "@/types/strategy";

interface StrategyProps {
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

interface Props {
  strategy: StrategyProps;
  className?: string;
}

export function DashboardRightColumn({ strategy, className }: Props) {
  return (
    <aside
      className={clsx(
        "dashboard-col-right flex min-w-0 max-w-full flex-col",
        "xl:sticky xl:top-[calc(var(--navbar-height)+0.5rem)] xl:max-h-[calc(100dvh-var(--navbar-height)-1rem)]",
        className,
      )}
    >
      <div className="dashboard-strategy-scroll min-h-0 flex-1 overflow-y-auto">
        <DashboardStrategySection {...strategy} compact />
      </div>
    </aside>
  );
}

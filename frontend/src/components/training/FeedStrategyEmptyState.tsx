"use client";

import { FeedStrategyPromptBlock } from "@/components/training/FeedStrategyPromptBlock";
import type { StrategyPromptTemplate } from "@/lib/strategyPromptTemplates";

interface FeedStrategyEmptyStateProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onParse: () => void;
  parsing: boolean;
  parseError: string | null;
  templates: StrategyPromptTemplate[];
  activePool: string;
  authorizedPools: string[];
  agentWalletHref: string;
}

export function FeedStrategyEmptyState(props: FeedStrategyEmptyStateProps) {
  return (
    <div className="py-6">
      <FeedStrategyPromptBlock {...props} centered />
    </div>
  );
}

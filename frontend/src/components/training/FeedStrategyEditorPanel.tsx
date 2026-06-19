"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StrategyBuilder } from "@/components/trading/StrategyBuilder";
import { FeedStrategyRiskBudgetFields } from "@/components/training/FeedStrategyRiskBudgetFields";
import type { ParsedStrategyLayers, StrategyValidateData } from "@/types/strategy";

interface FeedStrategyEditorPanelProps {
  title: string;
  onTitleChange: (value: string) => void;
  humanSummary: string;
  parsed: ParsedStrategyLayers | null;
  builderKey: string;
  warnings: string[];
  invalidRuleIndexes: number[];
  saving: boolean;
  validateData: StrategyValidateData | null;
  trainingBudget: number;
  maxNotionalPerTrade?: number | null;
  showGhostHint: boolean;
  isActiveDraft: boolean;
  onDraftChange: (parsed: ParsedStrategyLayers) => void;
  onSave: () => void;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

export function FeedStrategyEditorPanel({
  title,
  onTitleChange,
  humanSummary,
  parsed,
  builderKey,
  warnings,
  invalidRuleIndexes,
  saving,
  validateData,
  trainingBudget,
  maxNotionalPerTrade,
  showGhostHint,
  isActiveDraft,
  onDraftChange,
  onSave,
  hideHeader = false,
  hideFooter = false,
}: FeedStrategyEditorPanelProps) {
  return (
    <section className="flex min-h-0 flex-col gap-4">
      {!hideHeader ? (
      <div>
        <p className="ledger-step-label">Rule blocks</p>
        <Input
          surface="inset"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Playbook name"
          className="mt-2"
        />
        {humanSummary ? (
          <p className="mt-3 rounded-[16px] bg-black/20 px-3 py-2 text-[12px] leading-relaxed text-product-text">
            {humanSummary}
          </p>
        ) : null}
      </div>
      ) : (
        <div>
          <p className="ledger-step-label">Playbook name</p>
          <Input
            surface="inset"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Playbook name"
            className="mt-2"
          />
        </div>
      )}

      {parsed ? (
        <FeedStrategyRiskBudgetFields
          parsed={parsed}
          trainingBudget={trainingBudget}
          maxNotionalPerTrade={maxNotionalPerTrade}
          conflicts={validateData?.policy_conflicts}
          blockedPairs={validateData?.blocked_pairs}
          onParsedChange={onDraftChange}
        />
      ) : null}

      {parsed ? (
        <StrategyBuilder
          key={builderKey}
          theme="product"
          compact
          showTemplates={false}
          showActions={false}
          showRiskControls={false}
          showLlmInput={false}
          englishLabels
          initialParsed={parsed}
          matchScore={null}
          warnings={warnings}
          invalidRuleIndexes={invalidRuleIndexes}
          loading={saving}
          onDraftChange={onDraftChange}
          onValidate={() => {}}
          onSubmit={onSave}
          onParseText={() => {}}
        />
      ) : (
        <p className="text-[12px] text-product-muted">
          Select a saved playbook or draft with AI to start editing.
        </p>
      )}

      {showGhostHint ? (
        <p className="strategy-feed-ghost rounded-[16px] px-3 py-2 text-[11px] text-product-muted">
          The Panda still carries a little old habit — it should fade over the next stretch of trades.
        </p>
      ) : null}

      {isActiveDraft ? (
        <p className="text-[11px] text-product-muted">Saving updates the live playbook immediately.</p>
      ) : null}

      {!hideFooter ? (
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="gold" onClick={onSave} loading={saving} disabled={!parsed}>
          Save playbook
        </Button>
      </div>
      ) : null}
    </section>
  );
}

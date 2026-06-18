"use client";

import { clsx } from "clsx";
import { FormField, FormSection } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  canonicalMarketPair,
  dedupeMarketPairs,
  sameMarketPair,
} from "@/lib/market/canonicalMarketPair";
import type { PolicyDraft } from "@/types/agent-wallet";
import { formatPaperUsd, PAPER_BALANCE_DISCLAIMER } from "@/lib/agentWallet/paperUsd";

interface AllowedPairsSelectorProps {
  options: string[];
  selected: string[];
  onChange: (pairs: string[]) => void;
  disabled?: boolean;
}

export function AllowedPairsSelector({
  options,
  selected,
  onChange,
  disabled,
}: AllowedPairsSelectorProps) {
  const toggle = (pair: string) => {
    if (disabled) return;
    if (selected.some((p) => sameMarketPair(p, pair))) {
      onChange(selected.filter((p) => !sameMarketPair(p, pair)));
    } else {
      onChange(dedupeMarketPairs([...selected, canonicalMarketPair(pair)]));
    }
  };

  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((pair) => {
        const active = selected.some((p) => sameMarketPair(p, pair));
        return (
          <button
            key={pair}
            type="button"
            disabled={disabled}
            onClick={() => toggle(pair)}
            className={clsx(
              "product-toggle-chip",
              active && "product-toggle-chip-active",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {pair}
          </button>
        );
      })}
    </div>
  );
}

interface PolicyCollarEditorProps {
  draft: PolicyDraft;
  onChange: (draft: PolicyDraft) => void;
  launchPairs: string[];
  fieldErrors: Record<string, string>;
  disabled?: boolean;
  /** setup = full collar form; budget = training budget only (post-setup edits) */
  mode?: "setup" | "budget";
}

export function PolicyCollarEditor({
  draft,
  onChange,
  launchPairs,
  fieldErrors,
  disabled,
  mode = "setup",
}: PolicyCollarEditorProps) {
  const patch = (partial: Partial<PolicyDraft>) => onChange({ ...draft, ...partial });
  const budgetOnly = mode === "budget";

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="product-eyebrow text-[10px]">
          {budgetOnly ? "Training funds" : "Policy collar"}
        </p>
        <h2 className="font-sans text-xl font-bold tracking-tight text-product-text">
          {budgetOnly ? "Training budget (USD)" : "Risk limits"}
        </h2>
        <p className="max-w-xl text-[12px] leading-relaxed text-product-muted">
          {budgetOnly
            ? `${PAPER_BALANCE_DISCLAIMER}. Not your wallet or real funds.`
            : "Set paper trading capital (USD), then define the on-chain policy collar."}
        </p>
      </header>

      <div className="product-form-surface space-y-5 p-4 md:p-5">
        <FormSection
          title="Training funds"
          description={`${PAPER_BALANCE_DISCLAIMER} for the Training Ledger.`}
        >
          <FormField
            label="Training budget (USD)"
            hint="$100 – $1,000,000. Max order size (USD) cannot exceed this."
            error={fieldErrors.training_budget}
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[13px] font-semibold text-product-muted">
                $
              </span>
              <Input
                type="number"
                min={100}
                max={1_000_000}
                step={100}
                mono
                className="pl-7"
                disabled={disabled}
                value={draft.trainingBudget}
                onChange={(e) => patch({ trainingBudget: Number(e.target.value) })}
              />
            </div>
          </FormField>
        </FormSection>

        {!budgetOnly ? (
          <>
        <FormSection
          divided
          title="Market scope"
          description="Liquidity-first defaults from DeepBook mainnet launch pairs."
        >
          <FormField
            label="Allowed pairs"
            hint="The Panda can only train on selected pairs. Monitor health affects live data."
            error={fieldErrors.allowed_pairs}
          >
            <AllowedPairsSelector
              options={launchPairs}
              selected={draft.allowedPairs}
              onChange={(pairs) => patch({ allowedPairs: pairs })}
              disabled={disabled}
            />
          </FormField>
        </FormSection>

        <FormSection divided title="Risk caps">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Max order size (USD)"
              hint="USD notional per simulated order."
              error={fieldErrors.max_notional_per_trade}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[13px] font-semibold text-product-muted">
                  $
                </span>
                <Input
                  type="number"
                  min={1}
                  mono
                  className="pl-7"
                  disabled={disabled}
                  value={draft.maxNotionalPerTrade}
                  onChange={(e) => patch({ maxNotionalPerTrade: Number(e.target.value) })}
                />
              </div>
            </FormField>

            <FormField
              label="Daily loss cap (%)"
              hint="Hard stop for paper ledger drawdown."
              error={fieldErrors.max_daily_loss}
            >
              <Input
                type="number"
                min={1}
                max={100}
                mono
                disabled={disabled}
                value={draft.maxDailyLoss}
                onChange={(e) => patch({ maxDailyLoss: Number(e.target.value) })}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection divided title="Chain proof">
          <FormField
            label="Proof mode"
            hint="Manual proof first for MVP. Auto proof only when score is high enough."
          >
            <Select
              disabled={disabled}
              value={draft.proofMode}
              onValueChange={(value) => patch({ proofMode: value as PolicyDraft["proofMode"] })}
              aria-label="Proof mode"
              options={[
                { value: "manual", label: "Manual Chain Proof first (MVP)" },
                { value: "auto", label: "Selected auto proof (score ≥ 0.75)" },
              ]}
            />
          </FormField>
        </FormSection>
          </>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { clsx } from "clsx";
import { FormField, FormSection } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { PolicyDraft } from "@/types/agent-wallet";

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
    if (selected.includes(pair)) {
      onChange(selected.filter((p) => p !== pair));
    } else {
      onChange([...selected, pair]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((pair) => {
        const active = selected.includes(pair);
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
}

export function PolicyCollarEditor({
  draft,
  onChange,
  launchPairs,
  fieldErrors,
  disabled,
}: PolicyCollarEditorProps) {
  const patch = (partial: Partial<PolicyDraft>) => onChange({ ...draft, ...partial });

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="product-eyebrow text-[10px]">Policy collar</p>
        <h2 className="font-sans text-xl font-bold tracking-tight text-product-text">Risk limits</h2>
        <p className="max-w-xl text-[12px] leading-relaxed text-product-muted">
          Define the Panda&apos;s bounded playground before signing vault and policy objects on-chain.
        </p>
      </header>

      <div className="product-form-surface space-y-5 p-4 md:p-5">
        <FormSection
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
              label="Max notional per trade"
              hint="Training units per simulated order."
              error={fieldErrors.max_notional_per_trade}
            >
              <Input
                type="number"
                min={1}
                mono
                disabled={disabled}
                value={draft.maxNotionalPerTrade}
                onChange={(e) => patch({ maxNotionalPerTrade: Number(e.target.value) })}
              />
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
      </div>
    </div>
  );
}

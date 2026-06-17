"use client";

import { clsx } from "clsx";
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
    <div className="space-y-2">
      <p className="text-[12px] font-medium text-neutral-700">Allowed pairs</p>
      <div className="flex flex-wrap gap-2">
        {options.map((pair) => {
          const active = selected.includes(pair);
          return (
            <button
              key={pair}
              type="button"
              disabled={disabled}
              onClick={() => toggle(pair)}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-neutral-900"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {pair}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-neutral-500">
        Liquidity-first defaults from DeepBook mainnet launch pairs.
      </p>
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
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Policy collar
        </p>
        <h2 className="font-sans text-lg font-bold">Risk limits</h2>
      </div>

      <AllowedPairsSelector
        options={launchPairs}
        selected={draft.allowedPairs}
        onChange={(pairs) => patch({ allowedPairs: pairs })}
        disabled={disabled}
      />
      {fieldErrors.allowed_pairs ? (
        <p className="text-[12px] text-red-600">{fieldErrors.allowed_pairs}</p>
      ) : null}

      <label className="block space-y-1">
        <span className="text-[12px] font-medium text-neutral-700">Max notional per trade</span>
        <input
          type="number"
          min={1}
          disabled={disabled}
          value={draft.maxNotionalPerTrade}
          onChange={(e) => patch({ maxNotionalPerTrade: Number(e.target.value) })}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-[13px]"
        />
        {fieldErrors.max_notional_per_trade ? (
          <span className="text-[12px] text-red-600">{fieldErrors.max_notional_per_trade}</span>
        ) : null}
      </label>

      <label className="block space-y-1">
        <span className="text-[12px] font-medium text-neutral-700">Daily loss cap (%)</span>
        <input
          type="number"
          min={1}
          max={100}
          disabled={disabled}
          value={draft.maxDailyLoss}
          onChange={(e) => patch({ maxDailyLoss: Number(e.target.value) })}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-[13px]"
        />
        {fieldErrors.max_daily_loss ? (
          <span className="text-[12px] text-red-600">{fieldErrors.max_daily_loss}</span>
        ) : null}
      </label>

      <label className="block space-y-1">
        <span className="text-[12px] font-medium text-neutral-700">Proof mode</span>
        <select
          disabled={disabled}
          value={draft.proofMode}
          onChange={(e) => patch({ proofMode: e.target.value as PolicyDraft["proofMode"] })}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-[13px]"
        >
          <option value="manual">Manual Chain Proof first (MVP)</option>
          <option value="auto">Selected auto proof (score ≥ 0.75)</option>
        </select>
      </label>
    </div>
  );
}

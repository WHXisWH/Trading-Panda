"use client";

import {
  CONDITION_OPTIONS,
  rulePreviewText,
} from "@/lib/strategyBuilder";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import type { SignalRuleRow } from "@/types/strategy";

const INDICATOR_OPTIONS = [
  { value: "RSI", label: "RSI" },
  { value: "MA20", label: "MA20" },
  { value: "MACD", label: "MACD" },
  { value: "PRICE", label: "PRICE" },
];

const ACTION_OPTIONS = [
  { value: "BUY", label: "Buy" },
  { value: "SELL", label: "Sell" },
];

interface Props {
  row: SignalRuleRow;
  invalid?: boolean;
  compact?: boolean;
  onChange: (row: SignalRuleRow) => void;
  onRemove: () => void;
}

export function StrategyRuleRow({ row, invalid, compact = false, onChange, onRemove }: Props) {
  const condOptions = CONDITION_OPTIONS[row.indicator];
  const selectedCond = condOptions.find((c) => c.value === row.condition);
  const needsThreshold = selectedCond?.needsThreshold ?? false;

  const handleIndicator = (indicator: SignalRuleRow["indicator"]) => {
    const first = CONDITION_OPTIONS[indicator][0];
    onChange({
      ...row,
      indicator,
      condition: first.value,
      threshold: first.needsThreshold ? 30 : undefined,
    });
  };

  return (
    <div
      className={`rounded-lg border p-2 ${
        invalid ? "border-red-600 bg-red-50/50" : "border-[var(--color-border)]"
      }`}
    >
      <div
        className={
          compact
            ? "grid grid-cols-1 gap-2"
            : "grid grid-cols-2 gap-2 xl:grid-cols-4"
        }
      >
        <label className="flex flex-col gap-1 text-[10px] text-neutral-500">
          指标
          <Select
            size="sm"
            aria-label="指标"
            value={row.indicator}
            onValueChange={(v) => handleIndicator(v as SignalRuleRow["indicator"])}
            options={INDICATOR_OPTIONS}
          />
        </label>

        <label className="flex flex-col gap-1 text-[10px] text-neutral-500">
          条件
          <Select
            size="sm"
            aria-label="条件"
            value={row.condition}
            onValueChange={(v) => {
              const opt = condOptions.find((c) => c.value === v);
              onChange({
                ...row,
                condition: v,
                threshold: opt?.needsThreshold ? row.threshold ?? 30 : undefined,
              });
            }}
            options={condOptions.map((c) => ({ value: c.value, label: c.label }))}
          />
        </label>

        {needsThreshold ? (
          <label className="flex flex-col gap-1 text-[10px] text-neutral-500">
            阈值
            <Input
              type="number"
              inputSize="sm"
              value={row.threshold ?? ""}
              onChange={(e) =>
                onChange({ ...row, threshold: Number(e.target.value) })
              }
            />
          </label>
        ) : (
          !compact && <div className="hidden xl:block" />
        )}

        <label className="flex flex-col gap-1 text-[10px] text-neutral-500">
          动作
          <Select
            size="sm"
            aria-label="动作"
            value={row.action}
            onValueChange={(v) =>
              onChange({ ...row, action: v as SignalRuleRow["action"] })
            }
            options={ACTION_OPTIONS}
          />
        </label>
      </div>

      <div className="mt-2 flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 break-words text-[11px] text-neutral-500">{rulePreviewText(row)}</p>
        <button
          type="button"
          className="text-[11px] text-red-600 hover:underline"
          onClick={onRemove}
        >
          删除
        </button>
      </div>
    </div>
  );
}

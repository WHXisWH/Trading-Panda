"use client";

import { clsx } from "clsx";
import {
  CONDITION_OPTIONS,
  rulePreviewText,
} from "@/lib/strategyBuilder";
import {
  strategyInsetClass,
  strategyInvalidInsetClass,
  strategyLabelClass,
  strategyMutedClass,
  type StrategySurfaceTheme,
} from "@/lib/ui/strategySurfaceTheme";
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
  theme?: StrategySurfaceTheme;
  onChange: (row: SignalRuleRow) => void;
  onRemove: () => void;
}

export function StrategyRuleRow({
  row,
  invalid,
  compact = false,
  theme = "light",
  onChange,
  onRemove,
}: Props) {
  const isProduct = theme === "product";
  const fieldSurface = isProduct ? ("inset" as const) : ("default" as const);
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
    <div className={invalid ? strategyInvalidInsetClass(theme) : strategyInsetClass(theme)}>
      <div
        className={
          compact
            ? "grid grid-cols-1 gap-2"
            : "grid grid-cols-2 gap-2 xl:grid-cols-4"
        }
      >
        <label className={clsx("flex flex-col gap-1", strategyLabelClass(theme))}>
          指标
          <Select
            size="sm"
            surface={fieldSurface}
            aria-label="指标"
            value={row.indicator}
            onValueChange={(v) => handleIndicator(v as SignalRuleRow["indicator"])}
            options={INDICATOR_OPTIONS}
          />
        </label>

        <label className={clsx("flex flex-col gap-1", strategyLabelClass(theme))}>
          条件
          <Select
            size="sm"
            surface={fieldSurface}
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
          <label className={clsx("flex flex-col gap-1", strategyLabelClass(theme))}>
            阈值
            <Input
              type="number"
              inputSize="sm"
              surface={fieldSurface}
              value={row.threshold ?? ""}
              onChange={(e) =>
                onChange({ ...row, threshold: Number(e.target.value) })
              }
            />
          </label>
        ) : (
          !compact && <div className="hidden xl:block" />
        )}

        <label className={clsx("flex flex-col gap-1", strategyLabelClass(theme))}>
          动作
          <Select
            size="sm"
            surface={fieldSurface}
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
        <p className={clsx("min-w-0 break-words text-[11px]", strategyMutedClass(theme))}>
          {rulePreviewText(row)}
        </p>
        <button
          type="button"
          className={clsx(
            "text-[11px] hover:underline",
            isProduct ? "text-product-red" : "text-red-600",
          )}
          onClick={onRemove}
        >
          删除
        </button>
      </div>
    </div>
  );
}

"use client";

import {
  CONDITION_OPTIONS,
  rulePreviewText,
} from "@/lib/strategyBuilder";
import type { SignalRuleRow } from "@/types/strategy";

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
        invalid ? "border-vermillion bg-red-50/50" : "border-[var(--color-border)]"
      }`}
    >
      <div
        className={
          compact
            ? "grid grid-cols-1 gap-2"
            : "grid grid-cols-2 gap-2 xl:grid-cols-4"
        }
      >
        <label className="flex flex-col gap-1 text-[10px] text-ink-500">
          指标
          <select
            className="rounded border border-[var(--color-border)] bg-white px-2 py-1 text-[12px]"
            value={row.indicator}
            onChange={(e) =>
              handleIndicator(e.target.value as SignalRuleRow["indicator"])
            }
          >
            <option value="RSI">RSI</option>
            <option value="MA20">MA20</option>
            <option value="MACD">MACD</option>
            <option value="PRICE">PRICE</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[10px] text-ink-500">
          条件
          <select
            className="rounded border border-[var(--color-border)] bg-white px-2 py-1 text-[12px]"
            value={row.condition}
            onChange={(e) => {
              const opt = condOptions.find((c) => c.value === e.target.value);
              onChange({
                ...row,
                condition: e.target.value,
                threshold: opt?.needsThreshold ? row.threshold ?? 30 : undefined,
              });
            }}
          >
            {condOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        {needsThreshold ? (
          <label className="flex flex-col gap-1 text-[10px] text-ink-500">
            阈值
            <input
              type="number"
              className="rounded border border-[var(--color-border)] bg-white px-2 py-1 text-[12px]"
              value={row.threshold ?? ""}
              onChange={(e) =>
                onChange({ ...row, threshold: Number(e.target.value) })
              }
            />
          </label>
        ) : (
          !compact && <div className="hidden xl:block" />
        )}

        <label className="flex flex-col gap-1 text-[10px] text-ink-500">
          动作
          <select
            className="rounded border border-[var(--color-border)] bg-white px-2 py-1 text-[12px]"
            value={row.action}
            onChange={(e) =>
              onChange({ ...row, action: e.target.value as SignalRuleRow["action"] })
            }
          >
            <option value="BUY">买入</option>
            <option value="SELL">卖出</option>
          </select>
        </label>
      </div>

      <div className="mt-2 flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 break-words text-[11px] text-ink-500">{rulePreviewText(row)}</p>
        <button
          type="button"
          className="text-[11px] text-vermillion hover:underline"
          onClick={onRemove}
        >
          删除
        </button>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/Button";

const EXAMPLES = [
  { title: "RSI 超卖", text: "当 RSI 低于 30 时Buy，高于 70 时Sell" },
  { title: "趋势跟踪", text: "价格突破 20 日均线Buy，跌破Sell" },
  { title: "网格", text: "每下跌 2% 加仓 5%，上涨 3% 减仓" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  matchScore?: number;
  hasStrategy?: boolean;
}

export function StrategyInput({
  value,
  onChange,
  onSubmit,
  loading,
  matchScore,
  hasStrategy,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-white p-3">
      <h3 className="text-[15px] font-semibold">策略输入</h3>
      {!hasStrategy && (
        <div className="grid gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.title}
              type="button"
              className="rounded-lg border border-dashed border-[var(--color-border)] p-2 text-left text-[11px] hover:border-primary-500 hover:bg-primary-50"
              onClick={() => onChange(ex.text)}
            >
              <span className="font-medium text-primary-500">{ex.title}</span>
              <p className="text-neutral-500">{ex.text}</p>
            </button>
          ))}
        </div>
      )}
      <textarea
        className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500"
        rows={3}
        placeholder="当 RSI 低于 30 时Buy..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {matchScore != null && (
        <p className="text-[11px] text-primary-500">匹配度: {matchScore}/100</p>
      )}
      <Button
        size="sm"
        className="w-full"
        loading={loading}
        disabled={!value.trim()}
        onClick={onSubmit}
      >
        🐼 喂给熊猫
      </Button>
    </div>
  );
}

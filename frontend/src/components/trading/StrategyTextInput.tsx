"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const EXAMPLES = [
  { title: "RSI 超卖", text: "当 RSI 低于 30 时买入，高于 70 时卖出。止损 5%，止盈 15%。趋势跟踪。" },
  { title: "趋势跟踪", text: "价格突破 20 日均线买入，跌破卖出。仓位 10%，止损 5%。" },
  { title: "网格", text: "震荡市网格交易，RSI 40 买入 60 卖出，仓位 8%。" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onParse: () => void;
  loading?: boolean;
}

export function StrategyTextInput({ value, onChange, onParse, loading }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-paper-card/50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-medium text-ink-500"
        onClick={() => setOpen((o) => !o)}
      >
        <span>进阶 · 自然语言解析（LLM）</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-[var(--color-border)] p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.title}
                type="button"
                className="rounded border border-dashed border-[var(--color-border)] p-2 text-left text-[10px] hover:border-bamboo-500"
                onClick={() => onChange(ex.text)}
              >
                <span className="font-medium text-bamboo-500">{ex.title}</span>
                <p className="mt-1 line-clamp-2 text-ink-500">{ex.text}</p>
              </button>
            ))}
          </div>
          <textarea
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-white p-2 text-[12px]"
            rows={3}
            placeholder="用自然语言描述策略…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            loading={loading}
            disabled={value.trim().length < 10}
            onClick={onParse}
          >
            解析并灌入积木
          </Button>
          <p className="text-[10px] text-ink-500">限流 5 次/分钟；解析后可编辑再提交</p>
        </div>
      )}
    </div>
  );
}

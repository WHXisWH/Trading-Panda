"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { StrategySurfaceTheme } from "@/lib/ui/strategySurfaceTheme";

const EXAMPLES = [
  { title: "RSI 超卖", text: "当 RSI 低于 30 时Buy，高于 70 时Sell。止损 5%，止盈 15%。趋势跟踪。" },
  { title: "趋势跟踪", text: "价格突破 20 日均线Buy，跌破Sell。仓位 10%，止损 5%。" },
  { title: "网格", text: "震荡市网格交易，RSI 40 Buy 60 Sell，仓位 8%。" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onParse: () => void;
  loading?: boolean;
  theme?: StrategySurfaceTheme;
}

export function StrategyTextInput({
  value,
  onChange,
  onParse,
  loading,
  theme = "light",
}: Props) {
  const [open, setOpen] = useState(false);
  const isProduct = theme === "product";

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-[16px]",
        isProduct ? "strategy-feed-llm" : "border border-[var(--color-border)] bg-neutral-50/50",
      )}
    >
      <button
        type="button"
        className={clsx(
          "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12px] font-medium transition-colors",
          isProduct ? "text-product-muted hover:bg-black/10" : "text-neutral-500",
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <span>进阶 · 自然语言解析（LLM）</span>
        <span className={isProduct ? "text-product-gold/70" : ""}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className={clsx(
            "space-y-2 p-3",
            isProduct ? "strategy-feed-llm-panel" : "border-t border-[var(--color-border)]",
          )}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.title}
                type="button"
                className={clsx(
                  "rounded-[12px] p-2 text-left text-[10px] transition-colors",
                  isProduct
                    ? "strategy-feed-inset hover:bg-black/20"
                    : "border border-dashed border-[var(--color-border)] hover:border-primary-500",
                )}
                onClick={() => onChange(ex.text)}
              >
                <span
                  className={clsx(
                    "font-medium",
                    isProduct ? "text-product-green" : "text-primary-500",
                  )}
                >
                  {ex.title}
                </span>
                <p
                  className={clsx(
                    "mt-1 line-clamp-2",
                    isProduct ? "text-product-muted" : "text-neutral-500",
                  )}
                >
                  {ex.text}
                </p>
              </button>
            ))}
          </div>
          <Textarea
            surface={isProduct ? "inset" : "default"}
            className="resize-none"
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
          <p className={clsx("text-[10px]", isProduct ? "text-product-muted/80" : "text-neutral-500")}>
            限流 5 次/分钟；解析后可编辑再提交
          </p>
        </div>
      )}
    </div>
  );
}

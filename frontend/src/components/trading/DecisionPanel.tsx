"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { DecisionLog, DecisionStep } from "@/types/trading";

const ZONE_LABEL: Record<string, string> = {
  EXECUTE: "执行",
  OBSERVE: "观望",
  IGNORE: "忽视",
};

function formatTime(ts: number | string | undefined): string {
  if (ts == null) {
    return "—";
  }
  const ms = typeof ts === "number" ? (ts > 1e12 ? ts : ts * 1000) : Date.parse(String(ts));
  if (Number.isNaN(ms)) {
    return String(ts);
  }
  return new Date(ms).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function stepOneDetail(steps: DecisionStep[] | undefined): string {
  const step1 = steps?.find((s) => s.step === 1);
  const hits = step1?.rule_hits;
  if (hits) {
    return `规则 ${hits.buy_hits}买 / ${hits.sell_hits}卖`;
  }
  if (step1?.name) {
    return step1.name;
  }
  return "—";
}

interface Props {
  liveDecision?: DecisionLog | null;
  reviewDecision?: DecisionLog | null;
  training?: boolean;
  className?: string;
}

export function DecisionPanel({
  liveDecision,
  reviewDecision,
  training = false,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const active = reviewDecision ?? liveDecision;
  const steps = active?.steps ?? [];

  return (
    <section className={clsx("flex min-h-0 min-w-0 flex-col", className)}>
      <h3 className="text-[15px] font-semibold">决策链</h3>
      {!training && (
        <p className="mt-1 text-[10px] text-ink-500">点击「开始训练」后显示实时决策</p>
      )}

      {active ? (
        <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-white p-2 text-[11px]">
          {reviewDecision && (
            <p className="mb-1 text-[10px] text-bamboo-600">历史回顾</p>
          )}
          <p className="text-ink-500">{formatTime(active.timestamp)}</p>
          <p className="font-medium">
            {stepOneDetail(steps)} → {active.action}{" "}
            <span className="text-ink-500">({ZONE_LABEL[active.zone] ?? active.zone})</span>
          </p>
          <p className="font-mono text-bamboo-500">
            score {active.final_score.toFixed(2)}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-ink-500">
          {training ? "等待行情 tick…" : "暂无决策"}
        </p>
      )}

      {steps.length > 0 && (
        <>
          <button
            type="button"
            className="mt-2 text-left text-[11px] text-bamboo-500 hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            📊 决策详情 {expanded ? "(收起 ▲)" : "(展开 ▼)"}
          </button>
          {expanded && (
            <ol className="mt-1 max-h-40 space-y-1 overflow-y-auto text-[10px] text-ink-500">
              {steps.map((step) => (
                <li key={step.step} className="flex gap-2">
                  <span className="shrink-0 font-mono text-bamboo-500">{step.step}</span>
                  <span>
                    {step.name}
                    {typeof step.score === "number" && (
                      <span className="ml-1 font-mono">· {step.score.toFixed(3)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

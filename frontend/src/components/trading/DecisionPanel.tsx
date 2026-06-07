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
    return "--";
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

function actionTone(action: string): string {
  if (action === "BUY") return "text-profit";
  if (action === "SELL") return "text-loss";
  return "text-ink-500";
}

function zoneTone(zone: string): string {
  if (zone === "EXECUTE") return "bg-bamboo-50 text-bamboo-600";
  if (zone === "OBSERVE") return "bg-[var(--color-warning-bg)] text-ink-900";
  return "bg-paper-card text-ink-500";
}

function formatPrice(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "--";
  if (Math.abs(value) < 1) return value.toPrecision(5);
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function stepWidth(score: number | undefined): string {
  const n = Math.min(1, Math.max(0, Math.abs(score ?? 0)));
  return `${Math.max(4, n * 100)}%`;
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
  const maxScoreStep = steps.reduce<DecisionStep | null>((best, step) => {
    if (!best) return step;
    return Math.abs(step.score ?? 0) > Math.abs(best.score ?? 0) ? step : best;
  }, null);

  return (
    <section className={clsx("flex min-h-0 min-w-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">决策链</h3>
        {active && (
          <span className={clsx("rounded px-2 py-0.5 text-[10px]", zoneTone(active.zone))}>
            {ZONE_LABEL[active.zone] ?? active.zone}
          </span>
        )}
      </div>
      {!training && <p className="mt-1 text-[10px] text-ink-500">训练未开始</p>}

      {active ? (
        <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-white p-2 text-[11px]">
          {reviewDecision && (
            <p className="mb-1 text-[10px] text-bamboo-600">历史回顾</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-ink-500">{formatTime(active.timestamp)}</p>
              <p className="font-medium">{stepOneDetail(steps)}</p>
            </div>
            <div className="text-right">
              <p className={clsx("font-mono text-[16px] font-semibold", actionTone(active.action))}>
                {active.action}
              </p>
              <p className="font-mono text-ink-500">score {active.final_score.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-ink-500">
            <span>资产 <b className="font-mono text-ink-900">{active.asset ?? "--"}</b></span>
            <span>价格 <b className="font-mono text-ink-900">{formatPrice(active.price)}</b></span>
            <span>阈值 <b className="font-mono text-ink-900">{active.entry_threshold?.toFixed(2) ?? "--"}</b></span>
          </div>
          {maxScoreStep && (
            <p className="mt-2 rounded bg-paper-card px-2 py-1 text-[10px] text-ink-500">
              主导步骤：{maxScoreStep.step}. {maxScoreStep.name}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-ink-500">
          {training ? "等待行情 tick..." : "暂无决策"}
        </p>
      )}

      {steps.length > 0 && (
        <>
          <button
            type="button"
            className="mt-2 text-left text-[11px] text-bamboo-500 hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            决策详情 {expanded ? "(收起)" : "(展开)"}
          </button>
          {expanded && (
            <ol className="mt-2 max-h-64 space-y-1.5 overflow-y-auto text-[10px] text-ink-500">
              {steps.map((step) => (
                <li key={step.step} className="rounded border border-[var(--color-border)] bg-white px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      <b className="mr-1 font-mono text-bamboo-500">{step.step}</b>
                      {step.name}
                    </span>
                    <span className="shrink-0 font-mono text-ink-900">
                      {typeof step.score === "number" ? step.score.toFixed(3) : "--"}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-card">
                    <div
                      className={clsx(
                        "h-full rounded-full",
                        (step.score ?? 0) >= 0 ? "bg-bamboo-500" : "bg-vermillion",
                      )}
                      style={{ width: stepWidth(step.score) }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

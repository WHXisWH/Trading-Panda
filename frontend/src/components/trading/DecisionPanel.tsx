"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { DecisionLog, DecisionStep } from "@/types/trading";
import { formatPrice } from "@/lib/trading/performanceMetrics";

const ZONE_CONFIG: Record<string, { label: string; class: string }> = {
  EXECUTE: { label: "执行", class: "bg-bamboo-50 text-bamboo-700 ring-1 ring-bamboo-200" },
  OBSERVE: { label: "观望", class: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" },
  IGNORE: { label: "忽视", class: "bg-paper-card text-ink-500 ring-1 ring-[var(--color-border)]" },
};

const STEP_NAMES: Record<number, { name: string; desc: string }> = {
  1: { name: "策略信号", desc: "规则引擎匹配信号强度" },
  2: { name: "熟练度噪声", desc: "经验不足时引入偏差" },
  3: { name: "经验修正", desc: "历史模式/精通/失误纠偏" },
  4: { name: "策略融合", desc: "新旧策略混合 + 残影" },
  5: { name: "性格过滤", desc: "五轴性格调整阈值" },
  6: { name: "环境适配", desc: "市场体制匹配度" },
  7: { name: "社交偏移", desc: "逆向人格对冲信号" },
  8: { name: "情绪扭曲", desc: "当前情绪最终调制" },
};

function formatTime(ts: number | string | undefined): string {
  if (ts == null) return "--";
  const ms = typeof ts === "number" ? (ts > 1e12 ? ts : ts * 1000) : Date.parse(String(ts));
  if (Number.isNaN(ms)) return String(ts);
  return new Date(ms).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function stepOneDetail(steps: DecisionStep[]): string {
  const step1 = steps.find((s) => s.step === 1);
  const hits = step1?.rule_hits;
  if (hits) {
    return `规则 ${hits.buy_hits}买 / ${hits.sell_hits}卖 (共${hits.total_compiled}条)`;
  }
  return step1?.name ?? "—";
}

function actionColor(action: string): string {
  if (action === "BUY") return "text-profit";
  if (action === "SELL") return "text-loss";
  return "text-ink-600";
}

function scoreBarWidth(score: number): string {
  const n = Math.min(1, Math.max(0, Math.abs(score)));
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

  const zoneConfig = active ? ZONE_CONFIG[active.zone] ?? ZONE_CONFIG.IGNORE : null;

  return (
    <section className={clsx("flex min-h-0 min-w-0 flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-ink-900">决策链</h3>
        {zoneConfig && (
          <span className={clsx("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", zoneConfig.class)}>
            {zoneConfig.label}
          </span>
        )}
      </div>

      {!training && !active && (
        <p className="mt-2 text-[11px] text-ink-500">训练未开始，暂无决策数据</p>
      )}

      {/* Decision summary card */}
      {active ? (
        <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-white p-3 text-[11px]">
          {reviewDecision && (
            <p className="mb-2 rounded-full bg-bamboo-50 px-2 py-0.5 text-center text-[10px] font-medium text-bamboo-700">
              历史回顾模式
            </p>
          )}

          {/* Action & Score */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-ink-500">{formatTime(active.timestamp)}</p>
              <p className="mt-0.5 text-[11px] text-ink-600">{stepOneDetail(steps)}</p>
            </div>
            <div className="text-right">
              <p className={clsx("font-mono text-[18px] font-bold", actionColor(active.action))}>
                {active.action}
              </p>
              <p className="font-mono text-[11px] text-ink-500">
                {active.final_score.toFixed(3)}
              </p>
            </div>
          </div>

          {/* Key metrics row */}
          <div className="mt-2 grid grid-cols-3 gap-1">
            <MetricPill label="资产" value={active.asset ?? "--"} />
            <MetricPill label="价格" value={formatPrice(active.price)} />
            <MetricPill label="阈值" value={active.entry_threshold?.toFixed(2) ?? "--"} />
          </div>

          {/* Threshold explanation */}
          {active.entry_threshold != null && (
            <p className="mt-2 text-[10px] text-ink-500">
              分数 {Math.abs(active.final_score).toFixed(2)} {Math.abs(active.final_score) > active.entry_threshold ? ">" : "\u2264"} 阈值 {active.entry_threshold.toFixed(2)}
              {" \u2192 "}
              <span className={clsx("font-semibold", zoneConfig?.class)}>
                {zoneConfig?.label}
              </span>
            </p>
          )}

          {/* Dominant step highlight */}
          {maxScoreStep && (
            <div className="mt-2 rounded-lg bg-paper-card px-2.5 py-1.5 text-[10px]">
              <span className="text-ink-500">主导步骤：</span>
              <span className="font-semibold text-ink-800">
                {maxScoreStep.step}. {STEP_NAMES[maxScoreStep.step]?.name ?? maxScoreStep.name}
              </span>
              <span className="ml-1 font-mono text-ink-500">
                ({maxScoreStep.score >= 0 ? "+" : ""}{maxScoreStep.score.toFixed(3)})
              </span>
            </div>
          )}
        </div>
      ) : training ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] bg-paper-card px-3 py-4">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-bamboo-500" />
          <span className="text-[11px] text-ink-500">等待行情数据…</span>
        </div>
      ) : null}

      {/* 8-step detail expansion */}
      {steps.length > 0 && (
        <>
          <button
            type="button"
            className="mt-2 text-left text-[11px] font-medium text-bamboo-600 transition-colors hover:text-bamboo-700"
            onClick={() => setExpanded(!expanded)}
          >
            8步决策详情 {expanded ? "\u2191" : "\u2193"}
          </button>
          {expanded && (
            <ol className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
              {steps.map((step) => {
                const meta = STEP_NAMES[step.step];
                const isMax = maxScoreStep?.step === step.step;
                const isPositive = (step.score ?? 0) >= 0;

                return (
                  <li
                    key={step.step}
                    className={clsx(
                      "rounded-lg border px-2.5 py-2 text-[10px]",
                      isMax
                        ? "border-bamboo-200 bg-bamboo-50"
                        : "border-[var(--color-border)] bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={clsx(
                          "inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                          isMax ? "bg-bamboo-500 text-white" : "bg-paper-card text-ink-500",
                        )}>
                          {step.step}
                        </span>
                        <span className="font-medium text-ink-800">
                          {meta?.name ?? step.name}
                        </span>
                        {isMax && (
                          <span className="rounded-full bg-bamboo-100 px-1.5 py-0.5 text-[8px] font-semibold text-bamboo-700">
                            主导
                          </span>
                        )}
                      </div>
                      <span className={clsx(
                        "shrink-0 font-mono text-[11px] font-semibold",
                        isPositive ? "text-profit" : "text-loss",
                      )}>
                        {isPositive ? "+" : ""}{(step.score ?? 0).toFixed(3)}
                      </span>
                    </div>
                    {meta?.desc && (
                      <p className="mt-0.5 pl-6 text-[9px] text-ink-500">{meta.desc}</p>
                    )}
                    {/* Score bar */}
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-card">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all",
                          isPositive ? "bg-bamboo-500" : "bg-red-400",
                        )}
                        style={{ width: scoreBarWidth(step.score ?? 0) }}
                      />
                    </div>
                    {/* Step 1 rule hits detail */}
                    {step.step === 1 && step.rule_hits && (
                      <div className="mt-1 flex gap-3 pl-6 text-[9px] text-ink-500">
                        <span>买入命中 <b className="text-profit">{step.rule_hits.buy_hits}</b></span>
                        <span>卖出命中 <b className="text-loss">{step.rule_hits.sell_hits}</b></span>
                        <span>总规则 {step.rule_hits.total_compiled}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-paper-card px-2 py-1 text-center">
      <p className="text-[9px] text-ink-500">{label}</p>
      <p className="font-mono text-[11px] font-medium text-ink-800">{value}</p>
    </div>
  );
}

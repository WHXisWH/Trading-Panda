"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { DecisionSummary } from "@/lib/mockData";

const DECISION_STEPS = [
  "信号检测",
  "策略匹配",
  "情绪偏差",
  "经验权重",
  "残影影响",
  "风险检查",
  "仓位计算",
  "最终评分",
];

interface Props {
  decisions?: DecisionSummary[];
  pandaThought?: string;
  className?: string;
}

export function DecisionPanel({
  decisions = [],
  pandaThought = "这波回调像是洗盘，我再观望一下…",
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const latest = decisions[0];

  return (
    <aside
      className={clsx(
        "flex w-full shrink-0 flex-col gap-3 rounded-xl bg-paper-card p-4 lg:w-decision",
        className
      )}
    >
      <h3 className="text-[15px] font-semibold">决策链</h3>

      {latest ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-2 text-[11px]">
          <p className="text-ink-500">{latest.time}</p>
          <p className="font-medium">
            {latest.signal} → {latest.action}
          </p>
          <p className="font-mono text-bamboo-500">score {latest.score.toFixed(2)}</p>
        </div>
      ) : (
        <p className="text-[11px] text-ink-500">暂无决策记录</p>
      )}

      <button
        type="button"
        className="text-left text-[11px] text-bamboo-500 hover:underline"
        onClick={() => setExpanded(!expanded)}
      >
        📊 决策详情 {expanded ? "(收起 ▲)" : "(展开 ▼)"}
      </button>

      {expanded && (
        <ol className="space-y-1 text-[10px] text-ink-500">
          {DECISION_STEPS.map((step, i) => (
            <li key={step} className="flex gap-2">
              <span className="font-mono text-bamboo-500">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-auto space-y-2">
        <p className="text-[10px] font-medium text-ink-500">历史决策</p>
        {decisions.slice(1, 4).map((d) => (
          <div
            key={d.time + d.signal}
            className="rounded bg-white/60 px-2 py-1 text-[10px] text-ink-500"
          >
            {d.time} {d.action} · {d.score.toFixed(2)}
          </div>
        ))}
        <blockquote className="border-l-2 border-bamboo-500 pl-2 text-[11px] italic text-ink-500">
          🐼 {pandaThought}
        </blockquote>
      </div>
    </aside>
  );
}

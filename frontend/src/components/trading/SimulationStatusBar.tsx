"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { SimulationControls } from "@/components/trading/SimulationControls";
import type { SessionPhase } from "@/hooks/useSimulationSession";
import type { WsConnectionStatus } from "@/types/ws";
import type { DeepbookPool } from "@/lib/constants/deepbookPools";

/** Ticks older than this are considered stale for the pre-start check. */
const FRESH_TICK_MAX_AGE_SEC = 120;

interface Props {
  pandaId: string;
  pandaName?: string;
  phase: SessionPhase;
  speed: string;
  subscribedPools: DeepbookPool[];
  hasStrategy: boolean;
  actorActive: boolean;
  tradeCount: number;
  wsStatus: WsConnectionStatus;
  emotion: string | null;
  lastTickAgeSec?: number | null;
  onSpeedChange: (speed: string) => void;
  onToggleTraining: () => void;
  onOpenStrategy: () => void;
}

const PHASE_CONFIG: Record<
  SessionPhase,
  { label: string; dot: string; bg: string }
> = {
  idle: { label: "待机", dot: "bg-ink-400", bg: "bg-paper-card" },
  starting: { label: "启动中…", dot: "bg-yellow-400 animate-pulse", bg: "bg-yellow-50" },
  running: { label: "训练中", dot: "bg-emerald-500 animate-pulse", bg: "bg-emerald-50" },
  stopping: { label: "停止中…", dot: "bg-orange-400 animate-pulse", bg: "bg-orange-50" },
  error: { label: "异常", dot: "bg-red-500", bg: "bg-red-50" },
};

const EMOTION_LABELS: Record<string, string> = {
  focused: "专注",
  excited: "兴奋",
  greedy: "贪婪",
  cautious: "谨慎",
  panicking: "恐慌",
  numb: "麻木",
};

const WS_LABELS: Record<WsConnectionStatus, { label: string; ok: boolean }> = {
  idle: { label: "未连接", ok: false },
  connecting: { label: "连接中", ok: false },
  open: { label: "已连接", ok: true },
  closed: { label: "已断开", ok: false },
  error: { label: "连接错误", ok: false },
};

interface ChecklistItem {
  label: string;
  ok: boolean;
  detail: string;
  /** Hard requirements block start; soft items only warn. */
  required: boolean;
}

function buildChecklist({
  hasStrategy,
  subscribedPools,
  wsStatus,
  lastTickAgeSec,
}: {
  hasStrategy: boolean;
  subscribedPools: DeepbookPool[];
  wsStatus: WsConnectionStatus;
  lastTickAgeSec: number | null | undefined;
}): ChecklistItem[] {
  const hasFreshTick =
    lastTickAgeSec != null && lastTickAgeSec <= FRESH_TICK_MAX_AGE_SEC;
  return [
    {
      label: "交易策略",
      ok: hasStrategy,
      detail: hasStrategy ? "策略已就绪" : "请先在「策略」中教给熊猫",
      required: true,
    },
    {
      label: "交易池",
      ok: subscribedPools.length > 0,
      detail:
        subscribedPools.length > 0
          ? subscribedPools.join(" · ")
          : "请先在交易池页选择至少一个池",
      required: true,
    },
    {
      label: "行情连接",
      ok: wsStatus === "open",
      detail: wsStatus === "open" ? "WebSocket 已连接" : "行情通道未连接，启动后可能无 tick",
      required: false,
    },
    {
      label: "行情新鲜度",
      ok: hasFreshTick,
      detail:
        lastTickAgeSec == null
          ? "尚未收到行情 tick"
          : hasFreshTick
            ? `最近 tick ${lastTickAgeSec} 秒前`
            : `最近 tick ${lastTickAgeSec} 秒前（已过期）`,
      required: false,
    },
  ];
}

function StatusPill({
  label,
  ok,
  className,
}: {
  label: string;
  ok: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        ok
          ? "bg-bamboo-50 text-bamboo-700"
          : "bg-paper-card text-ink-500",
        className,
      )}
    >
      <span
        className={clsx(
          "inline-block h-1.5 w-1.5 rounded-full",
          ok ? "bg-bamboo-500" : "bg-ink-400",
        )}
      />
      {label}
    </span>
  );
}

export function SimulationStatusBar({
  pandaId,
  phase,
  speed,
  subscribedPools,
  hasStrategy,
  actorActive,
  tradeCount,
  wsStatus,
  emotion,
  lastTickAgeSec,
  onSpeedChange,
  onToggleTraining,
  onOpenStrategy,
}: Props) {
  const phaseConfig = PHASE_CONFIG[phase];
  const wsInfo = WS_LABELS[wsStatus];
  const isRunning = phase === "running";
  const isBusy = phase === "starting" || phase === "stopping";

  const [checklistOpen, setChecklistOpen] = useState(false);
  const checklistRef = useRef<HTMLDivElement>(null);

  const checklist = buildChecklist({
    hasStrategy,
    subscribedPools,
    wsStatus,
    lastTickAgeSec,
  });
  const requiredOk = checklist.filter((c) => c.required).every((c) => c.ok);
  const allOk = checklist.every((c) => c.ok);

  useEffect(() => {
    if (!checklistOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (checklistRef.current && !checklistRef.current.contains(e.target as Node)) {
        setChecklistOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [checklistOpen]);

  const handleTrainClick = () => {
    if (isRunning) {
      onToggleTraining();
      return;
    }
    if (allOk) {
      onToggleTraining();
      return;
    }
    setChecklistOpen((v) => !v);
  };

  const handleConfirmStart = () => {
    setChecklistOpen(false);
    onToggleTraining();
  };

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-sm">
      {/* Left: Session status indicators */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {/* Phase badge */}
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            phaseConfig.bg,
          )}
        >
          <span className={clsx("inline-block h-2 w-2 rounded-full", phaseConfig.dot)} />
          {phaseConfig.label}
        </span>

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill label={hasStrategy ? "策略就绪" : "未设策略"} ok={hasStrategy} />
          <StatusPill label={wsInfo.label} ok={wsInfo.ok} />
          {isRunning && (
            <>
              <StatusPill label={`Actor ${actorActive ? "活跃" : "空闲"}`} ok={actorActive} />
              {emotion && (
                <span className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  `bg-emotion-${emotion}`,
                  "text-white",
                )}>
                  {EMOTION_LABELS[emotion] ?? emotion}
                </span>
              )}
              <span className="rounded-full bg-paper-card px-2 py-0.5 text-[10px] font-mono text-ink-600">
                {tradeCount} 笔
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <SimulationControls active={speed} onChange={onSpeedChange} />

        <button
          type="button"
          onClick={onOpenStrategy}
          className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12px] font-medium text-ink-700 transition-colors hover:bg-bamboo-50 hover:text-bamboo-700"
        >
          策略
        </button>

        <div className="relative" ref={checklistRef}>
          <button
            type="button"
            onClick={handleTrainClick}
            disabled={isBusy}
            className={clsx(
              "rounded-lg px-4 py-1.5 text-[12px] font-semibold text-white transition-all disabled:opacity-50",
              isRunning
                ? "bg-red-500 hover:bg-red-600"
                : "bg-bamboo-500 hover:bg-bamboo-600",
              isBusy && "animate-pulse",
            )}
          >
            {isBusy
              ? phase === "starting"
                ? "启动中…"
                : "停止中…"
              : isRunning
                ? "停止训练"
                : "开始训练"}
          </button>

          {checklistOpen && !isRunning && (
            <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-lg">
              <p className="text-[12px] font-semibold text-ink-900">启动前检查</p>
              <ul className="mt-2 space-y-1.5">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-start gap-2 text-[11px]">
                    <span
                      className={clsx(
                        "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
                        item.ok ? "bg-bamboo-500" : item.required ? "bg-red-500" : "bg-yellow-500",
                      )}
                    >
                      {item.ok ? "✓" : "!"}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium text-ink-800">{item.label}</span>
                      <span className="ml-1 text-ink-500">{item.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-end gap-2">
                {!hasStrategy && (
                  <button
                    type="button"
                    onClick={() => {
                      setChecklistOpen(false);
                      onOpenStrategy();
                    }}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-[11px] text-ink-700 hover:bg-bamboo-50"
                  >
                    去设置策略
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirmStart}
                  disabled={!requiredOk}
                  className="rounded-lg bg-bamboo-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-bamboo-600 disabled:opacity-50"
                >
                  {requiredOk && !allOk ? "仍然启动" : "确认启动"}
                </button>
              </div>
            </div>
          )}
        </div>

        <Link
          href={`/pools?panda=${pandaId}`}
          className="text-[11px] text-ink-500 transition-colors hover:text-bamboo-600"
          title="管理交易池"
        >
          {subscribedPools.join(" · ")}
        </Link>
      </div>
    </div>
  );
}

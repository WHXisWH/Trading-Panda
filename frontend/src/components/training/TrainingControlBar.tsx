"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import type { SessionPhase } from "@/hooks/useSimulationSession";
import type { WsConnectionStatus } from "@/types/ws";
import type { DeepbookPool } from "@/lib/constants/deepbookPools";

const FRESH_TICK_MAX_AGE_SEC = 120;
const SPEEDS = ["1×", "10×", "100×", "跳到结果"] as const;

interface Props {
  pandaId: string;
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
  onFeedStrategy: () => void;
}

const PHASE_LABEL: Record<SessionPhase, string> = {
  idle: "Standby",
  starting: "Starting",
  running: "Training",
  stopping: "Stopping",
  error: "Error",
};

const EMOTION_LABELS: Record<string, string> = {
  focused: "Focused",
  excited: "Excited",
  greedy: "Greedy",
  cautious: "Cautious",
  panicking: "Panicking",
  numb: "Numb",
};

const WS_LABELS: Record<WsConnectionStatus, { label: string; ok: boolean }> = {
  idle: { label: "Disconnected", ok: false },
  connecting: { label: "Connecting", ok: false },
  open: { label: "Connected", ok: true },
  closed: { label: "Disconnected", ok: false },
  error: { label: "Error", ok: false },
};

interface ChecklistItem {
  label: string;
  ok: boolean;
  detail: string;
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
      label: "Strategy",
      ok: hasStrategy,
      detail: hasStrategy ? "Ready" : "Feed strategy first",
      required: true,
    },
    {
      label: "Pools",
      ok: subscribedPools.length > 0,
      detail:
        subscribedPools.length > 0
          ? subscribedPools.join(" · ")
          : "Select at least one pool",
      required: true,
    },
    {
      label: "Market WS",
      ok: wsStatus === "open",
      detail: wsStatus === "open" ? "WebSocket connected" : "No tick channel yet",
      required: false,
    },
    {
      label: "Tick freshness",
      ok: hasFreshTick,
      detail:
        lastTickAgeSec == null
          ? "No tick received yet"
          : hasFreshTick
            ? `Last tick ${lastTickAgeSec}s ago`
            : `Last tick ${lastTickAgeSec}s ago (stale)`,
      required: false,
    },
  ];
}

function StatusChip({
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
        ok
          ? "border border-product-green/30 bg-product-green/10 text-product-green"
          : "border border-product-line bg-product-panel-soft text-product-muted",
        className,
      )}
    >
      <span
        className={clsx(
          "inline-block h-1.5 w-1.5 rounded-full",
          ok ? "bg-product-green shadow-[0_0_8px_rgba(109,255,144,0.6)]" : "bg-product-muted/50",
        )}
      />
      {label}
    </span>
  );
}

export function TrainingControlBar({
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
  onFeedStrategy,
}: Props) {
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

  const handleFeedStrategy = () => {
    setChecklistOpen(false);
    onFeedStrategy();
  };

  const phaseTone =
    phase === "running"
      ? "border-product-green/40 bg-product-green/10 text-product-green"
      : phase === "error"
        ? "border-product-red/40 bg-product-red/10 text-product-red"
        : phase === "starting" || phase === "stopping"
          ? "border-product-amber/35 bg-product-amber/10 text-product-amber"
          : "border-product-line bg-product-panel-soft text-product-muted";

  return (
    <div className="product-panel flex min-w-0 max-w-full flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
            phaseTone,
          )}
        >
          <span
            className={clsx(
              "inline-block h-2 w-2 rounded-full",
              phase === "running" && "animate-pulse bg-product-green shadow-[0_0_10px_rgba(109,255,144,0.7)]",
              phase === "error" && "bg-product-red",
              (phase === "starting" || phase === "stopping") && "animate-pulse bg-product-amber",
              phase === "idle" && "bg-product-muted/60",
            )}
          />
          {PHASE_LABEL[phase]}
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip label={hasStrategy ? "Strategy ready" : "No strategy"} ok={hasStrategy} />
          <StatusChip label={wsInfo.label} ok={wsInfo.ok} />
          {isRunning && (
            <>
              <StatusChip label={`Actor ${actorActive ? "active" : "idle"}`} ok={actorActive} />
              {emotion && (
                <span className="rounded-full border border-product-gold/30 bg-product-gold/10 px-2 py-0.5 text-[10px] font-semibold text-product-gold">
                  {EMOTION_LABELS[emotion] ?? emotion}
                </span>
              )}
              <span className="rounded-full border border-product-line bg-product-panel-soft px-2 py-0.5 font-mono text-[10px] text-product-muted">
                {tradeCount} trades
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-product-muted">Speed</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={clsx(
                "product-toggle-chip",
                speed === s && "product-toggle-chip-active",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <Button size="sm" variant="outline" onClick={handleFeedStrategy}>
          Feed strategy
        </Button>

        <div className="relative" ref={checklistRef}>
          {isRunning ? (
            <Button size="sm" variant="danger" onClick={handleTrainClick} disabled={isBusy}>
              {isBusy ? "Stopping…" : "Stop training"}
            </Button>
          ) : (
            <Button size="sm" onClick={handleTrainClick} disabled={isBusy}>
              {isBusy ? "Starting…" : "Start training"}
            </Button>
          )}

          {checklistOpen && !isRunning && (
            <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-product-line bg-product-panel p-3 shadow-[var(--shadow-product)]">
              <p className="text-[12px] font-bold text-product-text">Pre-flight checklist</p>
              <ul className="mt-2 space-y-1.5">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-start gap-2 text-[11px]">
                    <span
                      className={clsx(
                        "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                        item.ok
                          ? "bg-product-green text-[#071108]"
                          : item.required
                            ? "bg-product-red text-white"
                            : "bg-product-amber text-[#071108]",
                      )}
                    >
                      {item.ok ? "✓" : "!"}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium text-product-text">{item.label}</span>
                      <span className="ml-1 text-product-muted">{item.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-end gap-2">
                {!hasStrategy && (
                  <Button size="sm" variant="outline" onClick={handleFeedStrategy}>
                    Feed strategy
                  </Button>
                )}
                <Button size="sm" onClick={handleConfirmStart} disabled={!requiredOk}>
                  {requiredOk && !allOk ? "Start anyway" : "Confirm start"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Tooltip content="Manage subscribed pools">
          <Link
            href={`/pools?panda=${pandaId}`}
            className="text-[11px] text-product-muted transition-colors hover:text-product-gold"
          >
            {subscribedPools.join(" · ")}
          </Link>
        </Tooltip>
      </div>
    </div>
  );
}

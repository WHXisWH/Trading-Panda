"use client";

import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import type { LatestDecisionSummary } from "./trainingLedgerView";

const STATUS_CLASS: Record<LatestDecisionSummary["statusTone"], string> = {
  default: "text-product-muted",
  pass: "text-product-green",
  warn: "text-product-amber",
  danger: "text-product-red",
};

interface Props {
  summary: LatestDecisionSummary | null;
  onInspect?: (summary: LatestDecisionSummary) => void;
}

export function LastActionRow({ summary, onInspect }: Props) {
  if (!summary) {
    return (
      <p className="text-[12px] text-product-muted">Waiting for the first OrderIntent.</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-product-text">{summary.title}</p>
          <p className={clsx("mt-0.5 text-[11px] font-medium", STATUS_CLASS[summary.statusTone])}>
            {summary.statusLabel}
            {summary.scoreLabel !== "—" ? ` · ${summary.scoreLabel}` : ""}
          </p>
        </div>
        {summary.tradeFactId ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onInspect?.(summary)}>
            Inspect
          </Button>
        ) : null}
      </div>
      {summary.reason ? (
        <p className="line-clamp-2 text-[11px] text-product-muted">{summary.reason}</p>
      ) : null}
    </div>
  );
}

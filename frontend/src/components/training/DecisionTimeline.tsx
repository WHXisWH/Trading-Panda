"use client";

import { clsx } from "clsx";
import type { OrderIntentApi } from "@/types/autonomous-wallet";

interface Props {
  intents: OrderIntentApi[];
  selectedId?: string | null;
  onSelect?: (intent: OrderIntentApi) => void;
}

function isHoldIntent(intent: OrderIntentApi): boolean {
  return String(intent.side).trim().toUpperCase() === "HOLD";
}

function statusTone(intent: OrderIntentApi): string {
  if (intent.status === "EXECUTED") return "text-product-green";
  if (intent.status === "REJECTED") return "text-product-red";
  if (isHoldIntent(intent) || intent.status === "SKIPPED") return "text-product-amber";
  return "text-product-muted";
}

function statusLabel(intent: OrderIntentApi): string {
  if (intent.status === "EXECUTED") return "PAPER_EXECUTED";
  if (intent.status === "REJECTED") return "REJECTED_BY_POLICY";
  if (isHoldIntent(intent) || intent.status === "SKIPPED") return "HOLD_OBSERVED";
  return "ORDER_INTENT";
}

export function DecisionTimeline({ intents, selectedId, onSelect }: Props) {
  if (intents.length === 0) {
    return (
      <div className="ledger-surface px-4 py-8 text-center">
        <p className="text-[13px] font-medium text-product-text">No decisions yet</p>
        <p className="mt-1 text-[12px] text-product-muted">
          Start training and the Panda&apos;s OrderIntents will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="ledger-timeline-group" role="list">
      {intents.map((intent) => {
        const isSelected = selectedId === intent.id;
        return (
          <button
            key={intent.id}
            type="button"
            role="listitem"
            onClick={() => onSelect?.(intent)}
            className={clsx(
              "ledger-timeline-row",
              isSelected && "ledger-timeline-row--selected",
            )}
          >
            <span className="min-w-0">
              <span className="font-semibold text-product-text">
                {intent.side} · {intent.pair}
              </span>
              <span className="ml-2 text-[10px] text-product-muted">
                {intent.created_at
                  ? new Date(intent.created_at).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </span>
            <span className={clsx("font-medium", statusTone(intent))}>
              {statusLabel(intent)}
            </span>
            <span className="font-mono text-[11px] text-product-muted">
              {intent.final_score != null ? intent.final_score.toFixed(2) : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

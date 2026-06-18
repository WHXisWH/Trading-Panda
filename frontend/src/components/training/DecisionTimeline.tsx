"use client";

import { clsx } from "clsx";
import type { OrderIntentApi } from "@/types/autonomous-wallet";

interface Props {
  intents: OrderIntentApi[];
  selectedId?: string | null;
  onSelect?: (intent: OrderIntentApi) => void;
}

function statusTone(status: OrderIntentApi["status"]): string {
  if (status === "EXECUTED") return "text-product-green";
  if (status === "REJECTED") return "text-product-red";
  if (status === "SKIPPED") return "text-product-amber";
  return "text-product-muted";
}

function statusLabel(status: OrderIntentApi["status"]): string {
  if (status === "EXECUTED") return "PAPER_EXECUTED";
  if (status === "REJECTED") return "REJECTED_BY_POLICY";
  if (status === "SKIPPED") return "SKIPPED";
  return "ORDER_INTENT";
}

export function DecisionTimeline({ intents, selectedId, onSelect }: Props) {
  if (intents.length === 0) {
    return (
      <div className="product-panel px-4 py-8 text-center">
        <p className="text-[13px] font-medium text-product-text">No decisions yet</p>
        <p className="mt-1 text-[12px] text-product-muted">
          Start training and the Panda&apos;s OrderIntents will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {intents.map((intent) => {
        const isSelected = selectedId === intent.id;
        return (
          <button
            key={intent.id}
            type="button"
            onClick={() => onSelect?.(intent)}
            className={clsx(
              "flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-[12px] transition-colors",
              isSelected
                ? "border-product-green/50 bg-product-green/10"
                : "border-product-line bg-black/20 hover:border-product-gold/30 hover:bg-white/[0.03]",
            )}
          >
            <span className="min-w-0">
              <span className="font-semibold text-product-text">
                {intent.side} · {intent.pair}
              </span>
              <span className="ml-2 text-[10px] text-product-muted">
                {intent.created_at ? new Date(intent.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
            </span>
            <span className={clsx("font-medium", statusTone(intent.status))}>
              {statusLabel(intent.status)}
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

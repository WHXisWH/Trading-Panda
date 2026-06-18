"use client";

import { clsx } from "clsx";
import type { OrderIntentApi } from "@/types/autonomous-wallet";

interface Props {
  intents: OrderIntentApi[];
  selectedId?: string | null;
  onSelect?: (intent: OrderIntentApi) => void;
}

export function DecisionTimeline({ intents, selectedId, onSelect }: Props) {
  if (intents.length === 0) {
    return (
      <div className="product-panel px-4 py-8 text-center">
        <p className="text-[13px] font-medium text-product-text">No decisions yet</p>
        <p className="mt-1 text-[12px] text-product-muted">
          Start training to watch the Panda react to live DeepBook ticks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {intents.map((intent) => (
        <button
          key={intent.id}
          type="button"
          onClick={() => onSelect?.(intent)}
          className={clsx(
            "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-[12px] transition-colors",
            selectedId === intent.id
              ? "border-product-green/50 bg-product-green/10"
              : "border-product-line bg-black/20 hover:border-product-gold/30 hover:bg-white/[0.03]",
          )}
        >
          <span className="font-semibold text-product-text">
            {intent.side} · {intent.pair}
          </span>
          <span
            className={clsx(
              "font-medium",
              intent.status === "EXECUTED" && "text-product-green",
              intent.status === "REJECTED" && "text-product-red",
              intent.status !== "EXECUTED" && intent.status !== "REJECTED" && "text-product-muted",
            )}
          >
            {intent.status}
          </span>
          <span className="font-mono text-[11px] text-product-muted">
            {intent.final_score != null ? intent.final_score.toFixed(2) : "—"}
          </span>
        </button>
      ))}
    </div>
  );
}

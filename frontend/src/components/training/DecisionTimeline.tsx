"use client";

import { clsx } from "clsx";
import type { OrderIntentApi } from "@/types/autonomous-wallet";

interface Props {
  intents: OrderIntentApi[];
  selectedId?: string | null;
  onSelect?: (intent: OrderIntentApi) => void;
}

export function DecisionTimeline({
  intents,
  selectedId,
  onSelect,
}: Props) {
  if (intents.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-[12px] text-neutral-500">
        No decisions yet — start training to watch the Panda react to live ticks.
      </p>
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
            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[12px] transition-colors",
            selectedId === intent.id
              ? "border-emerald-400 bg-emerald-50"
              : "border-[var(--color-border)] bg-white hover:bg-neutral-50",
          )}
        >
          <span className="font-medium">
            {intent.side} · {intent.pair}
          </span>
          <span
            className={clsx(
              intent.status === "EXECUTED" && "text-emerald-600",
              intent.status === "REJECTED" && "text-red-600",
            )}
          >
            {intent.status}
          </span>
          <span className="text-neutral-500">
            {intent.final_score != null ? intent.final_score.toFixed(2) : "—"}
          </span>
        </button>
      ))}
    </div>
  );
}

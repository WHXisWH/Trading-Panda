"use client";

import type { GhostInfluenceSummary, StrategyShadowInfo } from "@/types/strategy";

interface Props {
  ghost?: GhostInfluenceSummary | StrategyShadowInfo | null;
}

export function GhostInfluenceHint({ ghost }: Props) {
  if (!ghost) return null;

  const weight = "ghost_weight" in ghost ? ghost.ghost_weight : 0;
  const decay =
    "expected_decay_trades" in ghost ? ghost.expected_decay_trades : 50;
  const summary =
    "summary" in ghost && ghost.summary
      ? ghost.summary
      : `Old habits may fade over the next ${decay} trades.`;

  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-[12px] text-neutral-600">
      <p className="font-medium text-neutral-800">Ghost influence</p>
      <p className="mt-1">{summary}</p>
      <p className="mt-1 text-[11px] text-neutral-500">
        Previous strategy residue is active but cannot override TradingPolicy.
      </p>
      <button
        type="button"
        className="mt-2 text-[11px] text-primary-600 underline-offset-2 hover:underline"
        onClick={() => {
          /* drawer opened by parent */
        }}
        hidden
      >
        Residual weight ~{(weight * 100).toFixed(0)}%
      </button>
    </div>
  );
}

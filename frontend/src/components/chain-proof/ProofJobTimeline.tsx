"use client";

import type { ChainProofTimelineStepApi } from "@/types/autonomous-wallet";
import { clsx } from "clsx";

interface ProofJobTimelineProps {
  steps: ChainProofTimelineStepApi[];
}

export function ProofJobTimeline({ steps }: ProofJobTimelineProps) {
  if (steps.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-[12px] text-neutral-500">
        No proof job yet. Eligible Trade Facts can be proven on-chain without affecting paper
        ledger accounting.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] p-4">
      <h2 className="text-[13px] font-semibold text-neutral-200">Proof job timeline</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.state} className="flex items-center gap-3">
            <span
              className={clsx(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                step.active && "bg-[var(--color-accent)] text-black",
                step.done && !step.active && "bg-emerald-500/20 text-emerald-400",
                !step.active && !step.done && "bg-neutral-800 text-neutral-500",
              )}
            >
              {step.done && !step.active ? "✓" : "·"}
            </span>
            <span
              className={clsx(
                "text-[12px]",
                step.active ? "font-semibold text-neutral-100" : "text-neutral-400",
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

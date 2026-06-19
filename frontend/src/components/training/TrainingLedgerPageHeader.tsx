"use client";

import { clsx } from "clsx";
import { PaperLedgerHeaderMetrics } from "@/components/training/PaperLedgerHeaderMetrics";
import type { TrainingLedgerState } from "@/services/training.service";

interface Props {
  equity?: number;
  initialCapital?: number;
  ledger?: TrainingLedgerState;
  className?: string;
}

export function TrainingLedgerPageHeader({ equity, initialCapital, ledger, className }: Props) {
  return (
    <header className={clsx("ledger-page-header", className)}>
      <div className="ledger-page-header-copy">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-product-muted">
          Training Ledger
        </p>
        <h1 className="font-sans text-2xl font-bold text-product-text md:text-3xl">
          Live training cockpit
        </h1>
      </div>
      <PaperLedgerHeaderMetrics
        ledger={ledger}
        equity={equity}
        initialCapital={initialCapital}
      />
    </header>
  );
}

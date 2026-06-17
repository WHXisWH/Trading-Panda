"use client";

import type { HypothesisApi, ReviewVerdict } from "@/types/autonomous-wallet";
import { Badge } from "@/components/ui/Badge";

const VERDICT_LABEL: Record<ReviewVerdict, string> = {
  win: "Win",
  loss: "Loss",
  breakeven: "Breakeven",
  invalid: "Invalid",
};

interface TradeOutcomeHeaderProps {
  pair?: string;
  verdict: ReviewVerdict;
  realizedPnl: number;
  hypothesis?: HypothesisApi;
}

export function TradeOutcomeHeader({
  pair,
  verdict,
  realizedPnl,
  hypothesis,
}: TradeOutcomeHeaderProps) {
  return (
    <header className="rounded-2xl border border-[var(--color-border)] bg-neutral-50/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">
            Closed trade review
          </p>
          <h1 className="mt-1 font-sans text-xl font-bold text-neutral-900">
            {pair ?? "Training pair"} · {VERDICT_LABEL[verdict]}
          </h1>
          <p className="mt-2 text-[13px] text-neutral-600">
            Realized PnL{" "}
            <span className={realizedPnl >= 0 ? "text-emerald-600" : "text-red-600"}>
              {realizedPnl >= 0 ? "+" : ""}
              {realizedPnl.toFixed(4)}
            </span>
          </p>
        </div>
        {hypothesis ? (
          <Badge color="#059669">Hypothesis · {hypothesis.status}</Badge>
        ) : null}
      </div>
    </header>
  );
}

interface TradeOutcomeStoryProps {
  hypothesis: HypothesisApi;
  reasonSummary: string;
}

export function TradeOutcomeStory({ hypothesis, reasonSummary }: TradeOutcomeStoryProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h2 className="font-sans text-sm font-bold text-neutral-900">Outcome story</h2>
      <p className="text-[13px] leading-relaxed text-neutral-700">{reasonSummary}</p>
      <dl className="grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <dt className="text-neutral-500">Entry ref.</dt>
          <dd className="font-medium">{hypothesis.entry_reference_price.toFixed(4)}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Exit ref.</dt>
          <dd className="font-medium">{hypothesis.exit_reference_price.toFixed(4)}</dd>
        </div>
      </dl>
    </section>
  );
}

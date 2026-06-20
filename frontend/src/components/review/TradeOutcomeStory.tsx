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
  const isWin = verdict === "win";
  const pnlTone = realizedPnl >= 0 ? "text-product-green" : "text-product-red";

  return (
    <header className="ledger-surface p-5 sm:p-6">
      <div className="absolute right-6 top-5 h-24 w-24 rounded-full bg-product-green/[0.08] blur-3xl" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="product-field-label">
            Closed trade review
          </p>
          <h1 className="mt-2 font-sans text-2xl font-black tracking-tight text-product-text sm:text-3xl">
            {pair ?? "Training pair"} · {VERDICT_LABEL[verdict]}
          </h1>
          <p className="mt-3 text-[12px] font-medium text-product-muted">
            Realized PnL{" "}
            <span className={`font-mono text-lg font-black ${pnlTone}`}>
              {realizedPnl >= 0 ? "+" : ""}
              {realizedPnl.toFixed(4)}
            </span>
          </p>
        </div>
        {hypothesis ? (
          <Badge
            color={isWin ? "#6dff90" : "#ffc857"}
            className="border border-current/20 bg-black/20 font-mono uppercase tracking-wide"
          >
            Hypothesis · {hypothesis.status}
          </Badge>
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
    <section className="ledger-surface space-y-5 p-5">
      <div>
        <p className="product-field-label">Outcome story</p>
        <h2 className="mt-1 font-sans text-lg font-black text-product-text">
          What happened after the decision
        </h2>
      </div>
      <p className="rounded-2xl border border-product-line bg-white/[0.035] px-4 py-3 text-[13px] leading-relaxed text-product-text shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {reasonSummary}
      </p>
      <dl className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[12px]">
        <div className="rounded-xl border border-product-line bg-black/20 p-3">
          <dt className="product-field-label">Entry ref.</dt>
          <dd className="mt-2 font-mono text-base font-black text-product-text">
            {hypothesis.entry_reference_price.toFixed(4)}
          </dd>
        </div>
        <div className="text-product-muted">→</div>
        <div className="rounded-xl border border-product-green/25 bg-product-green/[0.05] p-3">
          <dt className="product-field-label">Exit ref.</dt>
          <dd className="mt-2 font-mono text-base font-black text-product-green">
            {hypothesis.exit_reference_price.toFixed(4)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

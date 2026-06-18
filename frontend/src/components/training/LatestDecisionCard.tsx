"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { chainProofPath, reviewPath } from "@/lib/ui/routeJump";
import type { LatestDecisionSummary } from "./trainingLedgerView";

interface Props {
  pandaId: string;
  summary: LatestDecisionSummary | null;
  onInspect?: (summary: LatestDecisionSummary) => void;
}

const STATUS_CLASS: Record<LatestDecisionSummary["statusTone"], string> = {
  default: "bg-black/25 text-product-muted ring-1 ring-inset ring-[rgba(225,186,92,0.1)]",
  pass: "bg-product-green/10 text-product-green ring-1 ring-inset ring-product-green/28",
  warn: "bg-product-amber/10 text-product-amber ring-1 ring-inset ring-product-amber/28",
  danger: "bg-product-red/10 text-product-red ring-1 ring-inset ring-product-red/28",
};

export function LatestDecisionCard({ pandaId, summary, onInspect }: Props) {
  if (!summary) {
    return (
      <Card variant="ledger">
        <p className="ledger-step-label">Latest decision</p>
        <p className="mt-2 text-[12px] text-product-muted">Waiting for the first OrderIntent.</p>
      </Card>
    );
  }

  return (
    <Card variant="ledger" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ledger-step-label">Latest decision</p>
          <h3 className="mt-1 text-[15px] font-semibold text-product-text">{summary.title}</h3>
          <p className="mt-1 text-[12px] text-product-muted">{summary.subtitle}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[summary.statusTone]}`}>
          {summary.statusLabel}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Score" value={summary.scoreLabel} />
        <Metric label="Proof" value={summary.proofStatus ?? "—"} />
        <Metric label="Review" value={summary.reviewStatus ?? "—"} />
      </div>

      <p className="text-[12px] text-product-text">{summary.reason}</p>
      {summary.ledgerDelta ? (
        <p className="font-mono text-[11px] text-product-muted">{summary.ledgerDelta}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {summary.tradeFactId ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onInspect?.(summary)}>
            Inspect evidence
          </Button>
        ) : null}
        {summary.canOpenProof && summary.tradeFactId ? (
          <Link
            href={chainProofPath(pandaId, summary.tradeFactId)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-[11px] font-mono font-extrabold tracking-tight text-product-muted ring-1 ring-inset ring-[rgba(225,186,92,0.1)] transition-all duration-fast ease-smooth hover:text-product-text hover:ring-product-gold/25"
          >
            Prove this action
          </Link>
        ) : null}
        {summary.canOpenReview && summary.tradeFactId ? (
          <Link
            href={reviewPath(pandaId, summary.tradeFactId)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-[11px] font-mono font-extrabold tracking-tight text-product-muted ring-1 ring-inset ring-[rgba(225,186,92,0.1)] transition-all duration-fast ease-smooth hover:text-product-text hover:ring-product-gold/25"
          >
            Review this trade
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="ledger-metric-cell">
      <div className="product-field-label">{label}</div>
      <div className="mt-1 font-mono text-[12px] font-bold text-product-text">{value}</div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { TruncatedEvidence } from "@/lib/ui/disclosure";
import { chainProofPath, reviewPath } from "@/lib/ui/routeJump";
import type { OrderIntentApi, TradeFactApi } from "@/types/autonomous-wallet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent?: OrderIntentApi | null;
  tradeFact?: TradeFactApi | null;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="product-metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function JsonHint({ label, value }: { label: string; value?: Record<string, unknown> | null }) {
  if (!value) return null;
  const keys = Object.keys(value).slice(0, 4);
  return <MetricRow label={label} value={keys.length > 0 ? keys.join(" · ") : "—"} />;
}

export function TradeFactDrawer({ open, onOpenChange, intent, tradeFact }: Props) {
  const decisionSteps =
    tradeFact?.decision_snapshot && typeof tradeFact.decision_snapshot === "object"
      ? (tradeFact.decision_snapshot.steps as Array<Record<string, unknown>> | undefined)
      : undefined;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      title="Trade Fact evidence"
      description="Market, policy, and ledger evidence for the selected decision."
    >
      {intent ? (
        <section className="space-y-3">
          <h4 className="product-field-label">Order Intent</h4>
          <MetricRow label="Side" value={intent.side} />
          <MetricRow label="Pair" value={intent.pair} />
          <MetricRow label="Status" value={intent.status} />
          <MetricRow label="Final score" value={intent.final_score != null ? intent.final_score.toFixed(2) : "—"} />
          <MetricRow label="Reference price" value={String(intent.reference_price)} />
          <TruncatedEvidence label="Decision hash" value={intent.decision_hash} />
          {intent.rejection_reason ? <MetricRow label="Rejection" value={intent.rejection_reason} /> : null}
          <JsonHint label="Policy snapshot" value={intent.policy_snapshot ?? null} />
          <JsonHint label="Market snapshot" value={intent.market_snapshot ?? null} />
        </section>
      ) : (
        <p className="text-[12px] text-product-muted">Select a decision row to inspect evidence.</p>
      )}

      {tradeFact ? (
        <section className="mt-6 space-y-3 border-t border-product-line pt-4">
          <h4 className="product-field-label">Trade Fact</h4>
          <TruncatedEvidence label="Fact id" value={tradeFact.id} />
          <TruncatedEvidence label="Fact hash" value={tradeFact.fact_hash} />
          <MetricRow label="Proof status" value={tradeFact.proof_status} />
          <MetricRow label="Review status" value={tradeFact.review_status} />
          {tradeFact.realized_pnl != null ? (
            <MetricRow label="Realized PnL" value={tradeFact.realized_pnl.toFixed(4)} />
          ) : null}
          {tradeFact.realized_pnl_pct != null ? (
            <MetricRow label="Realized PnL %" value={`${(tradeFact.realized_pnl_pct * 100).toFixed(2)}%`} />
          ) : null}
          {tradeFact.execution_snapshot ? <JsonHint label="Execution snapshot" value={tradeFact.execution_snapshot} /> : null}
          {tradeFact.outcome ? <JsonHint label="Outcome" value={tradeFact.outcome} /> : null}
          {tradeFact.decision_snapshot ? <JsonHint label="Decision snapshot" value={tradeFact.decision_snapshot} /> : null}
          {tradeFact.policy_snapshot ? <JsonHint label="Policy snapshot" value={tradeFact.policy_snapshot} /> : null}
          {tradeFact.ledger_snapshot_before ? <JsonHint label="Ledger before" value={tradeFact.ledger_snapshot_before} /> : null}
          {tradeFact.ledger_snapshot_after ? <JsonHint label="Ledger after" value={tradeFact.ledger_snapshot_after} /> : null}
          {decisionSteps && decisionSteps.length > 0 ? (
            <div className="space-y-2">
              <p className="product-field-label">8-step reasoning</p>
              <div className="space-y-1.5">
                {decisionSteps.slice(0, 8).map((step, index) => (
                  <div key={index} className="product-metric-row">
                    <span>
                      {String(step.step ?? index + 1)}. {String(step.name ?? "Step")}
                    </span>
                    <strong>{typeof step.score === "number" ? step.score.toFixed(3) : "—"}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {intent ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-product-line pt-4">
              <Link href={chainProofPath(intent.panda_id, tradeFact.id)}>
                <Button size="sm" variant="outline">
                  Prove this action
                </Button>
              </Link>
              <Link href={reviewPath(intent.panda_id, tradeFact.id)}>
                <Button size="sm" variant="ghost">
                  Review this trade
                </Button>
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </Drawer>
  );
}

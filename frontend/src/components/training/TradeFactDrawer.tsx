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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatMoney(value: unknown): string {
  const n = numberValue(value);
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatNumber(value: unknown, digits = 4): string {
  const n = numberValue(value);
  if (n == null) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatPct(value: unknown): string {
  const n = numberValue(value);
  if (n == null) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

function formatPositions(value: TradeFactApi["ledger_snapshot_after"]): string {
  const positions = value?.positions;
  if (!positions || positions.length === 0) return "Flat";
  return positions
    .map((position) => `${position.asset} × ${formatNumber(position.quantity, 4)}`)
    .join(" · ");
}

function JsonHint({ label, value }: { label: string; value?: Record<string, unknown> | null }) {
  if (!value) return null;
  const keys = Object.keys(value).slice(0, 4);
  return <MetricRow label={label} value={keys.length > 0 ? keys.join(" · ") : "—"} />;
}

export function TradeFactEvidenceContent({ intent, tradeFact }: Pick<Props, "intent" | "tradeFact">) {
  const intentDecision = asRecord(intent?.decision_snapshot);
  const tradeDecision = asRecord(tradeFact?.decision_snapshot);
  const decision = tradeDecision ?? intentDecision;
  const execution = asRecord(tradeFact?.execution_snapshot);
  const policy = asRecord(tradeFact?.policy_snapshot ?? intent?.policy_snapshot);
  const market = asRecord(tradeFact?.market_snapshot ?? intent?.market_snapshot);
  const decisionSteps =
    decision && Array.isArray(decision.steps)
      ? (decision.steps as Array<Record<string, unknown>>)
      : undefined;

  return (
    <>
      {intent ? (
        <section className="space-y-3">
          <h4 className="product-field-label">Order Intent</h4>
          <MetricRow label="Side" value={intent.side} />
          <MetricRow label="Pair" value={intent.pair} />
          <MetricRow label="Status" value={intent.status} />
          <MetricRow label="Final score" value={intent.final_score != null ? intent.final_score.toFixed(2) : "—"} />
          <MetricRow label="Entry threshold" value={formatNumber(decision?.entry_threshold, 4)} />
          <MetricRow label="Notional" value={formatMoney(intent.notional)} />
          <MetricRow label="Reference price" value={formatNumber(intent.reference_price, 6)} />
          <MetricRow label="Policy version" value={String(intent.policy_version ?? policy?.version ?? "—")} />
          <TruncatedEvidence label="Decision hash" value={intent.decision_hash} />
          {intent.rejection_reason ? <MetricRow label="Rejection" value={intent.rejection_reason} /> : null}
          {market ? (
            <>
              <MetricRow label="Market RSI" value={formatNumber(market.rsi, 2)} />
              <MetricRow label="Market regime" value={String(market.market_regime ?? "—")} />
            </>
          ) : null}
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
          <MetricRow label="Executed notional" value={formatMoney(execution?.notional)} />
          <MetricRow label="Executed quantity" value={formatNumber(execution?.quantity, 4)} />
          <MetricRow label="Execution price" value={formatNumber(execution?.reference_price, 6)} />
          <MetricRow label="Position size" value={formatPct(execution?.position_pct)} />
          {tradeFact.realized_pnl != null ? <MetricRow label="Realized PnL" value={formatMoney(tradeFact.realized_pnl)} /> : null}
          {tradeFact.realized_pnl_pct != null ? <MetricRow label="Realized PnL %" value={formatPct(tradeFact.realized_pnl_pct)} /> : null}
          {tradeFact.ledger_snapshot_before ? (
            <div className="space-y-2">
              <p className="product-field-label">Ledger before</p>
              <MetricRow label="Cash" value={formatMoney(tradeFact.ledger_snapshot_before.cash_balance)} />
              <MetricRow label="Equity" value={formatMoney(tradeFact.ledger_snapshot_before.equity)} />
              <MetricRow label="Position" value={formatPositions(tradeFact.ledger_snapshot_before)} />
            </div>
          ) : null}
          {tradeFact.ledger_snapshot_after ? (
            <div className="space-y-2">
              <p className="product-field-label">Ledger after</p>
              <MetricRow label="Cash" value={formatMoney(tradeFact.ledger_snapshot_after.cash_balance)} />
              <MetricRow label="Equity" value={formatMoney(tradeFact.ledger_snapshot_after.equity)} />
              <MetricRow label="Position" value={formatPositions(tradeFact.ledger_snapshot_after)} />
            </div>
          ) : null}
          {tradeFact.outcome ? <JsonHint label="Outcome evidence" value={tradeFact.outcome} /> : null}
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
    </>
  );
}

export function TradeFactDrawer({ open, onOpenChange, intent, tradeFact }: Props) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      title="Trade Fact evidence"
      description="Market, policy, and ledger evidence for the selected decision."
    >
      <TradeFactEvidenceContent intent={intent} tradeFact={tradeFact} />
    </Drawer>
  );
}

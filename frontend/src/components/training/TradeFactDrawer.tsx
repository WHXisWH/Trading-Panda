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

export function TradeFactDrawer({ open, onOpenChange, intent, tradeFact }: Props) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      title="Trade Fact evidence"
      description="Market, policy, and ledger snapshot for the selected decision."
    >
      {intent ? (
        <section className="space-y-3">
          <h4 className="product-field-label">Order Intent</h4>
          <EvidenceRow label="Side" value={intent.side} />
          <EvidenceRow label="Pair" value={intent.pair} />
          <EvidenceRow label="Status" value={intent.status} />
          <EvidenceRow label="Notional" value={String(intent.notional)} />
          <EvidenceRow label="Reference price" value={String(intent.reference_price)} />
          <TruncatedEvidence label="Decision hash" value={intent.decision_hash} />
          {intent.rejection_reason ? (
            <EvidenceRow label="Rejection" value={intent.rejection_reason} />
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
          <EvidenceRow label="Proof status" value={tradeFact.proof_status} />
          {tradeFact.realized_pnl != null ? (
            <EvidenceRow label="Realized PnL" value={tradeFact.realized_pnl.toFixed(4)} />
          ) : null}
          {intent ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-product-line pt-4">
              <Link href={chainProofPath(intent.panda_id, tradeFact.id)}>
                <Button size="sm" variant="outline">Chain Proof</Button>
              </Link>
              {tradeFact.realized_pnl != null ? (
                <Link href={reviewPath(intent.panda_id, tradeFact.id)}>
                  <Button size="sm" variant="ghost">Review</Button>
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </Drawer>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="product-metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

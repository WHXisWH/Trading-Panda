"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
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
        <section className="space-y-2 text-[12px]">
          <h4 className="font-semibold text-neutral-900">Order Intent</h4>
          <Row label="Side" value={intent.side} />
          <Row label="Pair" value={intent.pair} />
          <Row label="Status" value={intent.status} />
          <Row label="Notional" value={String(intent.notional)} />
          <Row label="Reference price" value={String(intent.reference_price)} />
          <Row label="Decision hash" value={intent.decision_hash} mono />
          {intent.rejection_reason ? (
            <Row label="Rejection" value={intent.rejection_reason} />
          ) : null}
        </section>
      ) : (
        <p className="text-[12px] text-neutral-500">Select a decision row to inspect evidence.</p>
      )}
      {tradeFact ? (
        <section className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4 text-[12px]">
          <h4 className="font-semibold text-neutral-900">Trade Fact</h4>
          <Row label="Fact id" value={tradeFact.id} mono />
          <Row label="Fact hash" value={tradeFact.fact_hash} mono />
          <Row label="Proof status" value={tradeFact.proof_status} />
          {tradeFact.realized_pnl != null ? (
            <Row label="Realized PnL" value={tradeFact.realized_pnl.toFixed(4)} />
          ) : null}
          {intent ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-product-line pt-4">
              <Link href={chainProofPath(intent.panda_id, tradeFact.id)}>
                <Button size="sm" variant="outline">
                  Chain Proof
                </Button>
              </Link>
              {tradeFact.realized_pnl != null ? (
                <Link href={reviewPath(intent.panda_id, tradeFact.id)}>
                  <Button size="sm" variant="ghost">
                    Review
                  </Button>
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </Drawer>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-neutral-500">{label}</span>
      <span className={mono ? "break-all font-mono text-[11px]" : ""}>{value}</span>
    </div>
  );
}

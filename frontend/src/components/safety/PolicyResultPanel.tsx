"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { TruncatedEvidence } from "@/lib/ui/disclosure";
import { trainingLedgerPath } from "@/lib/ui/routeJump";
import type { AgentWalletStatusApi } from "@/types/agent-wallet";

export function PolicyResultPanel({
  open,
  onOpenChange,
  status,
  txDigest,
  pandaId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: AgentWalletStatusApi | null;
  txDigest: string | null;
  pandaId: string;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      title="Safety action result"
      description="Durable on-chain result — not only a toast."
    >
      <div className="space-y-4 text-[12px]">
        {txDigest ? <TruncatedEvidence label="Tx digest" value={txDigest} /> : null}
        {status?.policy?.sui_object_id ? (
          <TruncatedEvidence label="TradingPolicy object" value={status.policy.sui_object_id} />
        ) : null}
        <p className="text-product-muted">
          Policy version {status?.policy?.version ?? "—"} · mirror{" "}
          {status?.mirror_sync_status ?? "unknown"}
        </p>
        <Link href={trainingLedgerPath(pandaId)}>
          <Button className="w-full">Return to Training</Button>
        </Link>
      </div>
    </Drawer>
  );
}

export function TightenLimitsDrawer({
  open,
  onOpenChange,
  maxNotional,
  maxDailyLoss,
  onMaxNotionalChange,
  onMaxDailyLossChange,
  onConfirm,
  loading,
  ceilingMaxNotional,
  ceilingMaxDailyLoss,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxNotional: number;
  maxDailyLoss: number;
  ceilingMaxNotional: number;
  ceilingMaxDailyLoss: number;
  onMaxNotionalChange: (v: number) => void;
  onMaxDailyLossChange: (v: number) => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      variant="product"
      title="Tighten policy limits"
      description="Only stricter values are accepted on-chain."
    >
      <div className="space-y-4">
        <label className="block text-[12px]">
          <span className="text-product-muted">Max notional per trade</span>
          <input
            type="number"
            min={1}
            max={ceilingMaxNotional}
            value={maxNotional}
            onChange={(e) => onMaxNotionalChange(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-product-line bg-product-panel-soft px-3 py-2 text-product-text"
          />
        </label>
        <label className="block text-[12px]">
          <span className="text-product-muted">Max daily loss</span>
          <input
            type="number"
            min={1}
            max={ceilingMaxDailyLoss}
            value={maxDailyLoss}
            onChange={(e) => onMaxDailyLossChange(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-product-line bg-product-panel-soft px-3 py-2 text-product-text"
          />
        </label>
        <Button className="w-full" loading={loading} onClick={onConfirm}>
          Review & sign tighten
        </Button>
      </div>
    </Drawer>
  );
}

"use client";

import { clsx } from "clsx";
import type { RiskStatus } from "@/types/safety";

const LABELS: Record<RiskStatus, string> = {
  active: "Active — Panda may train and request Chain Proof",
  paused: "Paused — all execution blocked",
  revoked: "Revoked — authorized agent disabled",
  tightened: "Tightened — stricter limits active",
  mirror_syncing: "Mirror syncing — execution blocked until backend catches up",
  no_wallet: "No Agent Wallet — setup required first",
};

const STYLES: Record<RiskStatus, string> = {
  active: "border-product-green/35 bg-product-green/10 text-product-green",
  paused: "border-product-red/45 bg-product-red/15 text-product-red",
  revoked: "border-product-red/55 bg-product-red/20 text-product-red",
  tightened: "border-product-amber/40 bg-product-amber/10 text-product-amber",
  mirror_syncing: "border-product-amber/35 bg-product-amber/10 text-product-amber",
  no_wallet: "border-product-line bg-product-panel-soft text-product-muted",
};

interface Props {
  status: RiskStatus;
  policyVersion?: number | null;
  mirrorSyncStatus?: string | null;
}

export function RiskStatusBanner({ status, policyVersion, mirrorSyncStatus }: Props) {
  return (
    <div className={clsx("rounded-xl border px-5 py-4", STYLES[status])}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Risk status</p>
      <p className="mt-1 font-sans text-lg font-bold">{LABELS[status]}</p>
      <p className="mt-2 text-[12px] text-product-muted">
        TradingPolicy v{policyVersion ?? "—"} · mirror {mirrorSyncStatus ?? "—"}
      </p>
      <p className="mt-1 text-[11px] text-product-muted/80">
        You own the collar. The Panda cannot unpause itself or loosen policy.
      </p>
    </div>
  );
}

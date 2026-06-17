"use client";

import type { ChainProofStatusApi } from "@/types/autonomous-wallet";
import { Badge } from "@/components/ui/Badge";

interface TradeFactHeaderProps {
  status: ChainProofStatusApi;
}

export function TradeFactHeader({ status }: TradeFactHeaderProps) {
  const { trade_fact: fact, order_intent: intent } = status;
  const pnl = fact.realized_pnl;

  return (
    <header className="space-y-3 rounded-xl border border-[var(--color-border)] bg-neutral-950/40 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-sans text-xl font-bold text-neutral-100">Chain Proof</h1>
        <Badge className={status.eligibility.eligible ? "bg-emerald-500/15 text-emerald-400" : ""}>
          {status.eligibility.eligible ? "Eligible" : "Ineligible"}
        </Badge>
        <Badge>{fact.pair}</Badge>
        <Badge>{fact.side}</Badge>
      </div>
      <p className="text-[13px] text-neutral-400">
        Selected Trade Fact · score {intent.final_score?.toFixed(2) ?? "—"} · policy v
        {status.chain_execution.policy_version ?? intent.policy_version}
      </p>
      {pnl != null ? (
        <p className="text-[12px] text-neutral-500">
          Paper ledger PnL {pnl >= 0 ? "+" : ""}
          {pnl.toFixed(2)} — proof failure never rolls this back.
        </p>
      ) : null}
    </header>
  );
}

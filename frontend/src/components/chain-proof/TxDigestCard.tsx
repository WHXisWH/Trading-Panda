"use client";

import type { ChainProofStatusApi } from "@/types/autonomous-wallet";

interface TxDigestCardProps {
  chainExecution: ChainProofStatusApi["chain_execution"];
}

export function TxDigestCard({ chainExecution }: TxDigestCardProps) {
  if (!chainExecution.tx_digest) return null;

  const isDryRun = chainExecution.dry_run;
  const explorer = `https://suiscan.xyz/testnet/tx/${chainExecution.tx_digest}`;

  return (
    <section
      className={
        isDryRun
          ? "rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
          : "rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
      }
    >
      <h2 className={isDryRun ? "text-[13px] font-semibold text-amber-300" : "text-[13px] font-semibold text-emerald-300"}>
        {isDryRun ? "Dry-run proof recorded" : "Confirmed on testnet"}
      </h2>
      {isDryRun ? (
        <p className="mt-2 text-[12px] text-amber-200/80">
          This is a server-side simulation because the Agent Signer private key is not configured.
          No Sui transaction was submitted.
        </p>
      ) : null}
      <p className="mt-2 font-mono text-[12px] text-neutral-200">
        {chainExecution.tx_digest_short ?? chainExecution.tx_digest}
      </p>
      {!isDryRun ? (
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-[12px] text-[var(--color-accent)] underline"
        >
          Open in explorer
        </a>
      ) : null}
      {chainExecution.event_type ? (
        <p className="mt-2 text-[11px] text-neutral-500">
          Move event: {chainExecution.event_type}
        </p>
      ) : null}
    </section>
  );
}

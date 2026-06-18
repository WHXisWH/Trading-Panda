"use client";

import type { PendingChainProofJobApi } from "@/types/safety";

interface Props {
  jobs: PendingChainProofJobApi[];
  onViewDetails?: () => void;
}

export function PendingJobsStrip({ jobs, onViewDetails }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl bg-black/25 px-4 py-3 text-[13px] text-product-muted ring-1 ring-inset ring-[rgba(225,186,92,0.1)]">
        No pending Chain Proof jobs will be affected by pause or revoke.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-product-amber/8 px-4 py-3 ring-1 ring-inset ring-product-amber/22">
      <p className="text-[13px] font-bold text-product-amber">
        {jobs.length} pending Chain Proof job{jobs.length === 1 ? "" : "s"}
      </p>
      <p className="mt-1 text-[12px] text-product-muted">
        Pause or revoke will cancel or block these jobs. Already-submitted proofs keep their tx
        status.
      </p>
      {onViewDetails ? (
        <button
          type="button"
          className="mt-2 text-[12px] font-semibold text-product-gold underline-offset-2 hover:underline"
          onClick={onViewDetails}
        >
          View affected jobs
        </button>
      ) : null}
    </div>
  );
}

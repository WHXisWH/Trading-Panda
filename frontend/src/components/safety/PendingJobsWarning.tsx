"use client";

import type { PendingChainProofJobApi } from "@/types/safety";

interface Props {
  jobs: PendingChainProofJobApi[];
  onViewDetails?: () => void;
}

export function PendingJobsWarning({ jobs, onViewDetails }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-product-line bg-product-panel p-4 text-[13px] text-product-muted">
        No pending Chain Proof jobs will be affected.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-product-amber/35 bg-product-amber/10 p-4">
      <p className="text-[13px] font-semibold text-product-amber">
        {jobs.length} pending Chain Proof job{jobs.length === 1 ? "" : "s"}
      </p>
      <p className="mt-1 text-[12px] text-product-muted">
        Pause or revoke will cancel or block these jobs. Already-submitted proofs keep their tx
        status.
      </p>
      {onViewDetails ? (
        <button
          type="button"
          className="mt-2 text-[12px] font-medium text-product-gold underline"
          onClick={onViewDetails}
        >
          View affected jobs
        </button>
      ) : null}
    </div>
  );
}

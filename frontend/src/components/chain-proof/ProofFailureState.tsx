"use client";

interface ProofFailureStateProps {
  message: string | null;
  retryable: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ProofFailureState({
  message,
  retryable,
  onRetry,
  isRetrying,
}: ProofFailureStateProps) {
  if (!message) return null;

  return (
    <section className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
      <h2 className="text-[13px] font-semibold text-red-300">Proof failed safely</h2>
      <p className="mt-2 text-[12px] text-neutral-300">{message}</p>
      <p className="mt-1 text-[11px] text-neutral-500">
        Training Ledger PnL was not rolled back.
      </p>
      {retryable && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-3 text-[12px] font-semibold text-[var(--color-accent)] disabled:opacity-50"
        >
          {isRetrying ? "Retrying…" : "Retry proof"}
        </button>
      ) : null}
    </section>
  );
}

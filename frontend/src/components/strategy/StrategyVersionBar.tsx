"use client";

interface Props {
  version?: number | null;
  isActive?: boolean;
  isDraft?: boolean;
  matchScore?: number | null;
}

export function StrategyVersionBar({
  version,
  isActive,
  isDraft,
  matchScore,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        Strategy version
      </span>
      {version ? (
        <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-mono text-white">
          v{version}
        </span>
      ) : (
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-amber-800">
          No active version
        </span>
      )}
      {isDraft ? (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
          Draft
        </span>
      ) : null}
      {isActive ? (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">
          Active
        </span>
      ) : null}
      {matchScore != null ? (
        <span className="ml-auto text-[11px] text-neutral-500">
          Panda fit {matchScore}%
        </span>
      ) : null}
    </div>
  );
}

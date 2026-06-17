"use client";

import type { PolicyConflictDetail } from "@/types/strategy";

interface Props {
  policyVersion?: number | null;
  policySummary?: string | null;
  policyCompatible?: boolean | null;
  allowedPairs?: string[];
  blockedPairs?: string[];
  targetPairs?: string[];
  conflicts?: PolicyConflictDetail[];
  validating?: boolean;
}

export function PolicyCompatibilityPreview({
  policyVersion,
  policySummary,
  policyCompatible,
  allowedPairs = [],
  blockedPairs = [],
  targetPairs = [],
  conflicts = [],
  validating,
}: Props) {
  const status =
    validating
      ? "Checking policy…"
      : policyCompatible === false
        ? "Conflicts found"
        : policyCompatible === true
          ? "Compatible"
          : "No policy mirror yet";

  const tone =
    policyCompatible === false
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : policyCompatible === true
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-neutral-200 bg-neutral-50 text-neutral-700";

  return (
    <section className={`rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
            Policy compatibility
          </p>
          <p className="text-[13px] font-medium">{status}</p>
        </div>
        {policyVersion ? (
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-mono">
            Policy v{policyVersion}
          </span>
        ) : null}
      </div>

      {policySummary ? (
        <p className="mt-2 text-[12px] leading-relaxed opacity-90">{policySummary}</p>
      ) : null}

      {targetPairs.length > 0 ? (
        <p className="mt-2 text-[11px]">
          Target pairs: <span className="font-mono">{targetPairs.join(", ")}</span>
        </p>
      ) : null}

      {allowedPairs.length > 0 ? (
        <p className="mt-1 text-[11px]">
          Allowed: <span className="font-mono">{allowedPairs.join(", ")}</span>
        </p>
      ) : null}

      {blockedPairs.length > 0 ? (
        <p className="mt-1 text-[11px] text-amber-800">
          Blocked: <span className="font-mono">{blockedPairs.join(", ")}</span>
        </p>
      ) : null}

      {conflicts.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[11px]">
          {conflicts.map((c) => (
            <li key={`${c.field}-${c.code}`}>
              <span className="font-mono">{c.field}</span>: {c.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

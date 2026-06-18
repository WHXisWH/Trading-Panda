"use client";

import { clsx } from "clsx";
import type { StrategySurfaceTheme } from "@/lib/ui/strategySurfaceTheme";
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
  theme?: StrategySurfaceTheme;
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
  theme = "light",
}: Props) {
  const isProduct = theme === "product";

  const status = validating
    ? "Checking policy…"
    : policyCompatible === false
      ? "Conflicts found"
      : policyCompatible === true
        ? "Compatible"
        : "No policy mirror yet";

  const tone = isProduct
    ? policyCompatible === false
      ? "strategy-feed-tone-warn text-product-amber"
      : policyCompatible === true
        ? "strategy-feed-tone-pass text-product-green"
        : "strategy-feed-tone-neutral text-product-muted"
    : policyCompatible === false
      ? "border border-amber-200 bg-amber-50 text-amber-900"
      : policyCompatible === true
        ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border border-neutral-200 bg-neutral-50 text-neutral-700";

  return (
    <section className={clsx("rounded-[18px] px-4 py-3.5", tone)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            className={clsx(
              "text-[11px] font-semibold uppercase tracking-wide",
              isProduct ? "text-current/70" : "opacity-70",
            )}
          >
            Policy compatibility
          </p>
          <p className="text-[13px] font-medium">{status}</p>
        </div>
        {policyVersion ? (
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 font-mono text-[11px]",
              isProduct ? "strategy-feed-chip text-current" : "bg-white/70",
            )}
          >
            Policy v{policyVersion}
          </span>
        ) : null}
      </div>

      {policySummary ? (
        <p
          className={clsx(
            "mt-2 text-[12px] leading-relaxed",
            isProduct ? "text-product-text/88" : "opacity-90",
          )}
        >
          {policySummary}
        </p>
      ) : null}

      {targetPairs.length > 0 ? (
        <p className={clsx("mt-2 text-[11px]", isProduct && "text-product-text/80")}>
          Target pairs: <span className="font-mono">{targetPairs.join(", ")}</span>
        </p>
      ) : null}

      {allowedPairs.length > 0 ? (
        <p className={clsx("mt-1 text-[11px]", isProduct && "text-product-text/80")}>
          Allowed: <span className="font-mono">{allowedPairs.join(", ")}</span>
        </p>
      ) : null}

      {blockedPairs.length > 0 ? (
        <p
          className={clsx(
            "mt-1 text-[11px]",
            isProduct ? "text-product-amber" : "text-amber-800",
          )}
        >
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

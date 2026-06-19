"use client";

import { clsx } from "clsx";
import type { PolicyConflictDetail } from "@/types/strategy";
import { policyConflictDetail, policyConflictLabel } from "@/lib/policyConflictLabels";

interface PolicyConflictListProps {
  conflicts: PolicyConflictDetail[];
  compact?: boolean;
  className?: string;
}

export function PolicyConflictList({
  conflicts,
  compact = false,
  className,
}: PolicyConflictListProps) {
  if (conflicts.length === 0) return null;

  return (
    <ul className={clsx("space-y-2", compact ? "text-[11px]" : "text-[12px]", className)}>
      {conflicts.map((conflict) => (
        <li
          key={`${conflict.code}-${conflict.field}`}
          className="rounded-[12px] border border-product-red/25 bg-product-red/[0.06] px-3 py-2"
        >
          <p className="font-semibold text-product-red">{policyConflictLabel(conflict.code)}</p>
          <p className="mt-0.5 leading-relaxed text-product-text/90">
            {policyConflictDetail(conflict)}
          </p>
        </li>
      ))}
    </ul>
  );
}

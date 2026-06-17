"use client";

import { clsx } from "clsx";

interface Props {
  status?: "pass" | "reject" | "paused" | "stale" | null;
  message?: string | null;
}

export function PolicyGateBanner({ status, message }: Props) {
  if (!status) {
    return null;
  }

  const styles = {
    pass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    reject: "border-red-200 bg-red-50 text-red-800",
    paused: "border-amber-200 bg-amber-50 text-amber-900",
    stale: "border-neutral-200 bg-neutral-50 text-neutral-700",
  };

  const labels = {
    pass: "Policy passed",
    reject: "Rejected by policy",
    paused: "Policy paused",
    stale: "Market stale — holding",
  };

  return (
    <div className={clsx("rounded-lg border px-3 py-2 text-[12px]", styles[status])}>
      <span className="font-semibold">{labels[status]}</span>
      {message ? <span className="ml-2">{message}</span> : null}
    </div>
  );
}

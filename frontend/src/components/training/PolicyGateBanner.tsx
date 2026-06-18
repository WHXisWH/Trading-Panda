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
    pass: "border-product-green/35 bg-product-green/10 text-product-green",
    reject: "border-product-red/45 bg-product-red/15 text-product-red",
    paused: "border-product-amber/40 bg-product-amber/10 text-product-amber",
    stale: "border-product-line bg-product-panel-soft text-product-muted",
  };

  const labels = {
    pass: "Policy passed",
    reject: "Rejected by policy",
    paused: "Policy paused",
    stale: "Market stale — holding",
  };

  return (
    <div className={clsx("rounded-xl border px-3 py-2.5 text-[12px]", styles[status])}>
      <span className="font-bold">{labels[status]}</span>
      {message ? <span className="ml-2 opacity-90">{message}</span> : null}
    </div>
  );
}

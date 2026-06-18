"use client";

import { clsx } from "clsx";

interface Props {
  status?: "pass" | "reject" | "paused" | "stale" | "neutral" | null;
  message?: string | null;
}

export function PolicyGateBanner({ status, message }: Props) {
  const styles = {
    pass: "bg-product-green/10 text-product-green ring-product-green/28",
    reject: "bg-product-red/12 text-product-red ring-product-red/30",
    paused: "bg-product-amber/10 text-product-amber ring-product-amber/28",
    stale: "bg-black/25 text-product-muted ring-[rgba(225,186,92,0.1)]",
    neutral: "bg-black/25 text-product-muted ring-[rgba(225,186,92,0.1)]",
  };

  const labels = {
    pass: "Policy passed",
    reject: "Rejected by policy",
    paused: "Policy paused",
    stale: "Market stale — holding",
    neutral: "Policy ready",
  };

  const resolvedStatus = status ?? "neutral";

  return (
    <div
      className={clsx(
        "rounded-xl px-3 py-2.5 text-[12px] ring-1 ring-inset",
        styles[resolvedStatus],
      )}
    >
      <span className="font-bold">{labels[resolvedStatus]}</span>
      {message ? <span className="ml-2 opacity-90">{message}</span> : null}
    </div>
  );
}

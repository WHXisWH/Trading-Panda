"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";

/** Progressive disclosure levels — docs/design/README.md §6. */
export type DisclosureLevel = "L0" | "L1" | "L2" | "L3";

export function DisclosureL0({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={clsx("space-y-2", className)}>
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-product-muted">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-sans text-2xl font-bold text-product-text md:text-3xl">{title}</h1>
      {description ? (
        <p className="max-w-2xl text-[13px] leading-relaxed text-product-muted">{description}</p>
      ) : null}
      {children}
    </header>
  );
}

export function DisclosureL1({
  items,
  className,
}: {
  items: Array<{ label: string; value: string; tone?: "default" | "pass" | "warn" | "danger" }>;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-wrap gap-2 rounded-xl border border-product-line bg-product-panel/60 px-3 py-2",
        className,
      )}
      aria-label="Status summary"
    >
      {items.map((item) => (
        <span
          key={`${item.label}-${item.value}`}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            item.tone === "pass" && "bg-product-green/10 text-product-green",
            item.tone === "warn" && "bg-product-amber/15 text-product-amber",
            item.tone === "danger" && "bg-product-red/15 text-product-red",
            (!item.tone || item.tone === "default") && "bg-product-panel-soft text-product-muted",
          )}
        >
          <span className="text-product-muted/80">{item.label}</span>
          <span className="text-product-text">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

export function DisclosureL2Trigger({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "text-[12px] font-medium text-product-gold underline-offset-2 hover:underline",
        className,
      )}
    >
      {label}
    </button>
  );
}

export function TruncatedEvidence({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  const short =
    value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
  return (
    <div className={clsx("flex flex-col gap-0.5 text-[12px]", className)}>
      <span className="text-product-muted">{label}</span>
      <span className="font-mono text-[11px] text-product-text" title={value}>
        {short}
      </span>
    </div>
  );
}

/** L3 content must not appear in production UI — prototype only. */
export function assertNotL3InProduction(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("L3 system explanations are prototype-only.");
  }
}

"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

/** Product form field — mono uppercase label + hint/error (prototype `.field`). */
export function FormField({ label, hint, error, children, className }: FormFieldProps) {
  return (
    <label className={clsx("grid gap-2", className)}>
      <span className="product-field-label">{label}</span>
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-product-red">{error}</p>
      ) : hint ? (
        <p className="product-field-hint">{hint}</p>
      ) : null}
    </label>
  );
}

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Top divider for stacked sections inside a form surface. */
  divided?: boolean;
}

export function FormSection({
  title,
  description,
  children,
  className,
  divided = false,
}: FormSectionProps) {
  return (
    <section
      className={clsx(
        "space-y-4",
        divided && "border-t border-product-line/40 pt-5",
        className,
      )}
    >
      {title || description ? (
        <header className="space-y-1">
          {title ? (
            <h3 className="font-sans text-sm font-bold tracking-tight text-product-text">{title}</h3>
          ) : null}
          {description ? (
            <p className="text-[12px] leading-relaxed text-product-muted">{description}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

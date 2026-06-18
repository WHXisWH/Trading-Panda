export type StrategySurfaceTheme = "light" | "product";

export function strategyPanelClass(theme: StrategySurfaceTheme, compact = false): string {
  if (theme === "product") {
    return [
      "strategy-feed-card p-4 md:p-5",
      compact ? "overflow-x-hidden" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return [
    "rounded-lg border border-[var(--color-border)] bg-white p-3",
    compact ? "overflow-x-hidden" : "",
  ]
      .filter(Boolean)
      .join(" ");
}

export function strategyLabelClass(theme: StrategySurfaceTheme): string {
  return theme === "product"
    ? "text-[10px] font-medium uppercase tracking-[0.1em] text-product-muted/90"
    : "text-[11px] text-neutral-500";
}

export function strategyHeadingClass(theme: StrategySurfaceTheme): string {
  return theme === "product"
    ? "font-sans text-[15px] font-semibold tracking-[-0.02em] text-product-text"
    : "text-[15px] font-semibold text-neutral-900";
}

export function strategyMutedClass(theme: StrategySurfaceTheme): string {
  return theme === "product" ? "text-product-muted" : "text-neutral-500";
}

export function strategyAccentClass(theme: StrategySurfaceTheme): string {
  return theme === "product" ? "text-product-green" : "text-primary-500";
}

export function strategyInsetClass(theme: StrategySurfaceTheme): string {
  return theme === "product"
    ? "strategy-feed-inset p-2.5"
    : "rounded-lg border border-[var(--color-border)] p-2";
}

export function strategyInvalidInsetClass(theme: StrategySurfaceTheme): string {
  return theme === "product"
    ? "strategy-feed-inset strategy-feed-inset--invalid p-2.5"
    : "rounded-lg border border-red-600 bg-red-50/50 p-2";
}

export function strategyWarningBoxClass(theme: StrategySurfaceTheme): string {
  return theme === "product"
    ? "strategy-feed-tone-warn space-y-1 rounded-[16px] px-3 py-2 text-[11px] text-product-amber"
    : "space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800";
}

export function strategyFieldClass(theme: StrategySurfaceTheme): string {
  return theme === "product" ? "strategy-feed-field" : "";
}

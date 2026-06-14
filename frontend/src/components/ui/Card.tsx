import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "subtle";
}

export function Card({ variant = "default", className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl p-5",
        variant === "default" && "bg-brand-soft border border-neutral-200 shadow-sm",
        variant === "bordered" && "border border-[var(--color-border)] bg-white",
        variant === "subtle" && "bg-neutral-50 border border-neutral-100",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

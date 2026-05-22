import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "ink" | "paper";
}

export function Card({ variant = "default", className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl p-5",
        variant === "default" && "bg-white shadow-sm",
        variant === "bordered" && "border border-[var(--color-border)] bg-white",
        variant === "ink" && "bg-bamboo-50 border border-bamboo-100",
        variant === "paper" && "card-paper",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

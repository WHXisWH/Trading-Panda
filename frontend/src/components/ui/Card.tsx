import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "ink";
}

export function Card({
  variant = "default",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl p-5",
        variant === "default" && "bg-white shadow-sm",
        variant === "bordered" && "border border-ink-100 bg-white",
        variant === "ink" && "border border-bamboo-100 bg-bamboo-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

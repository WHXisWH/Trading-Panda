import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "product";
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-lg",
        variant === "product"
          ? "bg-white/[0.06] ring-1 ring-inset ring-white/[0.04]"
          : "bg-neutral-100",
        className,
      )}
      {...props}
    />
  );
}

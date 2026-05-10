import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("animate-pulse rounded-lg bg-ink-100", className)}
      {...props}
    />
  );
}

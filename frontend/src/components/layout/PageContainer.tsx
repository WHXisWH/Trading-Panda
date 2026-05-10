import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function PageContainer({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("mx-auto max-w-7xl px-6 py-8", className)} {...props}>
      {children}
    </div>
  );
}

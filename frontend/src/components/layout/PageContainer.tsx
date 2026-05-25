import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

type PageContainerVariant = "default" | "mint" | "wide";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: PageContainerVariant;
}

export function PageContainer({
  variant = "default",
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={clsx(
        "mx-auto w-full px-[var(--spacing-lg)] py-[var(--spacing-xl)] md:px-6",
        variant === "default" && "max-w-page",
        variant === "mint" && "max-w-mint",
        variant === "wide" && "max-w-page",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

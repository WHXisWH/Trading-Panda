import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

type PageContainerVariant = "default" | "mint" | "wide" | "dashboard";

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
        "mx-auto w-full",
        variant === "dashboard"
          ? "dashboard-page max-w-none overflow-x-clip px-3 py-4 sm:px-4 lg:px-5"
          : "px-[var(--spacing-lg)] py-[var(--spacing-xl)] md:px-6",
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

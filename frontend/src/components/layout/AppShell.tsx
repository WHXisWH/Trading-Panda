import type { HTMLAttributes } from "react";
import { clsx } from "clsx";

type AppShellVariant = "default" | "mint" | "full";

interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AppShellVariant;
}

/**
 * 根布局内容壳：Navbar 下方主区域，高度扣除 Obsidian 44px 导航栏。
 */
export function AppShell({
  variant = "default",
  className,
  children,
  ...props
}: AppShellProps) {
  return (
    <div
      className={clsx(
        "flex min-h-[calc(100dvh-var(--navbar-height))] flex-col overflow-x-clip",
        variant === "full" && "min-h-0 flex-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

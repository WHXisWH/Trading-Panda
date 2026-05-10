import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string;
}

export function Badge({ color, className, children, ...props }: BadgeProps) {
  return (
    <span
      style={color ? { backgroundColor: color + "22", color } : undefined}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        !color && "bg-bamboo-50 text-bamboo-500",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "subtle" | "product";
}

export function Card({ variant = "product", className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-[20px] p-5",
        variant === "product" && "product-panel",
        variant === "default" && "product-panel",
        variant === "bordered" && "product-panel border-product-line",
        variant === "subtle" && "rounded-[20px] border border-white/10 bg-white/[0.03] p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

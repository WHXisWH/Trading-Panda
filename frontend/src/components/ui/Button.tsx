import { clsx } from "clsx";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bamboo-500 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-bamboo-500 text-white hover:bg-bamboo-900 active:scale-[.98]",
        variant === "outline" &&
          "border border-bamboo-500 text-bamboo-500 hover:bg-bamboo-50 active:scale-[.98]",
        variant === "ghost" &&
          "text-ink-500 hover:bg-ink-100 active:scale-[.98]",
        variant === "danger" &&
          "bg-red-600 text-white hover:bg-red-700 active:scale-[.98]",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-5 py-2.5 text-base",
        size === "lg" && "px-7 py-3.5 text-lg",
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

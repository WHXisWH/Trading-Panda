import { clsx } from "clsx";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger" | "gold";
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
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-mono font-extrabold tracking-tight transition-all duration-fast ease-smooth",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-product-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-product-void",
        "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variant === "primary" &&
          "border border-product-green/70 bg-gradient-to-br from-product-green to-[#bfff87] text-[#071108] shadow-[var(--glow-green)] hover:-translate-y-px",
        variant === "gold" &&
          "border border-product-gold/40 bg-gradient-to-br from-product-gold to-[#fff0a8] text-[#071108] shadow-[var(--glow-gold)] hover:-translate-y-px",
        variant === "outline" &&
          "border border-product-line bg-transparent text-product-text hover:border-product-gold/40 hover:bg-white/[0.04]",
        variant === "ghost" &&
          "border border-white/10 bg-white/[0.045] text-product-muted hover:border-product-line hover:text-product-text",
        variant === "danger" &&
          "border border-product-red/50 bg-product-red/15 text-product-red hover:bg-product-red/25",
        size === "sm" && "px-3 py-1.5 text-[11px]",
        size === "md" && "px-4 py-2.5 text-[12px]",
        size === "lg" && "px-6 py-3 text-[13px]",
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

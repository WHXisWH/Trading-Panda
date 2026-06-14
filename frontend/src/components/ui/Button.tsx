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
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background,box-shadow,transform,filter,border-color,color] duration-fast ease-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-brand text-white shadow-accent hover:shadow-accent-lg hover:brightness-[1.03]",
        variant === "outline" &&
          "border border-primary-500 text-primary-600 hover:bg-primary-50",
        variant === "ghost" &&
          "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700",
        variant === "danger" &&
          "bg-red-600 text-white shadow-sm hover:bg-red-700",
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

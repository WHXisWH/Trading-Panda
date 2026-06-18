import { clsx } from "clsx";
import { forwardRef, type TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  variant?: "light" | "product";
  surface?: "default" | "inset";
};

/** Token-styled textarea — consistent across the app. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = "product", surface = "default", ...props }, ref) => {
    const isProduct = variant === "product" || surface === "inset";

    return (
      <textarea
        ref={ref}
        className={clsx(
          "w-full rounded-[14px] px-3 py-2 text-sm transition-[border-color,box-shadow,background-color] duration-fast ease-smooth",
          "disabled:cursor-not-allowed disabled:opacity-50",
          surface === "inset"
            ? "strategy-feed-field text-product-text placeholder:text-product-muted/70"
            : isProduct
              ? "border border-product-line/80 bg-white/[0.045] text-product-text placeholder:text-product-muted/70 hover:border-product-gold/35 focus:outline-none focus-visible:border-product-green/50 focus-visible:ring-2 focus-visible:ring-product-green/15"
              : "border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 hover:border-neutral-300 focus:outline-none focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-500/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

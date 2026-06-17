import { clsx } from "clsx";
import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: "sm" | "md";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = "md", ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "w-full rounded-xl border border-product-line bg-white/[0.055] text-product-text placeholder:text-product-muted/70",
        "transition-[border-color,box-shadow] duration-fast ease-smooth",
        "hover:border-product-gold/30 focus:outline-none focus-visible:border-product-green/50 focus-visible:ring-2 focus-visible:ring-product-green/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        inputSize === "sm" ? "h-8 px-2.5 text-sm" : "h-10 px-3 text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

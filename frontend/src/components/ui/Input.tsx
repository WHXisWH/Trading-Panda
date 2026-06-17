import { clsx } from "clsx";
import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: "sm" | "md";
  /** Numeric / address fields use mono weight like prototype `.input`. */
  mono?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = "md", mono = false, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={clsx(
        "w-full rounded-[14px] border border-product-line/80 bg-white/[0.045] text-product-text placeholder:text-product-muted/70",
        "transition-[border-color,box-shadow] duration-fast ease-smooth",
        "hover:border-product-gold/35 focus:outline-none focus-visible:border-product-green/50 focus-visible:ring-2 focus-visible:ring-product-green/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        type === "number" &&
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        mono && "font-mono text-[13px] font-semibold tracking-tight",
        inputSize === "sm" ? "h-9 px-2.5 text-sm" : "h-11 px-3.5 text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

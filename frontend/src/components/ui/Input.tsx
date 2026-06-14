import { clsx } from "clsx";
import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: "sm" | "md";
};

/** Token-styled text/number input — consistent across the app. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = "md", ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "w-full rounded-lg border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 transition-[border-color,box-shadow] duration-fast ease-smooth",
        "hover:border-neutral-300 focus:outline-none focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        inputSize === "sm" ? "h-8 px-2.5 text-sm" : "h-10 px-3 text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

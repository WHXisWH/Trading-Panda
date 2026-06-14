import { clsx } from "clsx";
import { forwardRef, type TextareaHTMLAttributes } from "react";

/** Token-styled textarea — consistent across the app. */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={clsx(
      "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 transition-[border-color,box-shadow] duration-fast ease-smooth",
      "hover:border-neutral-300 focus:outline-none focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-500/20",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

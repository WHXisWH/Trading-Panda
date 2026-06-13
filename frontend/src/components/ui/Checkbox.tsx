"use client";

import { clsx } from "clsx";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Token-styled checkbox (accessible native input + custom visual box).
 * Drop-in replacement for raw <input type="checkbox">.
 */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  id,
  className,
}: CheckboxProps) {
  return (
    <label
      className={clsx(
        "inline-flex select-none items-center gap-2 text-sm text-neutral-700",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="flex h-4 w-4 items-center justify-center rounded border border-neutral-300 bg-white transition-colors duration-fast peer-checked:border-primary-500 peer-checked:bg-primary-500 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/30"
        >
          <Check
            className={clsx("h-3 w-3 text-white", !checked && "invisible")}
            strokeWidth={3}
          />
        </span>
      </span>
      {label != null && <span>{label}</span>}
    </label>
  );
}

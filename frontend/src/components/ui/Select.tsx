"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { clsx } from "clsx";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  /** Extra classes for the trigger. */
  className?: string;
  /** Accessible label when there is no visible <label>. */
  "aria-label"?: string;
  name?: string;
}

/**
 * Branded select built on @radix-ui/react-select — a drop-in replacement for
 * native <select>. Accepts an `options` array; styling follows design tokens.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled,
  size = "md",
  className,
  name,
  "aria-label": ariaLabel,
}: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled} name={name}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={clsx(
          "inline-flex w-full items-center justify-between gap-2 rounded-xl border border-product-line bg-white/[0.055] text-product-text transition-[border-color,box-shadow] duration-fast ease-smooth",
          "hover:border-product-gold/30 focus:outline-none focus-visible:border-product-green/50 focus-visible:ring-2 focus-visible:ring-product-green/15",
          "data-[placeholder]:text-product-muted/70 disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8 px-2.5 text-sm" : "h-10 px-3 text-sm",
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className="text-product-muted">
          <ChevronDown className="h-4 w-4" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-[var(--z-toast)] max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-product-line bg-product-panel shadow-[var(--shadow-product)] animate-[fadeIn_120ms_ease-out]"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className={clsx(
                  "relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm text-product-text outline-none transition-colors",
                  "data-[highlighted]:bg-product-green/10 data-[highlighted]:text-product-green",
                  "data-[state=checked]:font-medium data-[state=checked]:text-product-green",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
                )}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2.5 inline-flex items-center">
                  <Check className="h-4 w-4" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

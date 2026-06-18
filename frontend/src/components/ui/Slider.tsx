"use client";

import * as RadixSlider from "@radix-ui/react-slider";
import { clsx } from "clsx";

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  variant?: "light" | "product";
  "aria-label"?: string;
}

/**
 * Single-thumb slider built on @radix-ui/react-slider — a drop-in replacement
 * for native <input type="range">. Emits a plain number.
 */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  variant = "product",
  "aria-label": ariaLabel,
}: SliderProps) {
  const isProduct = variant === "product";

  return (
    <RadixSlider.Root
      className={clsx(
        "relative flex w-full touch-none select-none items-center",
        isProduct ? "h-7" : "h-5",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      value={[value]}
      onValueChange={(v) => onValueChange(v[0])}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <RadixSlider.Track
        className={clsx(
          "relative w-full grow overflow-hidden rounded-full",
          isProduct ? "strategy-feed-slider-track" : "h-1.5 bg-neutral-200",
        )}
      >
        <RadixSlider.Range
          className={clsx(
            "absolute h-full rounded-full",
            isProduct ? "strategy-feed-slider-range" : "bg-brand",
          )}
        />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className={clsx(
          "block rounded-full transition-transform duration-fast ease-smooth hover:scale-110 focus-visible:outline-none active:scale-95",
          isProduct
            ? "strategy-feed-slider-thumb"
            : "h-4 w-4 border-2 border-primary-500 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-primary-500/30",
        )}
        aria-label={ariaLabel}
      />
    </RadixSlider.Root>
  );
}
